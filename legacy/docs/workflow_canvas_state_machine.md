# Workflow Canvas State Machine

## English

### Purpose

This document defines the runtime state machine for the MVP workflow canvas.

The goal is to make canvas behavior deterministic before the frontend implementation grows complex.

This document is not about visual design. It is about interaction state, transitions, and mutation boundaries.

### Why This Matters

The product direction is closer to a design tool than a form app.

That means the frontend cannot rely on ad hoc booleans such as:

- `isDragging`
- `isConnecting`
- `isEditing`
- `isOpen`

without an explicit state model.

The canvas needs stable rules for:

- selection
- dragging
- connecting
- inline rename
- inspector editing
- optimistic updates

### Core Objects

The state machine operates on these object types:

- workflow
- process node
- process I/O row
- process connection
- viewport
- connection draft

### Top-Level Canvas Modes

Use a single top-level `canvasMode`.

```text
idle
selecting
dragging_node
connecting
inline_renaming
inspecting
panning
submitting_mutation
```

Only one top-level mode should be active at a time.

### Selection State

Selection should be modeled separately from `canvasMode`.

Recommended state:

```text
selectionState
  type: 'none' | 'process' | 'process_io' | 'connection' | 'multi'
  processId?: string
  processIoId?: string
  connectionId?: string
  ids?: string[]
```

Priority:

1. process I/O row
2. connection
3. process
4. empty canvas

This priority matters when clicking in dense node layouts.

### Viewport State

Viewport should be independent from selection.

```text
viewportState
  x
  y
  zoom
  isDirty
```

`isDirty` means the viewport changed locally and has not yet been normalized into persisted UI state.

### Node Drag State

Node drag state:

```text
nodeDragState
  processId
  startX
  startY
  currentX
  currentY
```

Transitions:

- `idle -> dragging_node` on drag start
- `dragging_node -> idle` on drag end
- `dragging_node -> submitting_mutation` when position persistence begins

Rules:

- node drag does not immediately switch selection unless the dragged node was not already selected
- node position can update optimistically during drag
- backend persistence should happen on drag end, not every pointer move

### Connection Draft State

Connection draft is its own state object.

```text
connectionDraftState
  sourceProcessId
  sourceProcessIoId?: string
  sourceHandle
  targetProcessId?: string
  targetProcessIoId?: string
  targetHandle?: string
  isValidTarget
```

This state maps directly to backend connection fields:

- `fromProcessId`
- `toProcessId`
- `fromIoId`
- `toIoId`
- `sourceHandle`
- `targetHandle`

Transitions:

- `idle -> connecting` on handle drag start
- `connecting -> idle` on cancel
- `connecting -> submitting_mutation` on confirm
- `submitting_mutation -> idle` on success
- `submitting_mutation -> connecting` on recoverable validation failure

### Handle Rules

Use stable handle ids.

Recommended conventions:

- node output default handle: `out-default`
- node input default handle: `in-default`
- I/O row handle: use `processIoId`

If a connection is bound to a specific I/O row:

- `sourceHandle` or `targetHandle` should equal that `processIoId`

This allows React Flow reconnection to remain deterministic.

### Inline Rename State

Inline rename should not be mixed with generic inspector editing.

```text
inlineRenameState
  targetType: 'process' | null
  targetId?: string
  draftValue?: string
  startedAt?: number
```

Transitions:

- `idle -> inline_renaming` on double click or rename command
- `inline_renaming -> submitting_mutation` on submit
- `inline_renaming -> idle` on cancel

Rules:

- inline rename should lock selection to the active node
- escape cancels rename and restores previous value
- enter submits rename

### Inspector State

Inspector state should be derived from selection plus local tab choice.

```text
inspectorState
  mode: 'summary' | 'process' | 'process_io' | 'connection' | 'rule'
  activeTab?: 'general' | 'io' | 'rules'
```

Rules:

- empty selection -> `summary`
- selected node -> `process`
- selected I/O row -> `process_io`
- selected connection -> `connection`

