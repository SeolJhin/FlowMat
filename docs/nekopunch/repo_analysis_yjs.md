# yjs 분석

## 1. 프로젝트 개요
- 목적: CRDT(Conflict-free Replicated Data Type) 기반의 실시간 공동 편집(shared editing) 프레임워크. `Y.Map`, `Y.Array`, `Y.Text`, `Y.XmlFragment` 등 "공유 타입"을 제공하며, 변경 사항을 다른 피어에 자동으로 전파/병합(충돌 없이)한다. 네트워크 계층과는 무관(network-agnostic)하며, 실제 통신/영속화는 별도 "provider" 패키지가 담당하는 구조.
- 라이선스: MIT (Kevin Jahns 외, RWTH Aachen University Chair of CS5 공동 저작권)
- 기술 스택: JavaScript(ESM), `lib0`(인코딩/디코딩/자료구조 유틸리티) 단일 의존성. TypeScript는 타입 검증용(JSDoc 기반)으로만 사용. 코어 알고리즘은 YATA 논문(2016) 기반의 list CRDT.

> 주의: 분석 대상 로컬 클론(`C:\Users\taiik\...\repo-analysis\yjs`)은 **yjs 코어 저장소(`yjs/yjs`)만** 포함하고 있으며, `y-protocols`(awareness 프로토콜), `y-websocket`(provider 서버 예제), `y-indexeddb`/`y-leveldb`(persistence adapter)는 **이 레포에 존재하지 않는 별도의 GitHub 저장소**다. README에 링크 목록으로만 언급되어 있다. 이 보고서의 "패턴" 설명 중 awareness/provider/persistence 관련 내용은 코어 레포의 README·INTERNALS.md에 기술된 설계 개념과 공개적으로 알려진 생태계 구조를 바탕으로 한 것이며, 실제 소스코드를 열람한 코어 CRDT 엔진(Doc/Transaction/StructStore/Encoding) 부분과는 신뢰 수준이 다르다는 점을 구분해서 읽어야 한다.

## 2. 전체 구조
```
yjs/
├── src/
│   ├── index.js            # 퍼블릭 API 진입점 (Y.Doc, Y.Map, Y.Array, applyUpdate 등 export)
│   ├── ytype.js             # 공유 타입(YType) 베이스 정의
│   ├── structs/             # CRDT 최소 단위 구조체
│   │   ├── AbstractStruct.js
│   │   ├── Item.js           # 리스트 CRDT의 핵심 노드 (origin/originRight, left/right)
│   │   ├── GC.js              # 가비지 컬렉션된 삭제 항목의 경량 placeholder
│   │   └── Skip.js            # 아직 수신하지 못한 구간(gap)을 표시
│   └── utils/                # 문서 상태, 트랜잭션, 인코딩 등 핵심 로직
│       ├── Doc.js             # Y.Doc: 최상위 문서 객체 (clientID, share, store)
│       ├── Transaction.js     # 트랜잭션 처리 및 update 이벤트 발행
│       ├── StructStore.js     # 클라이언트별 struct 배열 저장소 + state vector 계산
│       ├── UpdateEncoder.js / UpdateDecoder.js  # V1/V2 바이너리 인코딩 포맷
│       ├── encoding.js / encoding-helpers.js    # applyUpdate/encodeStateAsUpdate 등 최상위 함수
│       ├── ids.js             # IdSet(삭제셋 등) 구조
│       ├── RelativePosition.js
│       ├── Snapshot.js
│       └── UndoManager.js
├── tests/                   # 각 타입/기능별 유닛 테스트
├── README.md                 # API 문서 + provider/바인딩 생태계 목록 (핵심 정보원)
├── INTERNALS.md               # 내부 알고리즘 설명 (Item, 삭제 처리, 트랜잭션, 네트워크 프로토콜 개요)
└── package.json                # 의존성: lib0 하나뿐. y-protocols는 devDependency(테스트용)로만 언급
```
(y-protocols, y-websocket, y-indexeddb 등은 이 폴더 트리에 존재하지 않음 — 별도 저장소)

