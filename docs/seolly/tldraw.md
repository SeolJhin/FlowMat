# tldraw — 전수조사 보고서 및 FlowMat 이식 가이드

> 조사 기준: `E:\projects\git\tldraw` 로컬 클론 직접 분석

## 1. 프로젝트 개요

**레포**: `tldraw/tldraw`  
**사이트**: tldraw.dev  
**라이선스**: tldraw 1.0 License (비상업적 무료, 상업적 유료)

React 기반 무한 캔버스 SDK. Google, Shopify, BlackRock, Autodesk 등이 프로덕션에서 사용한다.

### 모노레포 구조

```
packages/editor/        - 핵심 엔진 (Shape 없음, UI 없음)
packages/tldraw/        - 기본 Shape + Tool + UI 포함 완성형 SDK
packages/store/         - 반응형 클라이언트 DB (persistence, migrations)
packages/tlschema/      - Shape/Binding 타입 정의
packages/state/         - 반응형 시그널 라이브러리 (Atom, Computed)
packages/sync/          - 멀티플레이어 동기화
packages/sync-core/     - 동기화 코어 (WebSocket 프로토콜)
apps/examples/          - 256개 예제 (핵심 참고 자료)
apps/dotcom/            - tldraw.com 앱
```

---

## 2. 핵심 엔진 구조 (`packages/editor/src`)

### 2.1 StateNode — 계층적 상태머신

**파일**: `packages/editor/src/lib/editor/tools/StateNode.ts`

Tool과 상호작용 로직을 **계층적 상태머신**으로 표현한다.

```ts
class SelectTool extends StateNode {
  static id = 'select'
  static initial = 'idle'
  static isLockable = false

  static children(): TLStateNodeConstructor[] {
    return [Idle, Pointing, Translating, Resizing, Rotating, Brushing, ...]
  }

  onEnter() { /* 상태 진입 시 */ }
  onExit()  { /* 상태 이탈 시 */ }
}
```

SelectTool의 자식 상태만 18개:
- `Idle`, `PointingCanvas`, `PointingShape`, `PointingSelection`
- `PointingHandle`, `PointingResizeHandle`, `PointingRotateHandle`
- `Translating`, `Resizing`, `Rotating`, `Brushing`, `ScribbleBrushing`
- `Crop` (자체적으로 5개 자식 상태 포함)
- `EditingShape`

**FlowMat 적용 포인트:**

현재 FlowMat의 연결(Connection) 생성 과정을 StateNode로 표현하면:
```
ConnectionTool
  ├── Idle
  ├── PointingPort      (포트에 마우스 올림)
  ├── DraggingConnection (드래그 중)
  └── TargetSelection   (대상 포트 호버)
```
현재는 React Flow의 `onConnectStart/onConnectEnd` 이벤트로만 처리하는데,  
StateNode로 분리하면 각 단계별 피드백 UI(가이드 라인, 호버 강조 등)를 명확하게 구현할 수 있다.

**구현 복잡도**: 중간

---

### 2.2 ShapeUtil 패턴

**파일**: `packages/editor/src/lib/editor/shapes/ShapeUtil.ts`

Shape의 기하학, 렌더링, 핸들, 스냅, 바인딩을 한 클래스에서 관리한다.

```ts
abstract class ShapeUtil<Shape extends TLShape = TLShape> {
  static type: string
  static props?: RecordProps<Shape>
  static migrations?: MigrationSequence

  abstract getDefaultProps(): Shape['props']
  abstract getGeometry(shape: Shape): Geometry2d
  abstract component(shape: Shape): JSX.Element
  abstract indicator(shape: Shape): JSX.Element  // 선택 링

  getHandles(shape: Shape): TLHandle[]     // 핸들 포인트
  onResize(opts: TLResizeInfo): ShapePartial
  canBind(opts: TLShapeUtilCanBindOpts): boolean
  canSnap(shape: Shape): boolean
}
```