### Rule Drawer State

Rule UI is not a top-level canvas mode, but it can temporarily coexist with inspection.

```text
ruleDrawerState
  isOpen
  targetType?: string
  targetId?: string
  sourceContext: 'toolbar' | 'process' | 'process_io' | 'connection'
```

The drawer should inherit target context from the current selection whenever possible.

### Mutation Boundary Rules

Not every interaction should call the backend immediately.

Persist immediately:

- create node
- delete node
- create I/O row
- delete I/O row
- create connection
- delete connection
- rename node submit
- rule create and update

Persist on interaction end:

- node move
- connection edit
- color change if using drag-style color picker

Local-only until submit:

- connection draft
- inline rename draft
- inspector form edits
- rule draft

### Optimistic Update Rules

Use optimistic updates only where rollback is clear.

Good candidates:

- node position
- node color
- node rename
- connection label

Avoid optimistic create if local reconciliation is unclear:

- workflow create from complex template
- rule create when validation logic is likely to block

### Failure Recovery

Failures should return the user to a meaningful state.

Examples:

- failed node move -> keep node selected, restore previous position
- failed connection create -> return to `connecting` when possible
- failed rename -> return to `inline_renaming` with draft preserved
- failed rule submit -> keep drawer open with current values

### Event Table

Recommended event names:

```text
CANVAS_CLICK
PROCESS_CLICK
PROCESS_IO_CLICK
CONNECTION_CLICK
VIEWPORT_PAN_START
VIEWPORT_PAN_END
NODE_DRAG_START
NODE_DRAG_END
CONNECTION_DRAG_START
CONNECTION_TARGET_HOVER
CONNECTION_DRAG_CANCEL
CONNECTION_CONFIRM
INLINE_RENAME_START
INLINE_RENAME_CHANGE
INLINE_RENAME_CANCEL
INLINE_RENAME_SUBMIT
INSPECTOR_TAB_CHANGE
RULE_DRAWER_OPEN
RULE_DRAWER_CLOSE
MUTATION_START
MUTATION_SUCCESS
MUTATION_FAILURE
```

### Recommended Zustand Shape

```text
workspaceStore
  canvasMode
  selection
  viewport
  nodeDrag
  connectionDraft
  inlineRename
  inspector
  ruleDrawer
```

Derived selectors:

- `selectedProcess`
- `selectedProcessIo`
- `selectedConnection`
- `isEditingLocked`
- `canOpenRuleDrawer`

### Interaction Constraints

Constraints for MVP:

- no multi-node drag mutation batching
- no freeform edge waypoint editing
- no simultaneous pan and connection draft
- no inline rename during mutation submit

### Minimal Implementation Order

Implement in this order:

1. selection model
2. node drag model
3. connection draft model
4. inline rename model
5. mutation lifecycle model

### Next Document

The next useful document should be:

`canvas_component_contracts`

That document should define:

- React props between canvas, node, edge, and inspector layers
- DTO-to-view-model conversion rules
- mutation hook boundaries

---

## Korean Translation

### 목적

이 문서는 MVP 워크플로우 캔버스의 런타임 상태 기계를 정의한다.

프론트엔드 구현이 복잡해지기 전에 캔버스 동작을 결정론적으로 만드는 것이 목표다.

이 문서는 시각 디자인 문서가 아니다. 인터랙션 상태, 전이, mutation 경계를 정의하는 문서다.

### 왜 중요한가

제품 방향은 폼 앱보다 디자인 툴에 더 가깝다.

따라서 프론트엔드는 다음 같은 임시 boolean에 기대면 안 된다.

- `isDragging`
- `isConnecting`
- `isEditing`
- `isOpen`

명시적 상태 모델 없이 이런 값만 늘리면 캔버스 동작이 불안정해진다.

캔버스는 다음에 대해 안정적인 규칙이 필요하다.

