# Canvas Component Contracts

## English

### Purpose

This document defines the concrete contracts between:

- REST API DTOs
- frontend canvas view models
- React components
- mutation hooks

The goal is to let the frontend implementation begin without inventing ad hoc interfaces in each feature.

### Architectural Principle

The frontend is a RESTful React client.

That means:

- DTOs come from REST resources
- view models adapt DTOs for rendering
- components consume view models, not raw API payloads
- mutation hooks translate UI intent back into REST request payloads

### Layer Boundaries

Use four layers:

1. REST DTO layer
2. View model layer
3. Component props layer
4. Mutation hook layer

Rules:

- DTO layer mirrors backend fields exactly
- view model layer may reshape data for React Flow and inspector use
- component props should stay UI-focused
- mutation hooks should own request building and invalidation policy

### Source DTOs

Primary backend payload:

- `WorkflowCanvasResponse`
  - `workflow`
  - `processes`
  - `processIos`
  - `connections`

Supporting DTOs:

- `WorkflowResponse`
- `ProcessResponse`
- `ProcessIoResponse`
- `ProcessConnectionResponse`

### REST DTO Contracts

#### `WorkflowResponse`

Use as the page header and inspector summary source.

Important fields:

- `workflowId`
- `projectId`
- `workflowName`
- `workflowDesc`
- `workflowType`
- `workflowStatus`

#### `ProcessResponse`

This is the raw node DTO.

Important fields:

- `processId`
- `projectId`
- `workflowId`
- `processName`
- `processType`
- `nodeType`
- `processStatus`
- `colorScheme`
- `posX`
- `posY`
- `width`
- `height`
- `processDesc`

#### `ProcessIoResponse`

This is the raw node port or row DTO.

Important fields:

- `processIoId`
- `processId`
- `itemId`
- `ioName`
- `direction`
- `ioType`
- `quantity`
- `unit`
- `formula`
- `colorScheme`
- `requiredYn`
- `allowShortageYn`

#### `ProcessConnectionResponse`

This is the raw edge DTO.

Important fields:

- `connectionId`
- `fromProcessId`
- `toProcessId`
- `fromIoId`
- `toIoId`
- `itemId`
- `sourceHandle`
- `targetHandle`
- `connectionType`
- `connectionLabel`
- `flowRate`
- `unit`
- `delayTimeSec`
- `lossRate`
- `priority`

### View Model Contracts

The frontend should not render directly from DTO arrays.

Create explicit view models:

- `WorkflowCanvasViewModel`
- `CanvasNodeViewModel`
- `CanvasPortViewModel`
- `CanvasEdgeViewModel`
- `InspectorSelectionViewModel`

### `WorkflowCanvasViewModel`

Recommended shape:

```ts
type WorkflowCanvasViewModel = {
  workflow: WorkflowHeaderViewModel
  nodes: CanvasNodeViewModel[]
  edges: CanvasEdgeViewModel[]
  nodeMap: Record<string, CanvasNodeViewModel>
  portMap: Record<string, CanvasPortViewModel>
}
```

Purpose:

- avoid repeated list scanning
- support fast lookup by node id and port id
- keep canvas rendering and inspector lookup cheap

### `CanvasNodeViewModel`

Recommended shape:

```ts
type CanvasNodeViewModel = {
  id: string
  processId: string
  projectId: string
  workflowId: string
  name: string
  processType: string
  nodeType: string
  status: string
  colorScheme: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  description: string | null
  inputs: CanvasPortViewModel[]
  outputs: CanvasPortViewModel[]
  inputCount: number
  outputCount: number
}
```

Mapping rules:

- `id = processId`
- `name = processName`
- `status = processStatus`
- `position.x = posX`
- `position.y = posY`
- `size.width = width`
- `size.height = height`
- `description = processDesc`
- `inputs` and `outputs` come from grouped `processIos`

### `CanvasPortViewModel`

Recommended shape:

```ts
type CanvasPortViewModel = {
  id: string
  processIoId: string
  processId: string
  itemId: string
  name: string | null
  direction: 'input' | 'output' | string
  ioType: string
  quantity: string
  unit: string
  formula: string | null
  colorScheme: string
  required: boolean
  allowShortage: boolean
  handleId: string
}
```

Mapping rules:

- `id = processIoId`
- `quantity` should be normalized to string for stable form inputs
- `required = requiredYn === 'Y'`
- `allowShortage = allowShortageYn === 'Y'`
- `handleId = processIoId`

### `CanvasEdgeViewModel`

Recommended shape:

```ts
type CanvasEdgeViewModel = {
  id: string
  connectionId: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  fromProcessId: string
  toProcessId: string
  fromIoId: string | null
  toIoId: string | null
  itemId: string | null
  connectionType: string
  label: string | null
  flowRate: string | null
  unit: string | null
  delayTimeSec: string | null
  lossRate: string | null
  priority: number
}
```

Mapping rules:

- `id = connectionId`
- `source = fromProcessId`
- `target = toProcessId`
- preserve `sourceHandle` and `targetHandle`
- numeric values should be normalized to string when used in forms

### DTO to View Model Conversion

Recommended conversion flow:

1. index all `processIos` by `processId`
2. group ports into `inputs` and `outputs`
3. build `CanvasNodeViewModel[]`
4. build `CanvasEdgeViewModel[]`
5. derive lookup maps

Create one conversion function:

```ts
toWorkflowCanvasViewModel(dto: WorkflowCanvasResponse): WorkflowCanvasViewModel
```

This function should be pure.

### React Component Contracts

Use these primary components:

- `WorkflowCanvasPage`
- `CanvasViewport`
- `CanvasNode`
- `CanvasEdge`
- `NodeInspector`
- `ConnectionInspector`
- `RuleDrawer`

### `WorkflowCanvasPage` Props Contract

Recommended props:

```ts
type WorkflowCanvasPageProps = {
  canvas: WorkflowCanvasViewModel
  selection: SelectionState
  canvasMode: CanvasMode
  onNodeSelect(processId: string): void
  onPortSelect(processIoId: string): void
  onEdgeSelect(connectionId: string): void
}
```

This page should coordinate child components, not own API payload shaping.

### `CanvasViewport` Props Contract

Recommended props:

```ts
type CanvasViewportProps = {
  nodes: CanvasNodeViewModel[]
  edges: CanvasEdgeViewModel[]
  selection: SelectionState
  canvasMode: CanvasMode
  connectionDraft: ConnectionDraftState | null
  onNodeDragEnd(processId: string, x: number, y: number): void
  onConnectStart(payload: ConnectStartPayload): void
  onConnectComplete(payload: ConnectCompletePayload): void
  onCanvasClick(): void
}
```

### `CanvasNode` Props Contract

Recommended props:

```ts
type CanvasNodeProps = {
  node: CanvasNodeViewModel
  selected: boolean
  editing: boolean
  onSelect(): void
  onRenameStart(): void
  onColorEdit(): void
  onPortSelect(processIoId: string): void
}
```

Responsibilities:

- render node shell
- render inline inputs and outputs
- forward events upward

Do not let the node component call REST APIs directly.

### `CanvasEdge` Props Contract

Recommended props:

```ts
type CanvasEdgeProps = {
  edge: CanvasEdgeViewModel
  selected: boolean
  onSelect(): void
}
```

### `NodeInspector` Props Contract

Recommended props:

```ts
type NodeInspectorProps = {
  node: CanvasNodeViewModel | null
  selectedPort: CanvasPortViewModel | null
  rules: FlowRuleViewModel[]
  onNodeSubmit(input: UpdateProcessInput): Promise<void>
  onPortCreate(input: CreateProcessIoInput): Promise<void>
  onPortUpdate(input: UpdateProcessIoInput): Promise<void>
  onPortDelete(processIoId: string): Promise<void>
  onOpenRuleBuilder(target: RuleTargetInput): void
}
```

