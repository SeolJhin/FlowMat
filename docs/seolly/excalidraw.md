# excalidraw — 전수조사 보고서 및 FlowMat 이식 가이드

> 조사 기준: `E:\projects\git\excalidraw` 로컬 클론 직접 분석

## 1. 레포 전체 구조

```
excalidraw/
├── packages/
│   ├── excalidraw/           - 핵심 라이브러리 (npm 배포)
│   │   ├── data/             - reconcile, encode, library, encryption
│   │   ├── scene/            - export, Scene 클래스
│   │   ├── renderer/         - staticScene, svgScene, interactiveScene
│   │   ├── components/       - App.tsx (메인, ~430KB), UI 컴포넌트
│   │   ├── actions/          - 50+ 액션 파일
│   │   ├── appState.ts       - 전역 앱 상태 정의
│   │   └── history.ts        - Undo/Redo 시스템
│   ├── element/              - Element 연산 & 타입
│   │   ├── src/types.ts      - ExcalidrawElement 타입 (핵심)
│   │   ├── src/store.ts      - Store/Delta 시스템
│   │   ├── src/binding.ts    - Arrow-to-shape 바인딩
│   │   ├── src/fractionalIndex.ts - 멀티플레이어 Z-order
│   │   └── src/Scene.ts      - Scene 클래스
│   ├── math/                 - 기하 연산
│   ├── common/               - 공통 유틸
│   └── fractional-indexing/  - rocicorp Z-order 라이브러리 래퍼
├── excalidraw-app/
│   └── collab/
│       ├── Collab.tsx        - 협업 메인 클래스
│       └── Portal.tsx        - WebSocket 관리
└── examples/                 - NextJS, 브라우저 통합 예시
```

---

## 2. Element 데이터 구조 (협업의 핵심)

**파일**: `packages/element/src/types.ts`

```ts
type _ExcalidrawElementBase = Readonly<{
  id: string;
  x: number; y: number;
  width: number; height: number;
  angle: Radians;

  // 협업 충돌 해결에 핵심
  version: number;        // 변경될 때마다 +1
  versionNonce: number;   // 변경될 때마다 새 랜덤 정수

  // 멀티플레이어 Z-order (Fractional Indexing)
  index: FractionalIndex | null;

  isDeleted: boolean;
  updated: number;        // epoch timestamp
  boundElements: readonly BoundElement[] | null;
  customData?: Record<string, any>;  // 커스텀 데이터 확장 포인트
}>;
```

**FlowMat 적용:**

FlowMat의 `process`, `process_connection` 테이블에 두 필드를 추가하면  
서버 없이도 클라이언트 간 충돌을 결정론적으로 해결할 수 있다:

```ts
// FlowMat Process 타입에 추가
type ProcessWithVersion = Process & {
  version: number        // 편집 시마다 +1
  versionNonce: number   // 편집 시마다 새 랜덤값
}
```

---

## 3. 실시간 협업 구현

**디렉토리**: `excalidraw-app/collab/`

### 3.1 전체 아키텍처

```
클라이언트 A
  ↓ AES-GCM 암호화 + pako 압축
  ↓ Socket.io (WebSocket)
서버 (relay)
  ↓ broadcast
클라이언트 B
  ↓ 복호화 + 압축 해제
  ↓ reconcileElements()
React 상태 업데이트
```

기술 스택:
- **WebSocket**: Socket.io
- **영속성**: Firebase (교체 가능한 어댑터 구조)
- **암호화**: AES-256-GCM (per-room key)
- **압축**: pako (zlib)

### 3.2 Portal 클래스 — WebSocket 관리

**파일**: `excalidraw-app/collab/Portal.tsx`

```ts
class Portal {
  socket: Socket | null = null
  roomId: string | null = null
  roomKey: string | null = null
  broadcastedElementVersions: Map<string, number>  // 이미 보낸 버전 추적

  // 2가지 메시지 채널
  broadcastScene(updateType, elements, syncAll)  // 영속 채널 (element 변경)
  broadcastMouseLocation(pointer, button)         // Volatile 채널 (커서, 영속 x)
  broadcastIdleChange(userState)                  // Volatile 채널 (유휴 상태)
  broadcastVisibleSceneBounds(sceneBounds)        // Volatile 채널 (뷰포트)
}

// WebSocket 이벤트
// - "init-room"        → 방 참여
// - "new-user"         → 신규 참여자에게 전체 scene 전송
// - "room-user-change" → 참여자 목록 갱신
// - SERVER_VOLATILE    → 커서/유휴 상태 (실시간, 영속 x)
// - SERVER             → element 변경 (영속)
```

