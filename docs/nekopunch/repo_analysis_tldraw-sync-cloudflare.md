# tldraw-sync-cloudflare 분석

## 1. 프로젝트 개요
- 목적: tldraw 캔버스(화이트보드)의 실시간 멀티플레이어 동기화를 위한 프로덕션급 백엔드 템플릿. Cloudflare Workers + Durable Objects 위에서 WebSocket 기반 룸(room) 동기화, 정적 에셋(R2) 업로드/다운로드, URL 북마크 언펄링(unfurl)을 제공한다.
- 라이선스: MIT (서버 템플릿 코드 자체). 단, tldraw SDK 본체는 별도의 tldraw 라이선스(상업적 사용 시 조건 있음)를 따른다.
- 기술 스택:
  - 서버: Cloudflare Workers, Durable Objects(SQLite 내장 스토리지), R2(오브젝트 스토리지), itty-router
  - 동기화 엔진: `@tldraw/sync`, `@tldraw/sync-core` (`TLSocketRoom`, `SQLiteSyncStorage`), `@tldraw/tlschema`
  - 클라이언트: React 19, `tldraw` SDK, `useSync` 훅(react-router-dom으로 룸 라우팅)

## 2. 전체 구조
```
tldraw-sync-cloudflare/
├── client/
│   ├── pages/                     # Room.tsx(캔버스+useSync), Root.tsx(랜딩)
│   ├── getBookmarkPreview.tsx     # URL 북마크 메타데이터 fetch
│   ├── multiplayerAssetStore.tsx  # 이미지/비디오 업로드-다운로드 클라 로직
│   ├── localStorage.ts
│   ├── main.tsx / index.css / vite-env.d.ts
├── worker/
│   ├── worker.ts                  # 진입점, 라우팅(connect/uploads/unfurl)
│   ├── TldrawDurableObject.ts     # 룸 상태 관리 Durable Object (핵심)
│   ├── assetUploads.ts            # R2 업로드/다운로드 + 캐싱
│   └── bookmarkUnfurling.ts       # (worker.ts에서 import, README에 언급)
├── wrangler.toml                  # DO/R2 바인딩, SQLite 마이그레이션 설정
├── worker-configuration.d.ts       # Env 타입 (wrangler 생성)
├── package.json / tsconfig.json / vite.config.ts
├── arch.png                        # 아키텍처 다이어그램
└── README.md
```

## 3. 핵심 패턴

### 패턴 1 — 룸(Room) 단위 상태 소유자: Durable Object ≒ 세션 스코프 서버 인스턴스
Cloudflare Durable Object는 "룸 ID당 정확히 하나의 인스턴스"를 보장한다. 모든 클라이언트는 같은 룸이면 같은 DO 인스턴스로 라우팅되므로, 동시성 충돌(같은 문서를 두 서버가 동시에 처리하는 상황)이 원천적으로 없다.

```ts
// worker/worker.ts
.get('/api/connect/:roomId', (request, env) => {
  const id = env.TLDRAW_DURABLE_OBJECT.idFromName(request.params.roomId)
  const room = env.TLDRAW_DURABLE_OBJECT.get(id)   // roomId -> 항상 동일 인스턴스
  return room.fetch(request.url, { headers: request.headers, body: request.body })
})
```
이는 Spring Boot에는 "룸별 단일 스레드/락 소유 세션 매니저" 개념으로 대응된다. Durable Object 자체는 이식 불가(Cloudflare 전용)지만, "workflowId당 하나의 in-memory 세션 오브젝트가 모든 브로드캐스트를 관장한다"는 설계는 재구현 가능하다.

### 패턴 2 — WebSocket 세션 관리 + 하이버네이션 재개(Resume) 프로토콜
`TldrawDurableObject`는 WebSocket 연결마다 `sessionId`를 attachment로 저장해두고, 서버가 재시작/하이버네이션에서 깨어나도 `ctx.getWebSockets()`로 살아있는 소켓들을 찾아 세션을 복구한다. 연결이 끊길 때는 마지막 스냅샷을 이용해 잠깐 세션을 복구시킨 뒤 "정상적으로 나감"을 다른 클라이언트에게 브로드캐스트한다.