- selection
- dragging
- connecting
- inline rename
- inspector editing
- optimistic update

### 핵심 객체

상태 기계는 다음 객체 타입을 다룬다.

- workflow
- process node
- process I/O row
- process connection
- viewport
- connection draft

### 최상위 캔버스 모드

단일 최상위 `canvasMode`를 사용한다.

```text
idle
selecting
dragging_node
connecting
inline_renaming
inspecting
panning
submitting_mutation
```

한 시점에는 하나의 최상위 모드만 활성화되어야 한다.

### Selection 상태

selection은 `canvasMode`와 별도로 모델링해야 한다.

권장 상태:

```text
selectionState
  type: 'none' | 'process' | 'process_io' | 'connection' | 'multi'
  processId?: string
  processIoId?: string
  connectionId?: string
  ids?: string[]
```

우선순위:

1. process I/O row
2. connection
3. process
4. 빈 캔버스

이 우선순위는 노드가 복잡하게 배치된 상태에서 클릭 처리에 중요하다.

### Viewport 상태

viewport는 selection과 독립적이어야 한다.

```text
viewportState
  x
  y
  zoom
  isDirty
```

`isDirty`는 viewport가 로컬에서 바뀌었지만 아직 영속 UI 상태로 정리되지 않았다는 뜻이다.

### 노드 드래그 상태

노드 드래그 상태:

```text
nodeDragState
  processId
  startX
  startY
  currentX
  currentY
```

전이:

- drag start 시 `idle -> dragging_node`
- drag end 시 `dragging_node -> idle`
- 위치 저장 시작 시 `dragging_node -> submitting_mutation`

규칙:

- 드래그 중인 노드가 원래 선택돼 있지 않은 경우에만 선택이 바뀐다
- 드래그 중 위치는 optimistic update 가능
- 백엔드 저장은 pointer move마다 하지 말고 drag end에서 한다

### Connection draft 상태

connection draft는 별도 상태 객체여야 한다.

```text
connectionDraftState
  sourceProcessId
  sourceProcessIoId?: string
  sourceHandle
  targetProcessId?: string
  targetProcessIoId?: string
  targetHandle?: string
  isValidTarget
```

이 상태는 다음 백엔드 필드와 직접 매핑된다.

- `fromProcessId`
- `toProcessId`
- `fromIoId`
- `toIoId`
- `sourceHandle`
- `targetHandle`

전이:

- handle drag start 시 `idle -> connecting`
- cancel 시 `connecting -> idle`
- confirm 시 `connecting -> submitting_mutation`
- 성공 시 `submitting_mutation -> idle`
- 복구 가능한 validation 실패 시 `submitting_mutation -> connecting`

### Handle 규칙

handle id는 안정적으로 유지해야 한다.

권장 규칙:

- 노드 output 기본 handle: `out-default`
- 노드 input 기본 handle: `in-default`
- I/O row handle: `processIoId` 사용

특정 I/O row에 바인딩된 connection이라면:

- `sourceHandle` 또는 `targetHandle`은 그 `processIoId`와 같아야 한다

이렇게 해야 React Flow 재연결이 결정론적으로 동작한다.

### Inline rename 상태

inline rename은 일반 inspector editing과 섞지 않는다.

```text
inlineRenameState
  targetType: 'process' | null
  targetId?: string
  draftValue?: string
  startedAt?: number
```

전이:

- 더블 클릭 또는 rename 명령 시 `idle -> inline_renaming`
- submit 시 `inline_renaming -> submitting_mutation`
- cancel 시 `inline_renaming -> idle`

규칙:

- inline rename 중에는 활성 노드 selection을 고정한다
- escape는 rename을 취소하고 이전 값을 복구한다
- enter는 rename을 제출한다

### Inspector 상태

inspector 상태는 selection과 로컬 탭 선택에서 파생돼야 한다.

```text
inspectorState
  mode: 'summary' | 'process' | 'process_io' | 'connection' | 'rule'
  activeTab?: 'general' | 'io' | 'rules'
```