**FlowMat 적용:**

FlowMat WebSocket 채널도 2종으로 분리하면 좋다:
- **Durable channel**: 노드/엣지 변경 (DB 저장)
- **Volatile channel**: 커서 위치, 선택 상태 (실시간만, 저장 x)

### 3.3 Collab 클래스 — 협업 생명주기

**파일**: `excalidraw-app/collab/Collab.tsx`

```ts
class Collab extends PureComponent {
  portal: Portal
  fileManager: FileManager
  collaborators: Map<SocketId, Collaborator>
  lastBroadcastedOrReceivedSceneVersion: number

  // 주요 메서드
  startCollaboration()     // roomId + roomKey 생성, WebSocket 연결
  stopCollaboration()      // 연결 종료
  broadcastScene()         // 로컬 변경 → 서버 전송
  onRemoteSceneUpdate()    // 서버 메시지 수신 → reconcile 적용
}
```

**Incremental broadcast 패턴** (중요):
```ts
// 변경된 element만 전송 (전체 scene x)
const changedElements = elements.filter(el => {
  const broadcastedVersion = this.portal.broadcastedElementVersions.get(el.id)
  return broadcastedVersion === undefined || broadcastedVersion < el.version
})
this.portal.broadcastedElementVersions.set(el.id, el.version)
```

**FlowMat 적용:**

FlowMat도 전체 캔버스 상태가 아닌 변경된 노드/엣지만 전송해야 한다:
```ts
// broadcastedVersions: Map<processId, version>
const changedProcesses = processes.filter(p =>
  broadcastedVersions.get(p.processId) !== p.version
)
```

---

## 4. reconcileElements() — 충돌 해결 알고리즘

**파일**: `packages/excalidraw/data/reconcile.ts`

```ts
export const reconcileElements = (
  localElements: readonly OrderedExcalidrawElement[],
  remoteElements: readonly RemoteExcalidrawElement[],
  localAppState: AppState,
): ReconciledExcalidrawElement[] => {

  const shouldDiscardRemote = (
    local: Element | undefined,
    remote: RemoteElement,
  ): boolean => {
    if (!local) return false  // 로컬에 없으면 원격 채택

    if (
      // 현재 편집 중인 element는 무조건 로컬 우선
      local.id === localAppState.editingTextElement?.id ||
      local.id === localAppState.resizingElement?.id ||
      local.id === localAppState.newElement?.id ||

      // 버전 비교: 로컬이 더 최신이면 원격 버림
      local.version > remote.version ||

      // 버전이 같으면 versionNonce로 결정론적 해결
      (local.version === remote.version &&
       local.versionNonce <= remote.versionNonce)
    ) {
      return true  // 원격 버림 → 로컬 유지
    }
    return false  // 원격 채택
  }
}
```

**충돌 해결 규칙 요약:**

| 상황 | 결과 |
|---|---|
| 로컬 버전 > 원격 버전 | 로컬 유지 |
| 원격 버전 > 로컬 버전 | 원격 채택 |
| 버전 동일, 로컬 nonce ≤ 원격 nonce | 로컬 유지 |
| 버전 동일, 로컬 nonce > 원격 nonce | 원격 채택 |
| 현재 편집 중인 element | 항상 로컬 우선 |
| 로컬에 없는 element | 원격 채택 |

**FlowMat 적용:**

```ts
// FlowMat 충돌 해결 함수
function reconcileProcesses(
  localProcesses: ProcessWithVersion[],
  remoteProcesses: ProcessWithVersion[],
  editingProcessId: string | null,
): ProcessWithVersion[] {

  const localMap = new Map(localProcesses.map(p => [p.processId, p]))

  return remoteProcesses.reduce((acc, remote) => {
    const local = localMap.get(remote.processId)

    const shouldDiscard =
      remote.processId === editingProcessId ||  // 편집 중이면 로컬 우선
      (local && local.version > remote.version) ||
      (local && local.version === remote.version &&
       local.versionNonce <= remote.versionNonce)

    if (!shouldDiscard) acc.push(remote)
    return acc
  }, [] as ProcessWithVersion[])
}
```

