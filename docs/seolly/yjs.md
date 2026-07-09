# Yjs — 전수조사 보고서 및 FlowMat 이식 가이드

> 조사 기준: `E:\projects\git\yjs` 로컬 클론 직접 분석

## 1. 레포 전체 구조

```
yjs/
├── src/
│   ├── index.js                  - 전체 공개 API exports
│   ├── ytype.js                  - Y.Type 기본 클래스 (Y.Map, Y.Array, Y.Text의 부모)
│   ├── structs/
│   │   ├── Item.js               - CRDT 핵심 자료구조 (연결 리스트의 노드)
│   │   ├── AbstractStruct.js     - 모든 struct 기본 클래스
│   │   ├── GC.js                 - Garbage Collection 항목
│   │   └── Skip.js               - 스킵 항목
│   └── utils/
│       ├── Doc.js                - Y.Doc 구현
│       ├── Transaction.js        - 트랜잭션 배치 처리
│       ├── encoding.js           - 이진 인코딩/디코딩
│       ├── UpdateEncoder.js      - V1, V2 인코더
│       ├── UpdateDecoder.js      - V1, V2 디코더
│       ├── YEvent.js             - 변경 이벤트 객체
│       ├── EventHandler.js       - 이벤트 관리
│       ├── UndoManager.js        - Undo/Redo 관리
│       ├── Snapshot.js           - 시점 스냅샷
│       ├── RelativePosition.js   - 상대 위치 (커서 등)
│       ├── StructStore.js        - 구조 저장소
│       └── ID.js                 - ID 객체 (clientID, clock)
├── tests/
│   ├── y-map.tests.js            - Y.Map 사용 패턴
│   ├── y-array.tests.js          - Y.Array 사용 패턴
│   ├── y-text.tests.js           - Y.Text 사용 패턴
│   ├── doc.tests.js              - Transaction 패턴
│   ├── undo-redo.tests.js        - UndoManager 패턴
│   └── snapshot.tests.js         - Snapshot 패턴
├── INTERNALS.md                  - CRDT 알고리즘 상세 설명
├── THREAT_MODEL.md               - 보안 모델
└── README.md
```

**핵심 특징:**
- **네트워크 무관** — 코어에 네트워크 코드 없음, Provider가 담당
- **Awareness는 별도** — `@y/protocols` 패키지 (y-websocket 등 Provider에 내장)
- **이진 프로토콜** — V1/V2 인코딩, 매우 효율적
- **CRDT 알고리즘** — YATA (Yet Another Transformation Approach)

---

## 2. Y.Doc — 핵심 문서 객체

**파일**: `src/utils/Doc.js`

```js
// 생성
const ydoc = new Y.Doc({
  guid: 'workflow-uuid-123',  // 전역 유니크 ID
  gc: true,                   // 가비지 컬렉션 활성화
  meta: { type: 'flowmat' },  // 문서 메타데이터
  autoLoad: false,            // 서브문서 자동 로드
})

// 공유 타입 접근 (없으면 자동 생성)
const ymap = ydoc.getMap('nodes')
const yarr = ydoc.getArray('edges')
const ytext = ydoc.getText('description')

// 이벤트
ydoc.on('update', (update: Uint8Array, origin) => {
  // 증분 업데이트 (V1)
  if (origin !== remoteProvider) broadcastUpdate(update)
})

ydoc.on('updateV2', (update: Uint8Array, origin) => {
  // 증분 업데이트 (V2, 더 효율적)
})

ydoc.on('sync', (isSynced: boolean) => {
  // 동기화 상태 변경
})

ydoc.on('afterTransaction', (tr: Transaction) => {
  // 트랜잭션 완료 후
})

// 상태 인코딩 (동기화용)
const fullState = Y.encodeStateAsUpdate(ydoc)    // Uint8Array
const stateVec = Y.encodeStateVector(ydoc)       // Uint8Array
Y.applyUpdate(ydoc, update)                      // 업데이트 적용
```

**FlowMat 적용:**

```ts
// collaboration/ydoc.ts
export const ydoc = new Y.Doc({
  guid: `workflow-${workflowId}`,
})

// 워크플로우 캔버스 상태
export const yNodes = ydoc.getMap<NodeState>('nodes')
export const yEdges = ydoc.getArray<EdgeState>('edges')
```

---

## 3. Y.Map — Key-Value 공유 상태