### `ConnectionInspector` Props Contract

Recommended props:

```ts
type ConnectionInspectorProps = {
  edge: CanvasEdgeViewModel | null
  rules: FlowRuleViewModel[]
  onSubmit(input: UpdateProcessConnectionInput): Promise<void>
  onDelete(connectionId: string): Promise<void>
  onOpenRuleBuilder(target: RuleTargetInput): void
}
```

### Mutation Hook Contracts

Use feature-level hooks, not generic one-size-fits-all mutation wrappers.

Recommended hooks:

- `useCreateProcess`
- `useUpdateProcess`
- `useDeleteProcess`
- `useCreateProcessIo`
- `useUpdateProcessIo`
- `useDeleteProcessIo`
- `useCreateProcessConnection`
- `useUpdateProcessConnection`
- `useDeleteProcessConnection`

### Hook Responsibilities

Each mutation hook should own:

- request payload construction
- optimistic update policy
- rollback behavior
- query invalidation scope
- error mapping

Each mutation hook should not own:

- global selection logic
- component-local open and close state
- form field formatting unrelated to API payloads

### Request Input Contracts

Frontend mutation input types may differ from DTOs.

Example:

```ts
type UpdateProcessPositionInput = {
  processId: string
  x: number
  y: number
}
```

This can serialize to:

```ts
{
  posX: x,
  posY: y
}
```

This separation is useful and should be preserved.

### REST Naming Principle

Mutation hooks should preserve REST resource boundaries.

Good:

- `updateProcess`
- `createProcessIo`
- `deleteProcessConnection`

Avoid:

- `saveCanvasEverything`
- `syncWorkspaceState`
- `submitProcessGraphBlob`

### Query Ownership

Recommended ownership:

- `useWorkflowCanvasQuery(workflowId)` returns `WorkflowCanvasViewModel`
- leaf components do not fetch directly unless they are independent screens

This keeps the workspace graph consistent.

### Error Contract

Mutation hooks should normalize backend errors into UI-safe objects.

Recommended shape:

```ts
type UiError = {
  code: string
  message: string
  field?: string
}
```

Components should render normalized UI errors, not raw Axios or fetch error objects.

### Minimal File Layout

Recommended frontend file layout:

```text
entities/workflow/model/toWorkflowCanvasViewModel.ts
entities/workflow/model/types.ts
features/process-edit/model/useUpdateProcess.ts
features/process-io-edit/model/useCreateProcessIo.ts
features/connection-edit/model/useCreateProcessConnection.ts
pages/workspace/ui/WorkflowCanvasPage.tsx
pages/workspace/ui/CanvasViewport.tsx
pages/workspace/ui/CanvasNode.tsx
pages/workspace/ui/CanvasEdge.tsx
pages/workspace/ui/NodeInspector.tsx
pages/workspace/ui/ConnectionInspector.tsx
```

### Non-Goals

- one giant workspace service file
- direct DTO usage in every component
- component-level fetch duplication
- implicit mutation side effects

### Next Document

The next useful document should be:

`workspace_rest_api_playbook`

That document should define:

- exact request and response examples
- query invalidation table
- optimistic update matrix
- error handling matrix

---

## Korean Translation

### 목적

이 문서는 다음 사이의 구체적인 계약을 정의한다.

- REST API DTO
- 프론트 캔버스 view model
- React 컴포넌트
- mutation hook

목표는 기능마다 임시 인터페이스를 새로 만들지 않고도 프론트 구현을 시작할 수 있게 하는 것이다.

### 아키텍처 원칙

프론트엔드는 RESTful React client다.

의미는 다음과 같다.

- DTO는 REST 리소스에서 온다
- view model은 DTO를 렌더링용으로 변환한다
- 컴포넌트는 raw API payload가 아니라 view model을 소비한다
- mutation hook은 UI 의도를 REST 요청 payload로 다시 변환한다