기본 제공 Shape 12종:
- `ArrowShapeUtil` — 바인딩 지원, elbow/curve 라우팅, 레이블 자동 배치
- `GeoShapeUtil` — 직사각형, 원, 다이아몬드 등 기하 도형
- `DrawShapeUtil` — 자유 그리기 (최대 600점, SVG 패턴 채우기)
- `NoteShapeUtil`, `TextShapeUtil`, `LineShapeUtil`
- `FrameShapeUtil` — 그룹화/클리핑 (sub-flow 개념)
- `ImageShapeUtil`, `VideoShapeUtil`, `BookmarkShapeUtil`, `EmbedShapeUtil`, `HighlightShapeUtil`

**FlowMat 적용 포인트:**

현재 `nodeCatalog.ts`가 노드 타입을 정의하고 있다.  
ShapeUtil 패턴을 따르면 각 노드 타입에 기하학 + 렌더링 + 핸들을 함께 정의할 수 있다:
```ts
class ProcessShapeUtil extends /* React Flow 기반 */ {
  getDefaultProps() { return { name: '공정', colorScheme: 'sky', ... } }
  getHandles(shape) { return shape.ios.map(io => ({ id: io.id, ... })) }
  canConnect(from, to) { /* 연결 가능 여부 검증 */ }
}
```
현재 FlowMat `nodeCatalog.ts`에 이 패턴을 점진적으로 도입 가능하다.

**구현 복잡도**: 중간

---

### 2.3 Manager 패턴

**파일**: `packages/editor/src/lib/editor/managers/EditorManager.ts`

16개의 전문화된 Manager가 `EditorManager`를 상속하며, 각자의 리소스를 정리(dispose)한다.

| Manager | 역할 |
|---|---|
| **HistoryManager** | Undo/Redo (atom + stack) |
| **SnapManager** | 스냅/정렬 (R-tree 공간 인덱싱) |
| **SpatialIndexManager** | RBush 기반 O(log n) 공간 쿼리 |
| **CollaboratorsManager** | 실시간 협업자 추적 (computed signals) |
| **ClickManager** | 싱글/더블 클릭 감지 |
| **InputsManager** | 마우스/키보드/제스처 통합 |
| **TextManager** | 텍스트 렌더링 최적화 |
| **FontManager** | 폰트 로딩/캐싱 |
| **TickManager** | 프레임 기반 업데이트 |
| **ThemeManager** | 다크/라이트 모드 |
| **UserPreferencesManager** | 사용자 설정 지속성 |

Cleanup 패턴:
```ts
class MyManager extends EditorManager {
  constructor(editor) {
    super(editor)
    // 1) 에디터 이벤트 자동 정리
    this.addEditorEvent('some-event', this.handleEvent)
    // 2) 커스텀 정리 함수 등록
    this.register(() => this.cleanup())
    // 3) 타이머 (자동 정리)
    editor.timers.setTimeout(fn, delay)
  }
}
```

**FlowMat 적용 포인트:**

FlowMat의 `useWorkflowCanvasActions.ts`가 너무 많은 책임을 가지고 있다.  
Manager 패턴으로 분리하면:
- `LayoutManager` — 자동 배치 계산
- `ConnectionManager` — 연결 경로 계산
- `ValidationManager` — I/O 타입 검증
- `CollabManager` — 실시간 협업 상태 관리

**구현 복잡도**: 낮음~중간

---

## 3. 반응형 상태 (`packages/state/src`)

**파일**: `packages/state/src/lib/Atom.ts`, `Computed.ts`

Excel 스프레드시트처럼 의존성이 자동으로 추적된다.

```ts
// Atom: 읽기/쓰기
const zoom = atom('zoom', 1)
zoom.set(2)
zoom.update(v => v * 1.1)

// 히스토리 추적 옵션
const zoom = atom('zoom', 1, {
  historyLength: 100,
  computeDiff: (prev, next) => next - prev
})

// Computed: 자동 의존성 추적
const scale = computed('scale', () => zoom.get() * devicePixelRatio)
// zoom 변경 → scale 자동 재계산
```