**파일**: `src/ytype.js`, `tests/y-map.tests.js`

공개 API (실제 사용 시):
```js
const ymap = ydoc.getMap('nodes')

// 쓰기/읽기/삭제
ymap.set('node-1', { x: 100, y: 200, name: '혼합 공정' })
ymap.get('node-1')   // { x: 100, y: 200, name: '혼합 공정' }
ymap.delete('node-1')
ymap.has('node-1')   // boolean
ymap.size            // Map 크기

// 순회
for (const [key, value] of ymap) { }
ymap.forEach((value, key) => { })
ymap.keys()    // IterableIterator<string>
ymap.values()  // IterableIterator<value>
ymap.entries() // IterableIterator<[string, value]>

// JSON 변환
ymap.toJSON()  // 일반 객체로 변환

// 이벤트 구독
ymap.observe((event: Y.YMapEvent<NodeState>) => {
  event.keysChanged  // Set<string> — 변경된 키 목록
  event.changes.keys // Map<string, { action: 'add'|'update'|'delete', oldValue }>
  event.transaction  // 트랜잭션 정보
})

ymap.observeDeep((events: Y.YEvent<any>[]) => {
  // 중첩된 값의 변경까지 감지
})

// 해제
ymap.unobserve(fn)
ymap.unobserveDeep(fn)
```

**FlowMat 적용 — 노드 상태 동기화:**

```ts
// 노드 이동 시
function handleNodeDragEnd(processId: string, x: number, y: number) {
  ydoc.transact(() => {
    const current = yNodes.get(processId) ?? {}
    yNodes.set(processId, { ...current, posX: x, posY: y })
  })
  // 서버 REST API 저장도 병행
  saveNodePosition(processId, x, y)
}

// 원격 변경 감지 → React Flow 상태 반영
yNodes.observe((event) => {
  for (const [key, change] of event.changes.keys) {
    if (change.action === 'delete') {
      setNodes(nodes => nodes.filter(n => n.id !== key))
    } else {
      const nodeState = yNodes.get(key)
      setNodes(nodes => nodes.map(n =>
        n.id === key ? { ...n, position: { x: nodeState.posX, y: nodeState.posY } } : n
      ))
    }
  }
})
```

---

## 4. Y.Array — 배열 공유 상태

**파일**: `tests/y-array.tests.js`

```js
const yarr = ydoc.getArray('edges')

// 삽입/삭제
yarr.push([item1, item2])          // 끝에 추가
yarr.insert(0, [item1, item2])     // 위치에 삽입
yarr.delete(0, 1)                  // 위치부터 N개 삭제

// 접근
yarr.get(index)                    // 인덱스 접근
yarr.length                        // 길이
yarr.slice(0, 10)                  // 부분 추출
yarr.toArray()                     // JS 배열로 변환
yarr.toJSON()                      // JSON 변환

// 순회
for (const item of yarr) { }

// 이벤트
yarr.observe((event: Y.YArrayEvent<EdgeState>) => {
  event.delta   // 변경사항 (insert/delete/retain)
  // delta 예시: [{ retain: 2 }, { insert: [newEdge] }, { delete: 1 }]
})
```

**FlowMat에서 Y.Array vs Y.Map 선택:**

엣지(Connection)는 **Y.Array** 보다 **Y.Map**이 낫다:
- 특정 ID로 빠르게 조회/수정해야 하므로
- `yEdges.set(connectionId, edgeData)` 패턴 권장

```ts
const yEdges = ydoc.getMap<EdgeState>('edges')  // Array 아닌 Map 사용
```

---

## 5. Y.Text — 텍스트 공유

**파일**: `tests/y-text.tests.js`

```js
const ytext = ydoc.getText('nodeName')

// 삽입/삭제
ytext.insert(0, 'Hello World')
ytext.delete(6, 5)  // 인덱스 6부터 5글자 삭제

// Rich Text 포맷팅
ytext.format(0, 5, { bold: true, color: '#3b82f6' })
ytext.format(0, 5, { bold: null })  // 포맷 제거

// Delta 변환 (Quill, ProseMirror 호환)
ytext.toDelta()          // [{ insert: 'Hello', attributes: { bold: true } }]
ytext.applyDelta(delta)  // Delta 적용

// 이벤트
ytext.observe((event) => {
  event.delta  // 변경된 delta
})

ytext.toString()  // 순수 텍스트
```

**FlowMat 적용:**