## 3. 핵심 패턴

### 3.1 Lamport 타임스탬프 기반 ID + 클라이언트별 구조체 저장 (`StructStore`)
모든 삽입 연산은 `(clientID, clock)` 쌍으로 식별되는 고유 ID를 가진다. `clock`은 클라이언트별로 0부터 증가하는 카운터이며, 삭제는 clock을 증가시키지 않는다(상태 기반으로 별도 처리). `StructStore`는 클라이언트ID를 key로, 그 클라이언트가 만든 struct(삽입 연산)들의 배열을 시간순으로 저장하여 이진 탐색으로 특정 ID를 조회한다.

```js
// src/utils/ID.js
export class ID {
  constructor (client, clock) {
    this.client = client   // 클라이언트 고유 ID (53-bit 랜덤 정수)
    this.clock = clock     // 해당 클라이언트 내에서 연속 증가하는 카운터
  }
}

// src/utils/StructStore.js
export class StructStore {
  constructor () {
    this.clients = new Map()   // Map<clientID, Array<GC|Item|Skip>>
    this.pendingStructs = null // 아직 적용 못한(선행 구조체 누락) 업데이트 버퍼
    this.pendingDs = null
  }
  getClock (client) { /* 해당 client의 다음 예상 clock 반환 */ }
}

// state vector = Map<clientID, 다음 예상 clock> — 두 문서/피어 간 diff 계산의 기준
export const getStateVector = store => { ... }
```
FlowMat 관점: 워크플로우 노드/엣지 각각에 "누가(actor) 몇 번째(seq) 변경했는가"를 식별하는 ID 스킴, 그리고 클라이언트(또는 사용자 세션)별 append-only 로그 구조는 이벤트 소싱/감사로그 설계에 그대로 응용 가능한 아이디어.

### 3.2 트랜잭션 → 바이너리 업데이트 인코딩 (Update 생성 파이프라인)
`Doc.transact(fn)`으로 묶인 모든 변경은 하나의 `Transaction` 객체에 누적된다(`insertSet`, `deleteSet`). 트랜잭션이 끝나면 변경된 struct들만 골라 이진 포맷(V1/V2)으로 직렬화하여 `update` 이벤트로 발행한다. 이 update는 **커뮤테이티브(교환법칙)하고 아이덤포턴트(멱등)** 하므로, 순서 상관없이 여러 번 적용해도 안전하다.

```js
// src/utils/Transaction.js (cleanupTransactions 내부)
if (doc._observers.has('update')) {
  const encoder = new UpdateEncoderV1()
  const hasContent = writeUpdateMessageFromTransaction(encoder, transaction)
  if (hasContent) {
    doc.emit('update', [encoder.toUint8Array(), transaction.origin, doc, transaction])
  }
}

// src/utils/encoding-helpers.js
export const writeUpdateMessageFromTransaction = (encoder, transaction) => {
  if (transaction.deleteSet.clients.size === 0 && transaction.insertSet.clients.size === 0) {
    return false
  }
  writeStructsFromTransaction(encoder, transaction)  // 새로 삽입된 struct들
  writeIdSet(encoder, transaction.deleteSet)          // 삭제된 ID 구간들
  return true
}
```
FlowMat 관점: "diff만 직렬화해서 브로드캐스트"하는 이 패턴은, Spring 쪽에서 워크플로우 변경을 이벤트(작은 바이너리/JSON diff)로 만들어 WebSocket으로 브로드캐스트하고 DB에는 diff 로그로 적재하는 아키텍처의 참고 모델이 된다. (yjs는 diff를 CRDT 연산 단위로 만들지만, FlowMat은 노드/엣지 단위의 도메인 이벤트로 단순화해서 응용 가능.)

### 3.3 State Vector 기반 최소 동기화(diff sync)
클라이언트가 자신의 state vector(각 client의 다음 예상 clock)를 보내면, 상대방은 그 state vector 이후의 struct만 골라 최소한의 update를 계산해서 돌려준다. 전체 문서를 매번 보내지 않고 "내가 이미 아는 부분 이후"만 주고받는 2-step 동기화가 가능하다.