### 계층 경계

4개 계층을 사용한다.

1. REST DTO 계층
2. View model 계층
3. Component props 계층
4. Mutation hook 계층

규칙:

- DTO 계층은 백엔드 필드를 그대로 따른다
- view model 계층은 React Flow와 inspector에 맞게 데이터를 재구성할 수 있다
- component props는 UI 중심이어야 한다
- mutation hook은 요청 생성과 invalidation 정책을 책임져야 한다

### 소스 DTO

기본 백엔드 payload:

- `WorkflowCanvasResponse`
  - `workflow`
  - `processes`
  - `processIos`
  - `connections`

보조 DTO:

- `WorkflowResponse`
- `ProcessResponse`
- `ProcessIoResponse`
- `ProcessConnectionResponse`

### REST DTO 계약

#### `WorkflowResponse`

페이지 헤더와 inspector summary의 소스로 사용한다.

중요 필드:

- `workflowId`
- `projectId`
- `workflowName`
- `workflowDesc`
- `workflowType`
- `workflowStatus`

#### `ProcessResponse`

이것은 raw node DTO다.

중요 필드:

- `processId`
- `projectId`
- `workflowId`
- `processName`
- `processType`
- `nodeType`
- `processStatus`
- `colorScheme`
- `posX`
- `posY`
- `width`
- `height`
- `processDesc`

#### `ProcessIoResponse`

이것은 raw node port 또는 row DTO다.

중요 필드:

- `processIoId`
- `processId`
- `itemId`
- `ioName`
- `direction`
- `ioType`
- `quantity`
- `unit`
- `formula`
- `colorScheme`
- `requiredYn`
- `allowShortageYn`

#### `ProcessConnectionResponse`

이것은 raw edge DTO다.

중요 필드:

- `connectionId`
- `fromProcessId`
- `toProcessId`
- `fromIoId`
- `toIoId`
- `itemId`
- `sourceHandle`
- `targetHandle`
- `connectionType`
- `connectionLabel`
- `flowRate`
- `unit`
- `delayTimeSec`
- `lossRate`
- `priority`

### View model 계약

프론트엔드는 DTO 배열을 그대로 렌더링하면 안 된다.

명시적인 view model을 만든다.

- `WorkflowCanvasViewModel`
- `CanvasNodeViewModel`
- `CanvasPortViewModel`
- `CanvasEdgeViewModel`
- `InspectorSelectionViewModel`

### `WorkflowCanvasViewModel`

권장 형태:

```ts
type WorkflowCanvasViewModel = {
  workflow: WorkflowHeaderViewModel
  nodes: CanvasNodeViewModel[]
  edges: CanvasEdgeViewModel[]
  nodeMap: Record<string, CanvasNodeViewModel>
  portMap: Record<string, CanvasPortViewModel>
}
```

목적:

- 반복적인 목록 탐색 방지
- node id와 port id 기준 빠른 lookup 지원
- 캔버스 렌더링과 inspector lookup 비용 절감

### `CanvasNodeViewModel`

권장 형태:

```ts
type CanvasNodeViewModel = {
  id: string
  processId: string
  projectId: string
  workflowId: string
  name: string
  processType: string
  nodeType: string
  status: string
  colorScheme: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  description: string | null
  inputs: CanvasPortViewModel[]
  outputs: CanvasPortViewModel[]
  inputCount: number
  outputCount: number
}
```

변환 규칙:

- `id = processId`
- `name = processName`
- `status = processStatus`
- `position.x = posX`
- `position.y = posY`
- `size.width = width`
- `size.height = height`
- `description = processDesc`
- `inputs`, `outputs`는 grouped `processIos`에서 만든다

### `CanvasPortViewModel`

권장 형태:

```ts
type CanvasPortViewModel = {
  id: string
  processIoId: string
  processId: string
  itemId: string
  name: string | null
  direction: 'input' | 'output' | string
  ioType: string
  quantity: string
  unit: string
  formula: string | null
  colorScheme: string
  required: boolean
  allowShortage: boolean
  handleId: string
}
```