노드 이름 편집에 Y.Text를 쓰면 두 사람이 동시에 이름을 편집해도 자동 병합된다.  
단순 이름 정도라면 Y.Map에 string 속성으로 충분하다.  
`project_comment`의 내용처럼 긴 텍스트 편집에 Y.Text가 유효하다.

---

## 6. Awareness — 커서/사용자 상태 공유

**패키지**: `@y/protocols` (yjs 코어 외부, y-websocket 등 Provider에 내장)  
**파일**: `y-websocket` Provider의 `awareness.js`

```ts
import { WebsocketProvider } from 'y-websocket'

const provider = new WebsocketProvider(
  'ws://flowmat-server:1234',
  `workflow-${workflowId}`,
  ydoc
)

const awareness = provider.awareness

// 내 상태 설정 (로컬 → 자동 브로드캐스트)
awareness.setLocalState({
  user: {
    id: currentUser.id,
    name: currentUser.name,
    color: '#3b82f6',   // 사용자별 고유 색상
  },
  cursor: { x: mouseX, y: mouseY },        // 캔버스 위 마우스 위치
  viewport: { x: scrollX, y: scrollY, zoom },  // 뷰포트 상태
  selection: {
    nodeIds: [selectedProcessId],
    edgeIds: [selectedConnectionId],
  },
})

// 다른 사용자 상태 구독
awareness.on('change', ({ added, updated, removed }) => {
  const allStates = Array.from(awareness.getStates().entries())
  // [clientID, state] 쌍의 배열
  renderRemoteCursors(allStates)
})

// 내 상태 초기화 (로그아웃 등)
awareness.setLocalState(null)

// 참여자 수
awareness.getStates().size
```

**FlowMat 적용 — 커서 렌더링:**

```tsx
// CursorOverlay.tsx
function CursorOverlay() {
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([])

  useEffect(() => {
    const handler = () => {
      const cursors = Array.from(awareness.getStates().entries())
        .filter(([id]) => id !== awareness.clientID)
        .map(([id, state]) => ({
          clientId: id,
          ...state.user,
          cursor: state.cursor,
          selection: state.selection,
        }))
      setRemoteCursors(cursors)
    }

    awareness.on('change', handler)
    return () => awareness.off('change', handler)
  }, [])

  return (
    <>
      {remoteCursors.map(cursor => (
        <RemoteCursorDot key={cursor.clientId} cursor={cursor} />
      ))}
    </>
  )
}
```

**구현 복잡도**: 낮음 — y-websocket Provider 연결 후 awareness API만 쓰면 됨

---

## 7. UndoManager — 협업 Undo/Redo

**파일**: `src/utils/UndoManager.js`, `tests/undo-redo.tests.js`

```js
const undoManager = new Y.UndoManager(
  [yNodes, yEdges],  // 추적할 타입 배열
  {
    captureTimeout: 500,  // 500ms 내 변경은 하나의 undo 단위로 묶음
    // 로컬 변경만 추적 (null origin = 기본값 = 로컬)
    trackedOrigins: new Set([null]),
    // 삭제 필터 (false 반환하면 GC 건너뜀, 히스토리 유지)
    deleteFilter: (item) => true,
  }
)

// Undo / Redo
undoManager.undo()   // 반환: boolean (성공 여부)
undoManager.redo()

// 스택 상태
undoManager.undoStack.length  // undo 가능 횟수
undoManager.redoStack.length  // redo 가능 횟수
undoManager.canUndo()
undoManager.canRedo()

// 이벤트 — 선택 상태 함께 저장
undoManager.on('stack-item-added', (event) => {
  const { stackItem, type } = event  // type: 'undo' | 'redo'
  // 현재 선택 상태를 메타에 저장
  stackItem.meta.set('selectedNodeIds', [...selectedNodeIds])
})

undoManager.on('stack-item-popped', (event) => {
  // undo/redo 실행 후 선택 상태 복원
  const savedSelection = event.stackItem.meta.get('selectedNodeIds')
  if (savedSelection) restoreSelection(savedSelection)
})

// 일시 정지 (원격 변경 적용 중에는 추적 안 함)
undoManager.stopCapturing()
```

**FlowMat 현황 vs Yjs UndoManager:**