UNINITIALIZED 체크 (첫 실행 감지):
```ts
const incremental = computed('inc', (prevValue) => {
  if (isUninitialized(prevValue)) {
    return expensiveFullCalculation()
  }
  return cheapIncrementalUpdate()
})
```

**FlowMat 적용 포인트:**

현재 Zustand + TanStack Query 구조는 수동 invalidation이 많다.  
특히 `canvasInteractionStore.ts`의 상태 파생 계산에 Computed 패턴을 도입하면  
불필요한 리렌더링을 줄일 수 있다.

**구현 복잡도**: 낮음 (외부 라이브러리로 활용 가능)

---

## 4. 반응형 DB (`packages/store/src`)

**파일**: `packages/store/src/lib/Store.ts`

```ts
// 레코드 정의
interface Process {
  id: string
  typeName: 'process'
  name: string
  posX: number; posY: number
}

// 스토어 생성
const store = new Store({
  schema: new StoreSchema({
    types: {
      process: RecordType.definitionType<Process>({ validator, migrations })
    }
  })
})

// 쿼리
store.query.records('process', () => ({
  workflowId: { eq: currentWorkflowId }
})).get()

// 변경 감지
store.listen(({ changes, source }) => {
  if (source === 'remote') applyRemoteChanges(changes)
  else broadcastLocalChanges(changes)
})
```

**FlowMat 적용 포인트:**

현재 FlowMat은 TanStack Query (서버 상태)와 Zustand (에디터 상태)를 분리하고 있다.  
Store 패턴을 도입하면 캔버스 상태를 로컬 반응형 DB로 관리하면서  
서버와의 동기화를 `source: 'user' | 'remote'`로 구분할 수 있다.  
마이그레이션 시스템은 `project_version` 테이블과 연동한 버전 관리에 활용 가능.

**구현 복잡도**: 높음

---

## 5. 멀티플레이어 동기화 (`packages/sync-core/src`)

**파일**: `packages/sync-core/src/lib/TLSyncClient.ts`

WebSocket + Record diff 기반 동기화.

```ts
// 동기화 에러 코드
export const TLSyncErrorCloseEventCode = 4099
export enum TLSyncErrorCloseEventReason {
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  CLIENT_TOO_OLD = 'CLIENT_TOO_OLD',
  CLIENT_TOO_NEW = 'CLIENT_TOO_NEW'
}

// WebSocket 메시지 구조
type TLSocketServerSentDataEvent = {
  type: 'data'
  diff: RecordsDiff    // 변경된 필드만 전송 (전체 x)
  clock: number        // 논리적 시간 (LWW 충돌 해결)
}
```

솔로 모드 vs 협업 모드에 따라 FPS를 자동 조절한다:
```ts
const SOLO_MODE_FPS = 1       // 혼자일 때는 1fps로 동기화
const COLLABORATIVE_MODE_FPS = 30  // 협업 중이면 30fps
```

**FlowMat 적용 포인트:**

FlowMat에서 멀티플레이어를 구현할 때 이 프로토콜을 참고할 수 있다:
- `RecordsDiff` 형태로 변경된 필드만 브로드캐스트
- `clock` 기반 LWW (Last-Write-Wins) 충돌 해결
- 혼자 편집 중일 때 동기화 빈도를 낮춰 성능 보전

**구현 복잡도**: 높음

---

## 6. Binding 시스템

**파일**: `packages/editor/src/lib/editor/bindings/BindingUtil.ts`

Shape 간의 관계를 레코드로 관리한다. Arrow Shape가 이를 사용해  
시작/끝 노드에 연결되어 있으면 좌표를 자동으로 추적한다.