변환 규칙:

- `id = processIoId`
- `quantity`는 안정적인 form 입력을 위해 string으로 정규화
- `required = requiredYn === 'Y'`
- `allowShortage = allowShortageYn === 'Y'`
- `handleId = processIoId`

### `CanvasEdgeViewModel`

권장 형태:

```ts
type CanvasEdgeViewModel = {
  id: string
  connectionId: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  fromProcessId: string
  toProcessId: string
  fromIoId: string | null
  toIoId: string | null
  itemId: string | null
  connectionType: string
  label: string | null
  flowRate: string | null
  unit: string | null
  delayTimeSec: string | null
  lossRate: string | null
  priority: number
}
```

변환 규칙:

- `id = connectionId`
- `source = fromProcessId`
- `target = toProcessId`
- `sourceHandle`, `targetHandle`는 그대로 유지
- 숫자값은 form에서 쓸 때 string으로 정규화

### DTO -> View model 변환

권장 변환 흐름:

1. 모든 `processIos`를 `processId` 기준으로 인덱싱
2. port를 `inputs`, `outputs`로 그룹화
3. `CanvasNodeViewModel[]` 생성
4. `CanvasEdgeViewModel[]` 생성
5. lookup map 파생

하나의 변환 함수를 둔다.

```ts
toWorkflowCanvasViewModel(dto: WorkflowCanvasResponse): WorkflowCanvasViewModel
```

이 함수는 pure function이어야 한다.

### React 컴포넌트 계약

기본 컴포넌트:

- `WorkflowCanvasPage`
- `CanvasViewport`
- `CanvasNode`
- `CanvasEdge`
- `NodeInspector`
- `ConnectionInspector`
- `RuleDrawer`

### `WorkflowCanvasPage` Props 계약

권장 props:

```ts
type WorkflowCanvasPageProps = {
  canvas: WorkflowCanvasViewModel
  selection: SelectionState
  canvasMode: CanvasMode
  onNodeSelect(processId: string): void
  onPortSelect(processIoId: string): void
  onEdgeSelect(connectionId: string): void
}
```

이 페이지는 자식 컴포넌트를 조정해야지, API payload 변환을 직접 들고 있으면 안 된다.

### `CanvasViewport` Props 계약

권장 props:

```ts
type CanvasViewportProps = {
  nodes: CanvasNodeViewModel[]
  edges: CanvasEdgeViewModel[]
  selection: SelectionState
  canvasMode: CanvasMode
  connectionDraft: ConnectionDraftState | null
  onNodeDragEnd(processId: string, x: number, y: number): void
  onConnectStart(payload: ConnectStartPayload): void
  onConnectComplete(payload: ConnectCompletePayload): void
  onCanvasClick(): void
}
```

### `CanvasNode` Props 계약

권장 props:

```ts
type CanvasNodeProps = {
  node: CanvasNodeViewModel
  selected: boolean
  editing: boolean
  onSelect(): void
  onRenameStart(): void
  onColorEdit(): void
  onPortSelect(processIoId: string): void
}
```

책임:

- 노드 셸 렌더링
- 인라인 input, output 렌더링
- 이벤트를 상위로 전달

노드 컴포넌트가 직접 REST API를 호출하면 안 된다.

### `CanvasEdge` Props 계약

권장 props:

```ts
type CanvasEdgeProps = {
  edge: CanvasEdgeViewModel
  selected: boolean
  onSelect(): void
}
```

### `NodeInspector` Props 계약

권장 props:

```ts
type NodeInspectorProps = {
  node: CanvasNodeViewModel | null
  selectedPort: CanvasPortViewModel | null
  rules: FlowRuleViewModel[]
  onNodeSubmit(input: UpdateProcessInput): Promise<void>
  onPortCreate(input: CreateProcessIoInput): Promise<void>
  onPortUpdate(input: UpdateProcessIoInput): Promise<void>
  onPortDelete(processIoId: string): Promise<void>
  onOpenRuleBuilder(target: RuleTargetInput): void
}
```