| 항목 | 현재 FlowMat (`commandHistory.ts`) | Yjs UndoManager |
|---|---|---|
| 방식 | 커스텀 Command 패턴 | CRDT delta 기반 |
| 협업 시 | 원격 변경도 undo 가능 (위험) | 로컬 변경만 추적 |
| 선택 복원 | 수동 구현 | meta 로 저장/복원 |
| 복잡도 | 자체 유지 필요 | 라이브러리 제공 |

협업 도입 시 `commandHistory.ts`를 UndoManager로 교체하는 것이 권장된다.

---

## 8. Transaction — 배치 처리

**파일**: `src/utils/Transaction.js`

```js
// 여러 변경을 원자적으로 묶음 → 하나의 update 이벤트
ydoc.transact(() => {
  yNodes.set('node-1', { ...node1, posX: 100 })
  yNodes.set('node-2', { ...node2, posX: 200 })
  yEdges.set('edge-1', { ...edge1, label: '새 레이블' })
}, origin)  // origin: 변경 출처 (null=로컬, provider=원격)

// 트랜잭션 정보 접근
ydoc.on('afterTransaction', (tr: Y.Transaction) => {
  tr.local                  // 로컬 변경인지
  tr.origin                 // 변경 출처
  tr.changed                // 변경된 타입 Set
  tr.changedParentTypes     // 깊은 변경
  tr.deleteSet              // 삭제된 항목
  tr.meta                   // 커스텀 메타데이터
})
```

**FlowMat 적용:**

```ts
// 다중 노드 동시 이동 (예: 그룹 이동)
function handleMultiNodeDragEnd(moves: { id: string, x: number, y: number }[]) {
  ydoc.transact(() => {
    moves.forEach(({ id, x, y }) => {
      const current = yNodes.get(id)
      if (current) yNodes.set(id, { ...current, posX: x, posY: y })
    })
  })
  // 하나의 WebSocket 메시지로 전송됨
}
```

---

## 9. Encoding — 이진 프로토콜

**파일**: `src/utils/encoding.js`, `src/utils/UpdateEncoder.js`

```js
// V1 인코딩 (기본)
const update = Y.encodeStateAsUpdate(ydoc)           // Uint8Array
const stateVec = Y.encodeStateVector(ydoc)           // Uint8Array

// V2 인코딩 (더 효율적)
const updateV2 = Y.encodeStateAsUpdateV2(ydoc)

// 적용
Y.applyUpdate(ydoc, update)
Y.applyUpdateV2(ydoc, updateV2)

// 두 업데이트 병합 (서버에서 유용)
const merged = Y.mergeUpdates([update1, update2, update3])
const mergedV2 = Y.mergeUpdatesV2([update1, update2])

// 디버깅
Y.logUpdate(update)       // 콘솔 출력
Y.decodeUpdate(update)    // 파싱된 구조체 반환
Y.diffUpdate(update, stateVec)  // stateVec 이후 변경분만 추출

// 두 상태 벡터 간 diff
const missingUpdates = Y.encodeStateAsUpdate(ydoc, remoteStateVec)
```

**FlowMat WebSocket 통신:**

```ts
// 송신: 변경 발생 시
ydoc.on('updateV2', (update: Uint8Array, origin) => {
  if (origin !== wsProvider) {  // 원격에서 온 게 아니면
    socket.send(update)         // 바이너리로 전송
  }
})

// 수신: 원격 업데이트 적용
socket.onmessage = (event) => {
  const update = new Uint8Array(event.data)
  Y.applyUpdateV2(ydoc, update, wsProvider)  // origin=wsProvider로 표시
}

// 초기 동기화: 서버에서 전체 상태 받기
socket.onopen = () => {
  const stateVec = Y.encodeStateVector(ydoc)
  socket.send(JSON.stringify({ type: 'sync-request', sv: Array.from(stateVec) }))
}
```

---

## 10. Provider 인터페이스

Yjs 코어는 네트워크 코드가 없다. Provider들이 `ydoc.on('updateV2', ...)` 이벤트를 받아 전송하고, 받은 데이터를 `Y.applyUpdateV2(ydoc, ...)` 로 적용한다.

### 사용 가능한 Provider들

| Provider | 설명 | FlowMat 적합도 |
|---|---|---|
| `y-websocket` | WebSocket 서버 연동 | ★★★ (Spring Boot와 연동 가능) |
| `y-webrtc` | P2P 브라우저 직접 연결 | ★☆☆ |
| `y-indexeddb` | 브라우저 로컬 영속성 | ★★☆ (오프라인 지원) |
| `@liveblocks/yjs` | 관리형 서비스 | ★★☆ (빠른 구현) |