```ts
abstract class BindingUtil<T extends TLBinding> {
  // Shape 삭제 시 호출
  onBeforeDeleteFromShape(opts): void
  onBeforeDeleteToShape(opts): void

  // Shape 변경 시 호출 (위치/크기 변경 등)
  onAfterChangeFromShape(opts): void
  onAfterChangeToShape(opts): void

  // 복제/분리 시 호출
  onBeforeIsolateFromShape(opts): void
  onBeforeIsolateToShape(opts): void
}
```

**FlowMat 적용 포인트:**

현재 FlowMat의 `process_connection`은 `fromProcessId`, `toProcessId`를 직접 참조한다.  
Binding 패턴을 도입하면:
- Process 삭제 → 연결된 Connection 자동 정리 (현재는 백엔드에서만 처리)
- Process 복제 → Connection 처리 정책 명확화 (고정 vs 재연결)
- Process 이동 → Connection 엔드포인트 자동 추적

**구현 복잡도**: 중간

---

## 7. HistoryManager (Undo/Redo)

**파일**: `packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts`

```ts
class HistoryManager {
  private stacks = atom('stacks', {
    undos: stack<TLHistoryEntry>(),
    redos: stack<TLHistoryEntry>(),
  })

  // 3가지 모드
  private state: 'recording' | 'recordingPreserveRedoStack' | 'paused'
}
```

모드 설명:
- `recording` — 변경 기록 + redo 스택 초기화 (일반적인 편집)
- `recordingPreserveRedoStack` — 변경 기록하지만 redo 유지 (원격 변경 적용 시)
- `paused` — 변경 무시 (렌더 전용 업데이트)

**FlowMat과 비교:**

현재 FlowMat의 `commandHistory.ts`는 자체 구현 Undo/Redo이다.  
tldraw의 `recordingPreserveRedoStack` 모드는 협업 환경에서 원격 변경을  
내 redo 스택을 건드리지 않고 적용할 때 매우 중요한 패턴이다.  
협업 기능 추가 시 이 모드 분리가 필요하다.

**구현 복잡도**: 낮음~중간

---

## 8. 공간 인덱싱 (`SpatialIndexManager`)

**파일**: `packages/editor/src/lib/editor/managers/SpatialIndexManager/SpatialIndexManager.ts`

RBush(R-tree) 기반 O(log n) 공간 쿼리.

```ts
// 뷰포트 내의 Shape만 O(log n)으로 찾기
const shapesInViewport = spatialIndex.search(viewportBounds)
```

특징:
- Incremental 업데이트 (변경된 Shape만 인덱스 갱신)
- Viewport culling (보이는 것만 렌더)
- 페이지별 독립 인덱스

**FlowMat 적용 포인트:**

노드 수가 많아졌을 때 (50+) React Flow의 기본 렌더링은 전체 노드를 순회한다.  
뷰포트 culling을 직접 구현하거나 React Flow의 `onlyRenderVisibleElements` prop을 활성화할 때  
이 공간 인덱싱 패턴을 참고할 수 있다.

**구현 복잡도**: 중간

---

## 9. ComputedCache (파생 데이터 캐싱)

```ts
const connectionRouteCache = store.createComputedCache(
  'connectionRoutes',
  (connection: ProcessConnection) => calculateRoute(connection)
)

// 필요할 때만 계산, 의존 상태 변경 시 자동 무효화
const route = connectionRouteCache.get(connectionId)
```

**FlowMat 적용 포인트:**

- Connection 라우팅 계산 캐시 (포트 위치 변경 시만 재계산)
- 노드 통계 캐시 (I/O 수, 연결 수)
- 레이아웃 계산 캐시

**구현 복잡도**: 중간

---

## 10. 참고 예제 (`apps/examples/src/examples/`)

256개 예제 중 FlowMat에 직접 유용한 것들:

| 예제 카테고리 | 예제명 | FlowMat 활용 |
|---|---|---|
| 협업 | `sync-custom-presence` | 사용자 커서 구현 |
| 협업 | `sync-custom-shape` | 노드를 Record로 동기화 |
| 협업 | `user-presence` | 온라인 사용자 표시 |
| 데이터 | `custom-records` | Process metadata 저장 |
| 편집기 API | `lasso-select-tool` | 다중 선택 개선 |
| 편집기 API | `drag-and-drop` | 팔레트 드래그 앤 드롭 |
| 편집기 API | `snapshots` | 워크플로우 버전 스냅샷 |
| 편집기 API | `zoom-to-bounds` | 특정 노드로 줌 |
| UI | `inspector-panel` | NodeInspector 개선 |
| UI | `keyboard-shortcuts` | 단축키 체계 강화 |
| UI | `custom-theme` | 다크모드 지원 |
| 이벤트 | `before-create-update-shape` | 변경 전 검증 훅 |
| 설정 | `configure-shape-util` | 노드 타입별 설정 |

---

## 11. Arrow Shape 구현 심화

**파일**: `packages/tldraw/src/lib/shapes/arrow/ArrowShapeUtil.tsx`

FlowMat의 Connection(엣지) 개선에 직접 참고 가능한 구현:

핸들 타입:
```ts
const ArrowHandles = {
  Start: 'start',    // 시작점
  Middle: 'middle',  // elbow 모드 제어점
  End: 'end',        // 끝점
}
```

라우팅 알고리즘 (`elbow` vs `curve`):
- elbow: 직각 꺾임, 중간 waypoint 드래그 가능
- curve: 베지어 곡선

레이블:
- 화살표 중간에 텍스트 자동 배치
- 마우스 올리면 편집 가능

**FlowMat 적용:**

현재 `CanvasEdge.tsx`의 Connection에:
- `connectionType`에 따른 라우팅 분기 (`elbow` for material_flow, `curve` for data_flow)
- 엣지 중간 레이블 클릭 편집
- 엣지 중간 waypoint 드래그

---

## 12. 종합 우선순위 테이블

| 기능 | 참고 파일 | FlowMat 구현 방법 | 우선순위 |
|---|---|---|---|
| Manager 패턴으로 관심사 분리 | `EditorManager.ts` | `useWorkflowCanvasActions` 분리 | ★★★ |
| Connection 생성 StateNode | `SelectTool.ts` (패턴) | ConnectionTool 상태머신 | ★★★ |
| HistoryManager `recordingPreserveRedoStack` | `HistoryManager.ts` | 협업 시 원격 변경 처리 | ★★★ |
| ShapeUtil 패턴 → nodeCatalog 개선 | `ShapeUtil.ts` | 노드 타입별 클래스 정의 | ★★☆ |
| Binding 시스템 → Connection 자동 정리 | `BindingUtil.ts` | Process 삭제 시 자동 처리 | ★★☆ |
| Arrow Shape 라우팅 참고 | `ArrowShapeUtil.tsx` | connectionType별 라우팅 | ★★☆ |
| sync-core 프로토콜 참고 | `TLSyncClient.ts` | WebSocket 동기화 구현 | ★★☆ |
| ComputedCache → 라우팅 캐시 | `Store.ts` | Connection 경로 캐싱 | ★☆☆ |
| SpatialIndex → viewport culling | `SpatialIndexManager.ts` | 대규모 Flow 성능 | ★☆☆ |
| Atom/Computed 시그널 | `Atom.ts`, `Computed.ts` | 파생 상태 자동 계산 | ★☆☆ |

---

## 13. 직접 통합 vs 패턴 참고

**라이선스 문제로 tldraw 소스를 직접 복사하기는 어렵다.**  
(tldraw 1.0 License — 상업적 사용 시 유료)

대신 다음 방식으로 활용:
- **패턴 참고** — StateNode, ShapeUtil, Manager, BindingUtil 설계 방식을 FlowMat 구조에 맞게 자체 구현
- **예제 참고** — `apps/examples/`의 예제 코드로 React Flow 기반 동일 기능 구현 방법 파악
- **프로토콜 참고** — sync-core의 diff 기반 동기화 방식을 Spring Boot WebSocket으로 재구현