---

## 5. Undo/Redo — Delta 기반 스택

**파일**: `packages/excalidraw/history.ts`

```ts
export class History {
  public readonly undoStack: HistoryDelta[] = []
  public readonly redoStack: HistoryDelta[] = []

  public record(delta: StoreDelta) {
    const historyDelta = HistoryDelta.inverse(delta)  // 델타를 역으로 저장
    this.undoStack.push(historyDelta)

    // element 변경이 있을 때만 redo 스택 초기화
    // (클릭 등 선택만 바뀌는 경우에는 redo 유지)
    if (!historyDelta.elements.isEmpty()) {
      this.redoStack.length = 0
    }
  }
}
```

**Store의 CaptureUpdateAction:**

**파일**: `packages/element/src/store.ts`

```ts
export const CaptureUpdateAction = {
  IMMEDIATELY: "IMMEDIATELY",  // 즉시 undo 스택에 기록 (일반 편집)
  EVENTUALLY: "EVENTUALLY",    // 나중에 배치로 기록 (드래그 중)
  NEVER: "NEVER",              // 기록 안 함 (원격 변경 적용 시)
}
```

**FlowMat과 비교:**

현재 FlowMat의 `commandHistory.ts`는 스냅샷 기반이다.  
Excalidraw의 **Delta 기반** 방식의 장점:
- 메모리 효율 (전체 상태 복사 x, 변경분만 저장)
- 협업 시 원격 변경에 `NEVER`를 사용해 undo 스택을 오염시키지 않음
- 선택 변경은 undo 스택에 안 쌓임

---

## 6. Export 기능

**파일**: `packages/excalidraw/scene/export.ts`

```ts
// SVG 내보내기
exportToSvg(elements, appState, files, scale)

// PNG/JPG 내보내기 (canvas → blob)
exportToBlob(elements, appState, files, scale, mimeType)

// JSON + 바이너리 파일
exportToJson(elements, appState, files)
```

Export 기능 특징:
- 다크모드 지원
- Frame 단위 내보내기 (특정 프레임만)
- HiDPI 대응 (scale factor)
- 이미지/폰트 임베딩
- 배경 포함/제외 옵션

**렌더링 파이프라인:**

```
elements → renderer/staticScene.ts (Canvas)
         → renderer/staticSvgScene.ts (SVG)
roughjs 라이브러리로 hand-drawn 렌더링
```

**FlowMat 적용:**

공정도 SVG 내보내기 구현 시:
- `exportToSvg()` 대신 React Flow의 `getViewportForBounds` + `html-to-image` 조합
- 하지만 excalidraw의 SVG 렌더 파이프라인 구조(canvas → svg 변환)를 참고해 정확도 향상
- Frame 단위 내보내기 → FlowMat에서 특정 workflow만 내보내기

---

## 7. 라이브러리 시스템

**파일**: `packages/excalidraw/data/library.ts`

```ts
// 어댑터 패턴으로 스토리지 교체 가능
interface LibraryPersistenceAdapter {
  load(metadata: { source: "load" | "save" }): MaybePromise<LibraryData | null>
  save(data: LibraryPersistedData): MaybePromise<void>
}

// LibraryItem 구조
type LibraryItem = {
  id: string
  elements: ExcalidrawElement[]  // 하나의 라이브러리 항목 = element 그룹
  created: number
}
```

기능:
- 라이브러리 항목 병합 (기존 + 신규)
- SVG 렌더링 캐시 (미리보기)
- 드래그-드롭으로 캔버스에 삽입
- 외부 URL에서 라이브러리 불러오기 (화이트리스트)
- 중복 감지 (element 수 + ID + versionNonce 비교)

**FlowMat 적용:**

노드 팔레트/템플릿 시스템을 어댑터 패턴으로 구현:
```ts
interface WorkflowLibraryAdapter {
  load(source: "load" | "save"): Promise<NodeTemplate[] | null>
  save(data: NodeTemplate[]): Promise<void>
}

// localStorage 어댑터
class LocalStorageLibraryAdapter implements WorkflowLibraryAdapter { ... }

// Spring Boot API 어댑터
class ApiLibraryAdapter implements WorkflowLibraryAdapter { ... }
```