### y-websocket 서버 구조 참고

```ts
// y-websocket 서버 (Node.js) 구조 파악
// 서버가 하는 일:
// 1. 클라이언트 접속 시 전체 상태(state) 전송
// 2. 클라이언트 업데이트 수신 → DB 저장 → 다른 클라이언트에 브로드캐스트
// 3. awareness 상태 중계

// Spring Boot로 구현할 때도 같은 패턴:
// @OnMessage
// void handleBinaryMessage(Session session, byte[] update) {
//   applyUpdateToDoc(docId, update)     // 서버 상태 업데이트
//   broadcastToOthers(session, update)  // 다른 클라이언트에 전달
// }
```

---

## 11. Snapshot — 버전 히스토리

**파일**: `src/utils/Snapshot.js`, `tests/snapshot.tests.js`

```js
// 현재 상태 스냅샷 (변경 불가 시점 캡처)
const snap = Y.snapshot(ydoc)
// snap = { ds: IdSet (삭제된 항목), sv: Map<clientID, clock> }

// 인코딩/디코딩 (DB 저장)
const encoded = Y.encodeSnapshot(snap)   // Uint8Array
const decoded = Y.decodeSnapshot(encoded)

// 스냅샷 시점의 상태로 읽기 전용 Doc 생성
const historicDoc = Y.createDocFromSnapshot(ydoc, snap)
// historicDoc.getMap('nodes').toJSON() → 그 시점의 노드 상태

// 비교
Y.equalSnapshots(snap1, snap2)  // 두 스냅샷 동일 여부
Y.snapshotContainsUpdate(snap, update)  // update가 snap 이후인지
```

**FlowMat 적용 — 워크플로우 버전 관리:**

```ts
// 워크플로우 저장 시 스냅샷 생성
async function saveWorkflowVersion(name: string) {
  const snap = Y.snapshot(ydoc)
  const encoded = Y.encodeSnapshot(snap)

  await api.post(`/api/workflows/${workflowId}/versions`, {
    name,
    snapshot: Array.from(encoded),  // base64 또는 binary로
    createdAt: new Date().toISOString(),
  })
}

// 특정 버전으로 미리보기
async function previewVersion(versionId: string) {
  const { snapshot } = await api.get(`/api/workflows/${workflowId}/versions/${versionId}`)
  const snap = Y.decodeSnapshot(new Uint8Array(snapshot))
  const historicDoc = Y.createDocFromSnapshot(ydoc, snap)

  // historicDoc에서 읽기 전용으로 캔버스 표시
  const nodes = historicDoc.getMap('nodes').toJSON()
  renderReadonlyCanvas(nodes)
}
```

이는 FlowMat의 `project_version` + `simulation_run` 테이블과 연동할 수 있다.

---

## 12. RelativePosition — 커서 위치 영속화

**파일**: `src/utils/RelativePosition.js`

```js
// 텍스트 편집에서 커서 위치를 CRDT 기반으로 저장
// (절대 인덱스가 아니라 주변 문자를 기준으로)
const relPos = Y.createRelativePositionFromTypeIndex(ytext, 5)
const encoded = Y.encodeRelativePosition(relPos)

// 나중에 절대 위치 복원
const decoded = Y.decodeRelativePosition(encoded)
const absPos = Y.createAbsolutePositionFromRelativePosition(decoded, ydoc)
// absPos.index → 현재 텍스트 기준 절대 인덱스
```

**FlowMat 적용:**

플로우 캔버스 노드 위치는 절대 좌표(posX, posY)를 그대로 써도 충분하다.  
RelativePosition은 텍스트 편집에서만 의미 있다.

---

## 13. FlowMat 구현 로드맵

### Phase 1: Awareness만 먼저 (1~2일, Spring Boot 변경 없음)

```ts
// src/collaboration/useCollaboration.ts
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const ydoc = new Y.Doc()

export function useCollaboration(workflowId: string) {
  const provider = new WebsocketProvider(
    'ws://localhost:1234',
    `workflow-${workflowId}`,
    ydoc
  )

  // 내 커서 위치 전송
  function setMyCursor(x: number, y: number) {
    provider.awareness.setLocalState({
      user: { id: userId, name: userName, color: userColor },
      cursor: { x, y },
      selectedNodeId: workspaceStore.selectedProcessId,
    })
  }

  // 다른 사용자 커서 구독
  const [remoteCursors, setRemoteCursors] = useState([])
  useEffect(() => {
    const handler = () => {
      const cursors = [...provider.awareness.getStates().entries()]
        .filter(([id]) => id !== provider.awareness.clientID)
        .map(([, state]) => state)
      setRemoteCursors(cursors)
    }
    provider.awareness.on('change', handler)
    return () => provider.awareness.off('change', handler)
  }, [])

  return { setMyCursor, remoteCursors }
}
```

