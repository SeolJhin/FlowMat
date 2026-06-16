# FlowMat Frontend MVP Architecture

## English

### Goal

Design the frontend around the current backend MVP.

The backend already provides these core domains:

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

The frontend should mirror those domains directly instead of hiding them behind vague abstractions.

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
- Selected node, selected edge, viewport, panel mode, unsaved drag state

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

Data flow:

1. Load normalized canvas data from backend
2. Convert it into React Flow nodes and edges
3. Keep drag/select state locally
4. Persist through explicit API commands

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

### Rule UI

The backend rule engine currently supports simple expressions such as:

```text
inventory.availableQuantity < requestQuantity
request.direction == input
run.runType == actual
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

`project workspace screen specification`

It should define:

- canvas layout
- inspector layout
- template palette behavior
- rule entry points
- save/update command flow

---

## 한국어 번역

### 목표

현재 백엔드 MVP를 기준으로 프론트엔드 구조를 설계한다.

백엔드는 이미 아래 핵심 도메인을 제공한다.

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

프론트엔드는 이 도메인들을 직접 반영해야 하며, 애매한 추상화로 숨기지 않는 편이 맞다.

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

### 상태 분리

상태는 세 층으로 나눈다.

1. 서버 상태
- TanStack Query 담당
- 프로젝트, 워크플로우, 캔버스 데이터, 재고, 런, 템플릿, 규칙

2. 로컬 에디터 상태
- Zustand 담당
- 선택된 노드, 선택된 엣지, 뷰포트, 패널 모드, 저장 전 드래그 상태

3. 폼 상태
- React Hook Form 담당
- 프로젝트, 워크플로우, 재고, 런, 템플릿, 규칙 폼

### 캔버스 아키텍처

주 편집 화면은 워크플로우 작업 공간이어야 한다.

권장 레이아웃:

- 왼쪽: 템플릿 팔레트
- 중앙: 워크플로우 캔버스
- 오른쪽: 인스펙터 패널
- 상단: 툴바

주요 컴포넌트:

- `WorkflowCanvasPage`
- `CanvasToolbar`
- `CanvasViewport`
- `TemplatePalette`
- `NodeInspector`
- `ConnectionInspector`

데이터 흐름:

1. 백엔드에서 정규화된 캔버스 데이터를 조회
2. 이를 React Flow 노드/엣지로 변환
3. 드래그/선택 상태는 로컬에서 관리
4. 저장은 명시적 API 호출로 수행

MVP에서는 하나의 `canvasSnapshot` 블롭만 믿고 편집하면 안 된다.

### API 계층

백엔드 도메인별로 API 모듈을 분리한다.

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

쿼리 키는 안정적으로 유지한다.

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

### 규칙 UI

현재 백엔드 rule engine은 아래 같은 단순 비교식을 지원한다.

```text
inventory.availableQuantity < requestQuantity
request.direction == input
run.runType == actual
```

프론트엔드는 사용자가 처음부터 이런 문자열을 직접 입력하게 만들지 않는 편이 낫다.

구조화된 rule builder를 둔다.

- target type
- target id
- left operand
- operator
- right operand
- action type
- message

그리고 이를 백엔드 필드로 직렬화한다.

### 템플릿 UI

템플릿은 두 모드가 필요하다.

1. 라이브러리 모드
- workflow template 탐색
- process template 탐색
- 카테고리/도메인 필터

2. 적용 모드
- workflow template을 project에 적용
- process template을 workflow에 적용

### MVP 화면 우선순위

다음 순서로 만든다.

1. 프로젝트 목록과 프로젝트 생성
2. 워크플로우 목록과 워크플로우 생성
3. 워크플로우 캔버스와 process/connection 편집
4. item 및 inventory 화면
5. run 시작, run item 기록, run 종료
6. 템플릿 라이브러리와 적용
7. rule builder와 rule 목록

### 아직 하지 말 것

- 범용 로우코드 rule 언어 UI
- 협업 편집 선구현
- 캔버스가 안정되기 전 과도한 디자인 시스템 작업
- 백엔드 엔티티를 숨기는 추상적 프론트 모델

### 다음 프론트 문서

다음 문서는 아래가 맞다.

`project workspace screen specification`

이 문서에는 다음이 들어가야 한다.

- 캔버스 레이아웃
- 인스펙터 레이아웃
- 템플릿 팔레트 동작
- rule 진입점
- 저장/수정 커맨드 흐름