규칙:

- 비선택 상태 -> `summary`
- 노드 선택 -> `process`
- I/O row 선택 -> `process_io`
- 연결 선택 -> `connection`

### Rule drawer 상태

Rule UI는 최상위 캔버스 모드는 아니지만, inspection과 함께 존재할 수 있다.

```text
ruleDrawerState
  isOpen
  targetType?: string
  targetId?: string
  sourceContext: 'toolbar' | 'process' | 'process_io' | 'connection'
```

가능하면 drawer는 현재 selection에서 target context를 상속받아야 한다.

### Mutation 경계 규칙

모든 인터랙션이 즉시 백엔드를 호출하면 안 된다.

즉시 저장:

- 노드 생성
- 노드 삭제
- I/O row 생성
- I/O row 삭제
- 연결 생성
- 연결 삭제
- 노드 이름 변경 제출
- 규칙 생성 및 수정

인터랙션 종료 시 저장:

- 노드 이동
- 연결 수정
- 드래그형 color picker를 쓰는 경우 색상 변경

submit 전까지 로컬 전용:

- connection draft
- inline rename draft
- inspector 폼 수정값
- rule draft

### Optimistic update 규칙

rollback이 분명한 곳에만 optimistic update를 사용한다.

적합한 후보:

- 노드 위치
- 노드 색상
- 노드 이름
- 연결 라벨

로컬 정합성이 불분명한 create는 optimistic create를 피한다.

- 복잡한 템플릿 기반 workflow 생성
- validation 차단 가능성이 큰 rule 생성

### 실패 복구

실패 시 사용자를 의미 있는 상태로 돌려놔야 한다.

예:

- 노드 이동 실패 -> 노드 selection 유지, 이전 위치 복구
- 연결 생성 실패 -> 가능하면 `connecting` 상태로 복귀
- rename 실패 -> draft를 유지한 채 `inline_renaming`으로 복귀
- rule 제출 실패 -> 현재 값 유지한 채 drawer 열어두기

### 이벤트 테이블

권장 이벤트 이름:

```text
CANVAS_CLICK
PROCESS_CLICK
PROCESS_IO_CLICK
CONNECTION_CLICK
VIEWPORT_PAN_START
VIEWPORT_PAN_END
NODE_DRAG_START
NODE_DRAG_END
CONNECTION_DRAG_START
CONNECTION_TARGET_HOVER
CONNECTION_DRAG_CANCEL
CONNECTION_CONFIRM
INLINE_RENAME_START
INLINE_RENAME_CHANGE
INLINE_RENAME_CANCEL
INLINE_RENAME_SUBMIT
INSPECTOR_TAB_CHANGE
RULE_DRAWER_OPEN
RULE_DRAWER_CLOSE
MUTATION_START
MUTATION_SUCCESS
MUTATION_FAILURE
```

### 권장 Zustand 구조

```text
workspaceStore
  canvasMode
  selection
  viewport
  nodeDrag
  connectionDraft
  inlineRename
  inspector
  ruleDrawer
```

파생 selector:

- `selectedProcess`
- `selectedProcessIo`
- `selectedConnection`
- `isEditingLocked`
- `canOpenRuleDrawer`

### 인터랙션 제약

MVP 제약:

- 다중 노드 드래그 mutation batching 없음
- 자유형 edge waypoint 편집 없음
- pan과 connection draft 동시 수행 없음
- mutation submit 중 inline rename 없음

### 최소 구현 순서

다음 순서로 구현한다.

1. selection 모델
2. node drag 모델
3. connection draft 모델
4. inline rename 모델
5. mutation lifecycle 모델

### 다음 문서

다음으로 유용한 문서는 다음이다.

`canvas_component_contracts`

그 문서에는 다음이 들어가야 한다.

- canvas, node, edge, inspector 사이의 React props 계약
- DTO에서 view model로 변환하는 규칙
- mutation hook 경계