이 단계에서 실제 캔버스 상태는 여전히 REST API로만 관리.  
y-websocket 서버를 `npx y-websocket` 로 로컬 실행해서 테스트 가능.

### Phase 2: 노드 이동 실시간 동기화 (2~3일)

```ts
const yNodes = ydoc.getMap<{ posX: number, posY: number }>('nodePositions')

// 노드 이동 시 Yjs로도 전파
async function saveNodePosition(processId: string, x: number, y: number) {
  // 1. REST API (영속성)
  await api.put(`/api/processes/${processId}`, { posX: x, posY: y })
  // 2. Yjs (실시간 전파)
  yNodes.set(processId, { posX: x, posY: y })
}

// 원격 이동 수신
yNodes.observe((event) => {
  for (const [processId, change] of event.changes.keys) {
    if (change.action !== 'delete') {
      const pos = yNodes.get(processId)!
      // React Flow 노드 위치 업데이트
      setNodes(nodes => nodes.map(n =>
        n.id === processId
          ? { ...n, position: { x: pos.posX, y: pos.posY } }
          : n
      ))
    }
  }
})
```

### Phase 3: 전체 상태 동기화 + Spring Boot 통합 (1주)

Spring Boot WebSocket (STOMP) 서버 추가:
```java
// Spring Boot WebSocket 메시지 핸들러
@MessageMapping("/workflow/{workflowId}/update")
public void handleYjsUpdate(@DestinationVariable String workflowId,
                             byte[] update) {
  // 1. 서버 Y.Doc에 적용 (Java용 Yjs 라이브러리: yjs4j 또는 직접 relay)
  // 2. 다른 클라이언트에 브로드캐스트
  messagingTemplate.convertAndSend(
    "/topic/workflow/" + workflowId,
    update
  );
}
```

또는 더 간단하게: **Spring Boot는 relay만** (상태 저장 안 함):
```java
// 단순 relay: 받은 binary를 그대로 다른 세션에 전달
// 상태는 클라이언트 중 하나가 새 참여자에게 sync
```

### Phase 4: UndoManager 전환 + 오프라인 지원

```ts
// commandHistory.ts 대체
const undoManager = new Y.UndoManager([yNodes, yEdges], {
  captureTimeout: 300,
  trackedOrigins: new Set([null]),
})

// 오프라인 영속성
import { IndexeddbPersistence } from 'y-indexeddb'
const persistence = new IndexeddbPersistence(`workflow-${workflowId}`, ydoc)
persistence.once('synced', () => console.log('로컬 데이터 로드 완료'))
```

---

## 14. 종합 우선순위 테이블

| 기능 | 구현 방법 | 선행 조건 | 우선순위 |
|---|---|---|---|
| Awareness (커서 공유) | y-websocket + awareness API | y-websocket 서버 | ★★★ |
| 노드 이동 실시간 동기화 | Y.Map + y-websocket | Phase 1 완료 | ★★★ |
| 원격 변경 감지 → UI 반영 | ymap.observe + setNodes | Phase 2 완료 | ★★★ |
| UndoManager로 전환 | Y.UndoManager | Phase 2 완료 | ★★☆ |
| 전체 상태 초기 동기화 | encodeStateAsUpdate + Spring Boot | Phase 2 완료 | ★★☆ |
| 오프라인 지원 | y-indexeddb | Phase 3 완료 | ★☆☆ |
| 워크플로우 버전 스냅샷 | Y.snapshot + DB 저장 | Phase 3 완료 | ★☆☆ |

---

## 15. y-websocket 서버 빠른 시작

```bash
# 로컬 테스트용 (Node.js)
npx y-websocket

# 기본 포트: 1234
# ws://localhost:1234
```

프로덕션에서는 y-websocket 서버를 별도 Node.js 서비스로 배포하거나,  
Spring Boot에서 직접 relay 서버를 구현한다.