```ts
override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
  const sessionId = this.getSessionId(ws)
  if (!sessionId) return
  this.sessionIdToWs.set(sessionId, ws)
  this.getOrCreateRoom().handleSocketMessage(sessionId, message)
}

private handleWebSocketEnd(ws: WebSocket, method: 'handleSocketClose' | 'handleSocketError') {
  const attachment = ws.deserializeAttachment() as SocketAttachment | null
  if (!attachment?.sessionId) return
  // 하이버네이션 중 끊긴 세션은 스냅샷으로 잠깐 복구 후, 나머지 클라이언트에 이탈을 알림
  if (attachment.snapshot && !room.getSessionSnapshot(attachment.sessionId)) {
    room.handleSocketResume({ sessionId: attachment.sessionId, socket: ws, snapshot: attachment.snapshot })
  }
  room[method](attachment.sessionId)
}
```
서버 측 "누가 접속해 있는가, 마지막 상태가 무엇인가"를 세션ID 기준으로 추적하는 구조는 Spring WebSocket/STOMP에서도 그대로 필요한 개념이다(SimpMessagingTemplate + 세션 레지스트리).

### 패턴 3 — Room 상태 영속화: 인메모리 룸 + 자동 스냅샷 저장(SQLite)
`TLSocketRoom`은 문서 변경을 인메모리로 관리하면서, `onSessionSnapshot` 콜백과 `SQLiteSyncStorage`를 통해 변경을 durable object 내장 SQLite에 자동/디바운스 저장한다. 클라이언트가 하나도 없어지면 DO가 종료되고, 다음 접속 시 저장된 스냅샷에서 룸을 복원한다.

```ts
const sql = new DurableObjectSqliteSyncWrapper(this.ctx.storage)
const storage = new SQLiteSyncStorage<TLRecord>({ sql })
this.room = new TLSocketRoom<TLRecord, void>({
  schema, storage, clientTimeout: Infinity,
  onSessionSnapshot: (sessionId, snapshot) => {
    const ws = this.sessionIdToWs.get(sessionId)
    if (ws) ws.serializeAttachment({ sessionId, snapshot })
  },
})
```
개념적으로 "메모리 상의 최신 상태 + 주기적/이벤트 기반 DB 스냅샷 저장 + 재기동 시 최신 스냅샷 로드"는 FlowMat의 워크플로우 상태를 JPA/DB로 영속화하는 것과 정확히 대응되는 패턴이다. tldraw는 record 단위(CRDT 유사) diff를 push down 하지만, FlowMat은 워크플로우 그래프 스냅샷(nodes/edges JSON) 또는 개별 이벤트 로그로 단순화해 저장할 수 있다.

### 패턴 4 — 클라이언트-서버 프로토콜은 "URI 하나로 접속 + 라이브러리가 프로토콜 처리"로 추상화됨
클라이언트는 `useSync({ uri, assets })` 훅 하나로 WebSocket 연결, 재연결, presence(커서), op 전송/수신을 모두 위임한다. 서버는 `handleSocketConnect/handleSocketMessage/handleSocketClose`만 구현하면 되고, 실제 op/patch 포맷과 버전 관리는 `@tldraw/sync-core` 라이브러리 내부에 캡슐화되어 있어 이 레포에서는 프로토콜 세부 포맷을 직접 볼 수 없다(라이브러리 블랙박스).

```tsx
// client/pages/Room.tsx
const store = useSync({
  uri: `${window.location.origin}/api/connect/${roomId}`,
  assets: multiplayerAssetStore,
})
```
이 계층 분리(전송/프로토콜 계층 vs 룸 오케스트레이션 계층)는 그대로 참고할 가치가 있다: FlowMat 프론트도 "WorkflowCanvas는 useWorkflowSync 같은 훅 하나로 연결하고, STOMP/op 포맷 세부사항은 훅 내부에 캡슐화" 하는 방향으로 설계할 수 있다.

## 4. FlowMat 이식 포인트

