# FlowMat Frontend MVP Architecture

## English

### Goal

Design the frontend around the current backend MVP.

The backend already exposes these core domains:

- project
- workflow
- process
- process_io
- process_connection
- item
- inventory
- production_run
- run_state_snapshot
- process_template
- workflow_template
- flow_rule

The frontend should mirror these domains directly instead of hiding them behind vague abstractions.

### Recommended Stack

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- React Flow

### Architectural Principle

The frontend should be a RESTful React client.

That means:

- React is the application shell and interaction layer
- backend communication stays resource-oriented and HTTP-based
- TanStack Query manages REST reads, caching, invalidation, and mutation lifecycle
- the frontend consumes backend domain endpoints directly

Do not introduce these patterns in the MVP:

- GraphQL
- frontend-specific BFF abstraction before there is a proven need
- RPC-style API naming that hides resource boundaries
- oversized client domain layers that diverge from backend entities

### Route Structure

```text
/projects
/projects/:projectId
/projects/:projectId/workflows/:workflowId
/projects/:projectId/inventory
/projects/:projectId/runs
/projects/:projectId/runs/:runId
/projects/:projectId/templates
/projects/:projectId/rules
```

### Module Structure

```text
src/
  app/
    router/
    providers/
    layout/
  shared/
    api/
    lib/
    ui/
    forms/
    types/
  entities/
    project/
    workflow/
    process/
    inventory/
    run/
    template/
    rule/
  features/
    workflow-create/
    process-edit/
    connection-edit/
    inventory-adjust/
    run-start/
    run-record-item/
    rule-edit/
    template-apply/
  pages/
    projects/
    workspace/
    inventory/
    runs/
    templates/
    rules/
```

### State Boundaries

Use three layers of state.

1. Server state
- Managed by TanStack Query
- Projects, workflows, canvas payload, inventory, runs, templates, rules

2. Local editor state
- Managed by Zustand
- Selected node, selected edge, viewport, panel mode, connection draft, inline rename state

3. Form state
- Managed by React Hook Form
- Project, workflow, inventory, run, template, rule forms

### Canvas Architecture

The main editing surface should be the workflow workspace.

Recommended layout:

- left: template palette
- center: workflow canvas
- right: inspector panel
- top: toolbar

Canvas components:

- `WorkflowCanvasPage`
- `CanvasToolbar`
- `CanvasViewport`
- `TemplatePalette`
- `NodeInspector`
- `ConnectionInspector`
- `RuleDrawer`

Data flow:

1. Load normalized canvas data from backend.
2. Convert it into React Flow nodes and edges.
3. Keep drag, selection, and connection draft state locally.
4. Persist through explicit API commands.

Do not rely on a single `canvasSnapshot` blob for MVP editing.

### API Layer

Create one API module per backend domain.

```text
projectApi.ts
workflowApi.ts
processApi.ts
processIoApi.ts
processConnectionApi.ts
inventoryApi.ts
runApi.ts
templateApi.ts
ruleApi.ts
```

Query keys should stay stable.

```text
['projects']
['project', projectId]
['workflows', projectId]
['workflow', workflowId]
['workflow-canvas', workflowId]
['inventory', projectId]
['runs', workflowId]
['run', runId]
['run-items', runId]
['process-templates']
['workflow-templates']
['flow-rules', projectId, targetType, targetId]
```

### Canvas Data Contract

The frontend should treat these backend fields as primary canvas identifiers:

- node id: `processId`
- edge id: `connectionId`
- source handle: `sourceHandle`
- target handle: `targetHandle`
- node color: `colorScheme`
- I/O row color: `processIo.colorScheme`

This is important for:

- reconnect behavior
- stable React Flow handle ids
- port-level selection
- inline I/O rendering

### Rule UI

The backend rule engine currently supports simple expressions.

Examples:

```text
inventory.quantity >= 0
processIo.direction == "input"
connection.flowRate <= 100
```

The frontend should not force users to write raw expressions first.

Use a structured rule builder:

- target type
- target id
- left operand
- operator
- right operand
- action type
- message

Then serialize to backend fields.

### Template UI

Templates need two modes.

1. Library mode
- Browse workflow templates
- Browse process templates
- Filter by category and domain

2. Apply mode
- Apply workflow template into a project
- Apply process template into a workflow

### MVP Screen Priority

Build in this order:

1. project list and project create
2. workflow list and workflow create
3. workflow canvas with process and connection editing
4. item and inventory page
5. run start, run item record, run finish
6. template library and apply
7. rule builder and rule list

### What Not To Do Yet

- no generic low-code rule language UI
- no collaborative editing first
- no heavy design-system work before canvas stability
- no abstract frontend model that hides backend entities

### Next Frontend Document

The next document should be:

`canvas_component_contracts`

It should define:

- React props between canvas, node, edge, and inspector layers
- DTO-to-view-model conversion rules
- mutation hook boundaries

---

## Korean Translation

### 목표

현재 백엔드 MVP를 기준으로 프론트엔드 구조를 설계한다.

백엔드는 이미 다음 핵심 도메인을 제공한다.

- project
- workflow
- process
- process_io
- process_connection
- item
- inventory
- production_run
- run_state_snapshot
- process_template
- workflow_template
- flow_rule

프론트엔드는 이 도메인들을 모호한 추상화 뒤에 숨기지 말고 직접 반영해야 한다.

### 권장 스택

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- React Flow

### 아키텍처 원칙

프론트엔드는 RESTful React client여야 한다.

의미는 다음과 같다.