```js
// README.md 예시
const stateVector1 = Y.encodeStateVector(ydoc1)
const stateVector2 = Y.encodeStateVector(ydoc2)
const diff1 = Y.encodeStateAsUpdate(ydoc1, stateVector2)
const diff2 = Y.encodeStateAsUpdate(ydoc2, stateVector1)
Y.applyUpdate(ydoc1, diff2)
Y.applyUpdate(ydoc2, diff1)
```
FlowMat 관점: 워크플로우 캔버스를 처음 열 때 "클라이언트가 마지막으로 본 버전"을 서버에 알려주고, 서버가 그 이후의 변경 로그만 보내주는 재접속/재동기화 로직 설계에 직접 응용 가능한 개념(구현은 CRDT가 아니라 단순 버전 번호/타임스탬프 비교로도 충분).

### 3.4 (참고, 코어 레포 밖) Awareness 프로토콜 — 프레즌스 공유
`y-protocols`의 awareness는 Yjs 코어와 별개로, 문서에 영구 저장되지 않는 "일시적(ephemeral) 상태"(커서 위치, 선택 영역, 사용자명, 색상 등)를 공유하기 위한 프로토콜이다. 공개된 설계 특징(README/생태계 문서 기준, 이 레포에 코드는 없음):
- 각 클라이언트가 자신의 상태를 로컬 `clientID` 키로 갱신하고, 변경 시 델타를 브로드캐스트.
- 하트비트/타임아웃 기반으로 일정 시간 갱신이 없으면 해당 클라이언트의 프레즌스를 자동 제거.
- Yjs의 영속 문서(Y.Doc)와는 분리된 별도 상태이므로 DB에 저장하지 않음 — 순수 in-memory, 연결 종료 시 소멸.

FlowMat 관점: "누가 어떤 노드를 편집 중인지" 표시 기능은 이 개념(별도의 휘발성 프레즌스 채널 + heartbeat/timeout)을 Spring WebSocket 세션 + 인메모리(또는 Redis) 상태로 재구현하면 된다. CRDT 자체가 필요한 부분이 아니다.

## 4. FlowMat 이식 포인트

| 패턴/기능 | 이식 방식 | 우선순위(상/중/하) | 비고 |
|---|---|---|---|
| ID = (actorId, seq/clock) 조합 | 워크플로우 변경 이벤트에 (userId 또는 sessionId, 순번) 식별자 부여 → 이벤트 순서 보장·중복 적용 방지에 활용 | 상 | JPA 엔티티/이벤트 로그 테이블 설계에 바로 반영 가능 |
| 트랜잭션 → 최소 diff 직렬화 후 브로드캐스트 | 노드/엣지 변경을 하나의 논리적 트랜잭션으로 묶어 JSON(또는 protobuf) diff로 만들고 Spring WebSocket(STOMP)으로 다른 세션에 브로드캐스트 | 상 | @xyflow/react의 로컬 변경을 배치로 모아 전송하는 클라이언트 측 패턴도 함께 참고 |
| State vector 기반 재동기화 | 클라이언트가 마지막 known 버전(타임스탬프/버전번호)을 서버에 전달 → 서버가 그 이후 변경 로그만 반환 | 중 | CRDT의 state vector 개념을 "버전 번호 비교"로 단순화해서 구현 |
| Update를 바이너리 blob으로 영속화 (persistence adapter 패턴) | CRDT 자체를 안 쓰더라도, "각 변경을 append-only 이벤트/blob으로 DB에 쌓고 필요시 스냅샷 압축" 구조는 참고 가능. Spring Boot에서는 변경 이벤트 테이블(workflow_change_log) + 주기적 스냅샷(workflow_snapshot)으로 구현 | 중 | 실제 y-leveldb/y-indexeddb 소스는 이 레포에 없어 세부 스키마는 확인 불가 — 개념만 차용 |
| Awareness(프레즌스) 프로토콜 | 별도의 휘발성 WebSocket 채널로 "현재 편집 중인 노드 ID, 커서 좌표, 색상"을 브로드캐스트, heartbeat로 stale 상태 정리 | 중 | Spring WebSocket 세션 attribute + 인메모리 Map(또는 다중 인스턴스 시 Redis pub/sub)으로 구현 |
| GC/Skip 같은 경량 placeholder 구조 | 삭제된 항목을 완전히 지우지 않고 가벼운 tombstone으로 남기는 기법 | 하 | 노드/엣지 삭제 이력 추적(undo, 감사)이 필요할 때만 고려 |
| 실제 CRDT(Y.Map/Y.Array) 도입 | 도입하지 않음 | 하 | 아래 5절 참고 |