| 패턴/기능 | 이식 방식 | 우선순위(상/중/하) | 비고 |
|---|---|---|---|
| 룸(workflowId) 단위 단일 상태 소유자 | Spring `@Component` 스코프의 `WorkflowSessionManager`(workflowId -> 세션 목록 + in-memory 상태)를 Bean으로 두거나, STOMP `/topic/workflow/{id}` 구독 모델로 대체 | 상 | Durable Object의 "1 room = 1 instance" 보장은 멀티 인스턴스 배포 시 Redis pub/sub 또는 sticky session으로 재현 필요 |
| 세션ID 기반 연결 추적 + graceful leave 브로드캐스트 | `SessionSubscribeEvent`/`SessionDisconnectEvent` 리스너에서 세션ID-사용자 매핑 관리, 연결 종료 시 "누가 나갔는지" 브로드캐스트 | 상 | 커서/presence 표시가 향후 요구사항이면 이 매핑이 필수 |
| 인메모리 상태 + 디바운스 DB 스냅샷 저장 | 워크플로우 편집 이벤트를 인메모리 버퍼에 쌓고, 일정 시간/이벤트 수마다 JPA로 workflow 스냅샷(JSON) 또는 변경 로그 저장 | 상 | 매 변경마다 DB write 하지 않고 디바운스하는 방식은 부하 감소에 직결 |
| 클라이언트 훅 캡슐화(useSync 스타일) | 프론트에 `useWorkflowSync(workflowId)` 훅을 만들어 STOMP 연결/재연결/구독 해제를 캡슐화, React Flow의 nodes/edges 상태와 연결 | 중 | 현재 zustand+react-query 구조에 자연스럽게 결합 가능 |
| 에셋(R2) 업로드/다운로드 + 캐시 헤더 패턴 | 워크플로우에 첨부파일/이미지 노드가 생기면 별도 REST 업로드 엔드포인트 + 정적 파일 스토리지(S3/MinIO) + 캐시 헤더 적용 | 하 | 현재 FlowMat 요구사항엔 명시 안 됨, 향후 필요시 참고 |
| WebSocket ping/pong 하이버네이션 최적화 | 해당 없음(서버리스 하이버네이션 특화 최적화) | 하 | Spring Boot는 상시 구동 서버이므로 이 최적화 자체는 불필요, heartbeat만 STOMP 기본 기능으로 충분 |

## 5. 직접 통합 vs 패턴 참고

### 직접 통합 가능
- 없음 - Cloudflare Workers/Durable Objects 전용 런타임(`cloudflare:workers` 임포트, `DurableObject` 베이스 클래스, WebSocket Hibernation API, R2 바인딩, wrangler 설정)에 강하게 결합되어 있어 Spring Boot 프로젝트에 코드 자체를 가져다 쓸 수 없다. `@tldraw/sync-core` 라이브러리(`TLSocketRoom`, `SQLiteSyncStorage`)도 tldraw 전용 레코드 스키마에 묶여 있어 범용 워크플로우 그래프에는 그대로 쓸 수 없다.

### 패턴만 참고 (재구현 필요)
- **룸 단위 상태 소유자**: Durable Object의 "roomId → 단일 인스턴스" 보장을 Spring Boot에서는 (a) 단일 인스턴스 배포 시 in-memory `ConcurrentHashMap<workflowId, WorkflowRoomState>`로, (b) 멀티 인스턴스 배포 시 Redis 기반 STOMP 브로커(RabbitMQ/Redis pub-sub relay) 또는 sticky routing으로 재구현.
- **세션 추적 + 재연결 처리**: `webSocketMessage/webSocketClose/webSocketError` 핸들러 구조를 Spring `@EventListener(SessionConnectEvent/SessionDisconnectEvent)` + 커스텀 `WorkflowSessionRegistry`(sessionId ↔ userId ↔ workflowId 매핑)로 재구현.
- **스냅샷 기반 영속화**: `onSessionSnapshot` 디바운스 저장 로직을 Spring `@Scheduled` 또는 이벤트 카운터 기반 배치로 재구현하고, JPA 엔티티(WorkflowSnapshot: workflowId, version, payload(JSON), updatedAt)에 저장. tldraw의 record-level diff 대신, FlowMat은 "노드/엣지 전체 스냅샷" 또는 "add/update/delete 노드 이벤트 로그" 중 택일해 설계 필요.
- **op/patch 전송 프로토콜 및 버전 관리**: `@tldraw/sync-core`가 캡슐화한 부분이라 이 레포만으로는 세부 포맷을 알 수 없음. STOMP 메시지 바디에 `{type, workflowId, version, payload}` 형태의 자체 프로토콜을 설계하고, 낙관적 버전 충돌(version mismatch) 처리를 서버에서 구현해야 함.
- **클라이언트 훅 추상화**: `useSync` 패턴을 참고해 FlowMat 프론트에 연결/재연결/구독해제를 감싸는 커스텀 훅을 만들고, React Flow의 nodes/edges 스토어(zustand)와 연동.
```