- React가 애플리케이션 셸과 인터랙션 레이어를 맡는다
- 백엔드 통신은 resource-oriented HTTP 구조를 유지한다
- TanStack Query가 REST 조회, 캐시, 무효화, mutation lifecycle을 관리한다
- 프론트엔드는 백엔드 도메인 endpoint를 직접 소비한다

MVP에서 도입하지 말 것:

- GraphQL
- 검증된 필요가 생기기 전의 프론트 전용 BFF 추상화
- 리소스 경계를 숨기는 RPC 스타일 API 네이밍
- 백엔드 엔티티와 어긋나는 과도한 클라이언트 도메인 레이어

### 라우트 구조

```text
/projects
/projects/:projectId
/projects/:projectId/workflows/:workflowId
/projects/:projectId/inventory
/projects/:projectId/runs
/projects/:projectId/runs/:runId
/projects/:projectId/templates
/projects/:projectId/rules
```

### 모듈 구조

```text
src/
  app/
    router/
    providers/
    layout/
  shared/
    api/
    lib/
    ui/
    forms/
    types/
  entities/
    project/
    workflow/
    process/
    inventory/
    run/
    template/
    rule/
  features/
    workflow-create/
    process-edit/
    connection-edit/
    inventory-adjust/
    run-start/
    run-record-item/
    rule-edit/
    template-apply/
  pages/
    projects/
    workspace/
    inventory/
    runs/
    templates/
    rules/
```

### 상태 경계

상태는 세 층으로 나눈다.

1. 서버 상태
- TanStack Query 관리
- 프로젝트, 워크플로우, 캔버스 payload, 재고, 실행, 템플릿, 규칙

2. 로컬 에디터 상태
- Zustand 관리
- 선택 노드, 선택 엣지, viewport, 패널 모드, 연결 draft, 인라인 이름 변경 상태

3. 폼 상태
- React Hook Form 관리
- 프로젝트, 워크플로우, 재고, 실행, 템플릿, 규칙 폼

### 캔버스 아키텍처

메인 편집 화면은 워크플로우 워크스페이스여야 한다.

권장 레이아웃:

- 좌측: 템플릿 팔레트
- 중앙: 워크플로우 캔버스
- 우측: 인스펙터 패널
- 상단: 툴바

캔버스 컴포넌트:

- `WorkflowCanvasPage`
- `CanvasToolbar`
- `CanvasViewport`
- `TemplatePalette`
- `NodeInspector`
- `ConnectionInspector`
- `RuleDrawer`

데이터 흐름:

1. 백엔드에서 정규화된 캔버스 데이터를 불러온다.
2. 이를 React Flow 노드와 엣지로 변환한다.
3. 드래그, 선택, 연결 draft 상태는 로컬에서 유지한다.
4. 변경은 명시적 API 호출로 저장한다.

MVP 편집은 하나의 `canvasSnapshot` blob에 의존하면 안 된다.

### API 계층

백엔드 도메인별로 API 모듈을 나눈다.

```text
projectApi.ts
workflowApi.ts
processApi.ts
processIoApi.ts
processConnectionApi.ts
inventoryApi.ts
runApi.ts
templateApi.ts
ruleApi.ts
```

Query key는 안정적으로 유지해야 한다.

```text
['projects']
['project', projectId]
['workflows', projectId]
['workflow', workflowId]
['workflow-canvas', workflowId]
['inventory', projectId]
['runs', workflowId]
['run', runId]
['run-items', runId]
['process-templates']
['workflow-templates']
['flow-rules', projectId, targetType, targetId]
```

### 캔버스 데이터 계약

프론트엔드는 다음 백엔드 필드를 기본 캔버스 식별자로 취급해야 한다.

- node id: `processId`
- edge id: `connectionId`
- source handle: `sourceHandle`
- target handle: `targetHandle`
- node color: `colorScheme`
- I/O row color: `processIo.colorScheme`

이 값들은 다음에 직접 중요하다.

- reconnect 동작
- 안정적인 React Flow handle id
- 포트 단위 선택
- 인라인 I/O 렌더링

### 규칙 UI

백엔드 규칙 엔진은 현재 단순 expression을 지원한다.

예:

```text
inventory.quantity >= 0
processIo.direction == "input"
connection.flowRate <= 100
```

프론트엔드는 사용자가 처음부터 raw expression을 직접 쓰게 만들지 않는 편이 맞다.

구조화된 rule builder를 사용한다.

- target type
- target id
- left operand
- operator
- right operand
- action type
- message

그 후 백엔드 필드로 직렬화한다.

### 템플릿 UI

템플릿에는 두 가지 모드가 필요하다.

1. 라이브러리 모드
- workflow template 탐색
- process template 탐색
- category와 domain 기준 필터

2. 적용 모드
- workflow template을 project에 적용
- process template을 workflow에 적용

### MVP 화면 우선순위

다음 순서로 만든다.

1. 프로젝트 목록과 프로젝트 생성
2. 워크플로우 목록과 워크플로우 생성
3. process와 connection 편집이 되는 워크플로우 캔버스
4. item과 inventory 화면
5. run 시작, run item 기록, run 종료
6. 템플릿 라이브러리와 적용
7. rule builder와 rule 목록

### 아직 하지 말 것

- 범용 로우코드 규칙 언어 UI
- 협업 편집 우선 구현
- 캔버스 안정화 전 과도한 디자인 시스템 작업
- 백엔드 엔티티를 숨기는 추상 프론트 모델

### 다음 프론트 문서

다음 문서는 다음이 맞다.

`canvas_component_contracts`

그 문서에는 다음이 들어가야 한다.

- canvas, node, edge, inspector 사이의 React props 계약
- DTO에서 view model로 변환하는 규칙
- mutation hook 경계