이 구조면 나중에 서버 기반 라이브러리로 교체할 때 컴포넌트 코드를 건드리지 않아도 된다.

---

## 8. Scene 클래스 — Element 관리

**파일**: `packages/element/src/Scene.ts`

```ts
class Scene {
  // 이중 구조 유지
  private elements: readonly OrderedExcalidrawElement[]     // 정렬된 배열 (렌더링 순서)
  private elementsMap: SceneElementsMap                      // Map (O(1) ID 조회)
  private sceneNonce: number                                 // 캐시 무효화 트리거

  replaceAllElements(elements): void
  insertElement(element, index): void
  removeElement(id): void
  getNonDeletedElements(): readonly Element[]
  getSelectedElements(selectedIds, opts): Element[]
}
```

**FlowMat 적용:**

현재 FlowMat은 TanStack Query의 `canvas.nodes` 배열과 `canvas.nodeMap` 을  
`toWorkflowCanvasViewModel.ts`에서 변환해서 사용한다.  
Scene 클래스처럼 **배열 + Map 이중 구조**를 항상 동기화 상태로 유지하면  
조회는 O(1), 렌더링 순서는 배열로 관리하는 패턴을 더 명확하게 유지할 수 있다.

---

## 9. Fractional Indexing — 멀티플레이어 Z-order

**파일**: `packages/element/src/fractionalIndex.ts`

정수 인덱스(`1, 2, 3`) 대신 **분수 문자열 인덱스**(`"a", "a5", "m"`)를 사용한다.

장점:
- 두 element 사이에 새 element를 삽입할 때 다른 element의 인덱스를 바꾸지 않아도 됨
- 멀티플레이어 동시 삽입 충돌 없음
- 정렬은 단순 문자열 비교

```ts
// 사용 예
syncMovedIndices(elements, movedElements)  // 이동 후 인덱스 동기화
validateFractionalIndices(elements)         // 무결성 검증
```

**FlowMat 적용:**

현재 FlowMat의 노드 Z-order는 별도로 관리되지 않는다.  
멀티플레이어를 도입할 때 동시 삽입 충돌을 피하기 위해 이 라이브러리를 사용할 수 있다.

---

## 10. 암호화 및 압축

**파일**: `packages/excalidraw/data/encryption.ts`, `data/encode.ts`

```ts
// AES-256-GCM 암호화
const encryptData = async (key, data: Uint8Array) => {
  // SubtleCrypto API 사용
  // 랜덤 IV 생성, AES-GCM으로 암호화
  return { encryptedBuffer, iv }
}

// pako (zlib) 압축
const encode = ({ text, compress = true }) => {
  return {
    version: "1",
    encoding: "bstring",
    compressed: !!deflated,
    encoded: deflated || toByteString(text),
  }
}
```

Room 키 포맷: `#room=<roomId>,<base64EncodedKey>`  
→ URL에 키를 포함하므로 서버는 내용을 볼 수 없음

**FlowMat 적용:**