### `ConnectionInspector` Props 계약

권장 props:

```ts
type ConnectionInspectorProps = {
  edge: CanvasEdgeViewModel | null
  rules: FlowRuleViewModel[]
  onSubmit(input: UpdateProcessConnectionInput): Promise<void>
  onDelete(connectionId: string): Promise<void>
  onOpenRuleBuilder(target: RuleTargetInput): void
}
```

### Mutation hook 계약

범용 만능 wrapper보다 feature 단위 hook을 사용한다.

권장 hook:

- `useCreateProcess`
- `useUpdateProcess`
- `useDeleteProcess`
- `useCreateProcessIo`
- `useUpdateProcessIo`
- `useDeleteProcessIo`
- `useCreateProcessConnection`
- `useUpdateProcessConnection`
- `useDeleteProcessConnection`

### Hook 책임

각 mutation hook이 책임져야 할 것:

- 요청 payload 생성
- optimistic update 정책
- rollback 동작
- query invalidation 범위
- error mapping

각 mutation hook이 책임지면 안 되는 것:

- 전역 selection 로직
- 컴포넌트 로컬 open, close 상태
- API payload와 무관한 form formatting

### Request input 계약

프론트 mutation input 타입은 DTO와 달라도 된다.

예:

```ts
type UpdateProcessPositionInput = {
  processId: string
  x: number
  y: number
}
```

이 값은 다음처럼 직렬화될 수 있다.

```ts
{
  posX: x,
  posY: y
}
```

이 분리는 유용하며 유지해야 한다.

### REST 네이밍 원칙

mutation hook도 REST 리소스 경계를 유지해야 한다.

좋은 예:

- `updateProcess`
- `createProcessIo`
- `deleteProcessConnection`

피해야 할 예:

- `saveCanvasEverything`
- `syncWorkspaceState`
- `submitProcessGraphBlob`

### Query 소유권

권장 소유권:

- `useWorkflowCanvasQuery(workflowId)`가 `WorkflowCanvasViewModel`을 반환
- leaf component는 독립 화면이 아닌 한 직접 fetch하지 않는다

이렇게 해야 워크스페이스 그래프를 일관되게 유지할 수 있다.

### Error 계약

mutation hook은 백엔드 에러를 UI 안전 객체로 정규화해야 한다.

권장 형태:

```ts
type UiError = {
  code: string
  message: string
  field?: string
}
```

컴포넌트는 raw Axios 또는 fetch 에러가 아니라 정규화된 UI 에러를 렌더링해야 한다.

### 최소 파일 레이아웃

권장 프론트 파일 구조:

```text
entities/workflow/model/toWorkflowCanvasViewModel.ts
entities/workflow/model/types.ts
features/process-edit/model/useUpdateProcess.ts
features/process-io-edit/model/useCreateProcessIo.ts
features/connection-edit/model/useCreateProcessConnection.ts
pages/workspace/ui/WorkflowCanvasPage.tsx
pages/workspace/ui/CanvasViewport.tsx
pages/workspace/ui/CanvasNode.tsx
pages/workspace/ui/CanvasEdge.tsx
pages/workspace/ui/NodeInspector.tsx
pages/workspace/ui/ConnectionInspector.tsx
```

### 비목표

- 하나의 거대한 workspace service 파일
- 모든 컴포넌트에서 DTO 직접 사용
- 컴포넌트 레벨 fetch 중복
- 암묵적인 mutation side effect

### 다음 문서

다음으로 유용한 문서는 다음이다.

`workspace_rest_api_playbook`

그 문서에는 다음이 들어가야 한다.

- 정확한 request, response 예시
- query invalidation 표
- optimistic update matrix
- error handling matrix