## 5. 직접 통합 vs 패턴 참고

### 직접 통합 가능
없음 — yjs는 순수 JS/TS 라이브러리이며 Java/Spring Boot 생태계에 공식 포트가 존재하지 않는다. `import * as Y from 'yjs'`를 백엔드(JVM)에서 그대로 사용할 방법이 없다.
- 대안으로, CRDT 알고리즘을 백엔드에서 직접 실행해야 하는 경우 Rust 구현체 [yrs](https://github.com/y-crdt/y-crdt/tree/main/yrs)에 대한 JNI/FFI 바인딩([ydotnet](https://github.com/y-crdt/ydotnet)류와 유사하게 Kotlin용 [ykt](https://github.com/y-crdt/ykt) 바인딩이 존재)을 검토할 수 있으나, 빌드 복잡도와 유지보수 부담이 크므로 FlowMat처럼 노드 단위 낙관적 잠금/이벤트 브로드캐스트로도 요구사항을 충족할 수 있다면 우선순위는 낮다. 깊은 조사는 별도 스파이크로 분리 권장.

### 패턴만 참고 (재구현 필요)
- **CRDT 업데이트 저장 구조 → 이벤트 로그 테이블**: yjs의 "트랜잭션당 하나의 바이너리 update"를 그대로 흉내내기보다, `workflow_id, actor_id, seq, change_type, payload(JSON), created_at` 형태의 append-only 로그 테이블로 재구현. 주기적으로 최신 스냅샷(캔버스 전체 JSON)을 별도 테이블/컬럼에 압축 저장해 재생 비용을 줄인다(yjs의 GC/merge 개념과 유사한 목적).
- **Awareness/프레즌스 프로토콜 → Spring WebSocket 세션 관리**: 영구 저장하지 않는 "현재 편집 중" 상태를 위한 별도 토픽(`/topic/workflow/{id}/presence`)을 두고, 클라이언트가 주기적으로 heartbeat 메시지(커서 좌표, 편집 중인 노드 ID)를 전송, 서버는 마지막 heartbeat 시각을 기준으로 일정 시간 초과 시 해당 사용자의 프레즌스를 제거. 다중 인스턴스 배포 시 Redis pub/sub으로 확장.
- **State vector 기반 최소 동기화 → 버전 기반 재동기화 API**: 클라이언트가 재접속 시 자신이 마지막으로 알고 있던 워크플로우 버전(또는 마지막 이벤트 seq)을 서버에 전달하고, 서버는 REST 또는 WebSocket으로 그 이후의 변경 로그만 반환하는 엔드포인트를 설계. 이를 통해 매 재접속마다 전체 캔버스를 다시 보내지 않아도 됨.
- **Provider(y-websocket) 구조 → Spring WebSocket 핸들러**: y-websocket의 "브라우저 클라이언트 ↔ 단순 WS 서버 ↔ 룸(document) 단위 브로드캐스트" 구조 자체는 이 레포에 코드가 없어 직접 확인하지 못했지만, README에 기술된 역할 분담(연결 관리, 룸별 브로드캐스트, 선택적 영속화 계층 분리)은 Spring `@ServerEndpoint`/STOMP 기반 워크플로우 룸(세션 그룹) 설계에 참고할 수 있는 일반적인 아키텍처 패턴이다.