FlowMat은 기업 내부용이므로 E2E 암호화보다는  
WebSocket을 TLS(wss://)로 감싸는 것으로 충분하다.  
단, 외부 공유 워크플로우 기능 추가 시 이 암호화 패턴 참고.

---

## 11. 상태 관리 (AppState + Jotai)

**파일**: `packages/excalidraw/appState.ts`, `packages/excalidraw/editor-jotai.ts`

AppState의 주요 필드:
```ts
interface AppState {
  activeTool: ActiveTool
  selectedElementIds: Record<string, boolean>
  zoom: { value: NormalizedZoomValue }
  scrollX: number; scrollY: number

  // 협업 상태
  collaborators: Map<SocketId, Collaborator>
  userToFollow: UserToFollow | null

  // 편집 중인 element (reconcile에서 사용)
  editingTextElement: ExcalidrawTextElement | null
  resizingElement: NonDeletedExcalidrawElement | null
  newElement: NonDeletedExcalidrawNonSelectionElement | null

  // 100+ 개의 UI 설정 필드
}
```

Excalidraw는 전역 상태를 **Jotai atom**으로 관리한다.  
이를 통해 컴포넌트가 App 클래스와 직접 의존하지 않아도 된다.

**FlowMat과 비교:**

FlowMat의 `workspaceStore.ts` (Zustand)가 AppState에 해당한다.  
`editingTextElement`, `resizingElement` 같은 "현재 편집 중인 element" 추적이  
협업의 reconcile 로직에 필수적이다.  
FlowMat의 `inlineEditingNodeId`가 이 역할을 하고 있으나,  
협업 도입 시 reconcile에서 참조할 수 있도록 명확히 유지해야 한다.

---

## 12. Action 시스템

**디렉토리**: `packages/excalidraw/actions/` (50개+ 파일)

```ts
// 액션 패턴
const actionDeleteSelected = register({
  name: "deleteSelectedElements",
  label: "labels.delete",
  icon: TrashIcon,
  keyTest: (event) => event.key === "Delete" || event.key === "Backspace",
  predicate: (elements, appState) => appState.selectedElementIds.size > 0,
  handler: (elements, appState) => { /* 실제 삭제 로직 */ },
  trackEvent: { category: "element" },
})
```

특징:
- 각 액션에 단축키(`keyTest`), 조건(`predicate`), 로직(`handler`) 분리
- 이벤트 추적(`trackEvent`) 내장
- UI 버튼과 키보드 단축키가 같은 액션 객체를 공유

**FlowMat 적용:**

현재 FlowMat의 `WorkflowCanvasPage.tsx`에 인라인으로 키보드 이벤트 핸들러가 있다.  
Action 패턴으로 분리하면:
- 키보드 단축키 + 버튼 + 컨텍스트 메뉴가 같은 액션 객체를 공유
- 단축키 충돌 관리 쉬워짐
- 이벤트 추적 추가 용이

---

## 13. 연구 우선순위 파일 목록

| 우선순위 | 파일 경로 | 이유 |
|---|---|---|
| ★★★ | `packages/excalidraw/data/reconcile.ts` | 충돌 해결 알고리즘 |
| ★★★ | `excalidraw-app/collab/Collab.tsx` | 협업 생명주기 전체 |
| ★★★ | `packages/element/src/types.ts` | version/versionNonce 구조 |
| ★★★ | `packages/excalidraw/history.ts` | Delta 기반 Undo/Redo |
| ★★☆ | `packages/element/src/store.ts` | CaptureUpdateAction 패턴 |
| ★★☆ | `excalidraw-app/collab/Portal.tsx` | WebSocket 메시지 구조 |
| ★★☆ | `packages/excalidraw/data/library.ts` | 라이브러리 어댑터 패턴 |
| ★★☆ | `packages/excalidraw/scene/export.ts` | Export 파이프라인 |
| ★☆☆ | `packages/element/src/fractionalIndex.ts` | Z-order 알고리즘 |
| ★☆☆ | `packages/excalidraw/data/encode.ts` | 압축 패턴 |

---

## 14. 종합 우선순위 테이블

| 기능 | 참고 파일 | FlowMat 구현 방법 | 우선순위 |
|---|---|---|---|
| version + versionNonce 필드 추가 | `types.ts` | process/connection 테이블에 두 컬럼 추가 | ★★★ |
| reconcileProcesses() 구현 | `reconcile.ts` | 협업 상태 병합 함수 자체 구현 | ★★★ |
| Durable/Volatile 채널 분리 | `Portal.tsx` | WebSocket 2채널 설계 | ★★★ |
| CaptureUpdateAction 패턴 | `store.ts` | 원격 변경 시 Undo 스택 오염 방지 | ★★★ |
| Incremental broadcast | `Collab.tsx` | 변경된 노드만 전송 | ★★★ |
| 라이브러리 어댑터 패턴 | `library.ts` | 노드 팔레트 스토리지 교체 가능하게 | ★★☆ |
| Delta 기반 Undo/Redo | `history.ts` | commandHistory.ts 개선 | ★★☆ |
| Export (SVG/PNG) | `export.ts` | 공정도 내보내기 | ★★☆ |
| Action 패턴 | `actions/` | 단축키/버튼 통합 관리 | ★★☆ |
| Scene 이중 구조 | `Scene.ts` | nodeMap + nodes 동기화 | ★☆☆ |
| Fractional Indexing | `fractionalIndex.ts` | 멀티플레이어 Z-order | ★☆☆ |
| E2E 암호화 | `encryption.ts` | 외부 공유 기능 시 참고 | ★☆☆ |
