# Project Workspace Screen Specification

## English

### Purpose

This document defines the MVP specification for the main FlowMat workspace screen.

This screen is the center of the product. It is not a CRUD dashboard. It is a visual design tool for building flow systems.

The intended product direction is:

- Figma-level canvas interaction
- node shapes with editable input and output structure
- executable flow semantics behind the shapes

In short:

- Figma for flow systems
- plus inputs, outputs, rules, resources, and run context

### Core Hierarchy

The frontend should treat the product model like this:

```text
Project
  -> collection of workflow groups and workflow pages
  -> contains multiple workflows

Workflow
  -> collection of shapes and lines
  -> one editable canvas page

Node
  -> one shape on the canvas
  -> contains editable inputs and outputs

Connection
  -> one line between nodes or node I/O points
```

This hierarchy should be visible in the UI, not hidden only in data models.

### Route

```text
/projects/:projectId/workflows/:workflowId
```

### Backend Dependencies

The workspace depends on these APIs:

- `GET /api/workflows/{workflowId}`
- `GET /api/workflows/{workflowId}/canvas`
- `GET /api/processes?workflowId=...`
- `POST /api/processes`
- `PUT /api/processes/{processId}`
- `DELETE /api/processes/{processId}`
- `GET /api/process-ios?processId=...`
- `POST /api/process-ios`
- `PUT /api/process-ios/{processIoId}`
- `DELETE /api/process-ios/{processIoId}`
- `GET /api/process-connections?workflowId=...`
- `POST /api/process-connections`
- `PUT /api/process-connections/{connectionId}`
- `DELETE /api/process-connections/{connectionId}`
- `GET /api/process-templates`
- `POST /api/process-templates/{templateId}/apply`
- `GET /api/flow-rules?projectId=...`
- `GET /api/flow-rules?targetType=...&targetId=...`
- `POST /api/flow-rules`
- `PUT /api/flow-rules/{ruleId}`
- `DELETE /api/flow-rules/{ruleId}`

Color-related backend support now exists in the MVP model:

- `process.colorScheme`
- `process_template.defaultColorScheme`
- `process_io.colorScheme`
- process template apply request color override

### Screen Layout

Use a four-region layout:

```text
+---------------------------------------------------------------+
| Top Bar                                                       |
+---------------+-----------------------------+-----------------+
| Left Panel    | Center Canvas               | Right Panel     |
| Template      | Workflow Graph              | Inspector       |
| Palette       |                             | Rules           |
+---------------+-----------------------------+-----------------+
```

The center canvas must visually dominate the screen.

The product should feel like a design tool first, with domain-aware editing panels around it.

### Top Bar

The top bar should contain:

- project name
- workflow name
- workflow switcher
- zoom controls
- fit-to-screen
- save status
- selection summary
- quick actions

Quick actions for MVP:

- create node
- apply process template
- open rules panel
- refresh canvas
- inline rename selected node
- open node color editor
- create workflow page

### Left Panel: Template Palette

The left panel is for insertion and acceleration.

Sections:

- Process Templates
- Recently Used Templates
- Quick Node Types

Each template item should show:

- icon
- name
- category
- node type
- default color

MVP behavior:

- click to apply template
- optionally choose placement after apply

Drag and drop can come later, but the visual language should already resemble a proper design palette.

### Center Canvas

The center canvas is the main graph editor.

Render model:

- `process` as node
- `process_connection` as edge
- `process_io` as structured content inside a node

Use React Flow for the graph layer, but the interaction language should intentionally feel closer to Figma than to a basic admin graph tool.

Required MVP interactions:

- pan
- zoom
- click select
- marquee select
- move node
- connect node
- double click rename
- keyboard delete
- escape to clear selection
- recolor node
- edit node I/O

### Canvas Feel

The canvas should feel like visual authoring, not form entry.

Recommended traits:

- subtle grid background
- strong selection affordances
- clear hover states
- clear insertion points
- minimal modal interruption
- contextual quick actions near selected node

### Node Visual Model

Each node should show:

- node name
- node color
- node type
- process type
- status marker
- input count
- output count

Each node must support create, update, and delete for:

- node name
- node color
- input rows
- output rows

Node color is part of the workflow language, not cosmetic decoration.

### Node Internal Structure

Each node should behave like a smart shape.

Recommended internal layout:

```text
+-----------------------------------+
| Node Header                       |
| name + color + type               |
+-----------------------------------+
| Inputs                            |
| - input A                         |
| - input B                         |
+-----------------------------------+
| Outputs                           |
| - output A                        |
| - output B                        |
+-----------------------------------+
```

Important rule:

- inputs and outputs live inside the node model
- they are editable in the inspector
- they are partially visible on the shape itself

This is where the product should feel more powerful than Figma:

- Figma gives generic shapes
- FlowMat gives shapes with operational input and output meaning

### Node Header Editing

The node header should allow:

- inline rename
- color chip preview
- color picker trigger
- node type badge

Color editing for MVP:

- preset palette
- custom hex input in the frontend
- mapped persistence to backend `colorScheme`

Optional secondary metadata:

- width and height handle
- rule badge
- warning badge

### Edge Visual Model

Each edge should show:

- connection label when present
- connection type
- optional flow rate and unit

Edges should be selectable and editable from the inspector.

### Right Panel: Inspector

The right panel changes by selection state.

Modes:

1. nothing selected
2. node selected
3. connection selected
4. multi-select
5. rule mode

#### Empty State

Show:

- workflow summary
- node count
- connection count
- shortcut hints

#### Node Selected

Show tabs:

- General
- I/O
- Rules

General tab fields:

- process name
- process color
- process type
- node type
- status
- position
- width
- height
- description

I/O tab:

- input list
- output list
- add I/O
- edit I/O
- delete I/O

Each I/O row should show:

- name
- direction
- type
- quantity
- unit
- formula
- color chip
- required flag
- shortage policy

Recommended MVP color defaults:

- input rows: `sky`
- output rows: `emerald`

Rules tab:

- rules targeted to `process`
- rules targeted to `process_io` when an I/O row is active
- create rule action

#### Connection Selected

Show:

- connection label
- connection type
- from process
- to process
- from I/O
- to I/O
- flow rate
- unit
- delay
- loss rate
- priority

Also show connection-targeted rules.

### Primary User Flows

#### Flow 1: Open Workspace

1. User opens the project workflow route.
2. App loads workflow detail.
3. App loads workflow canvas.
4. Canvas renders nodes and edges.
5. Inspector shows workflow summary.

#### Flow 2: Create Node

1. User clicks create node or apply template.
2. Create drawer or modal opens.
3. User fills fields including name, type, and color.
4. Frontend calls `POST /api/processes`.
5. Canvas data refreshes.
6. New node becomes selected.

#### Flow 3: Edit Node

1. User selects a node.
2. Inspector opens the general tab.
3. User edits fields.
4. Frontend calls `PUT /api/processes/{processId}`.
5. Canvas refreshes.

This flow must include:

- rename node
- change node color
- resize node
- edit description

#### Flow 4: Add Node I/O

1. User selects a node.
2. User opens the I/O tab.
3. User adds input or output.
4. Frontend calls `POST /api/process-ios`.
5. Node summary and visible rows update immediately.

#### Flow 5: Create Connection

1. User drags a connector between nodes.
2. Frontend opens a lightweight connection form.
3. User chooses connection type and optional I/O binding.
4. Frontend calls `POST /api/process-connections`.
5. Canvas refreshes.

#### Flow 6: Add Rule

1. User selects a node or connection.
2. User opens the rules tab.
3. User creates a rule in a structured builder.
4. Frontend serializes the rule to backend fields.
5. Frontend calls `POST /api/flow-rules`.

### State Model

Recommended local store:

```text
workspaceStore
  selectedProcessId
  selectedConnectionId
  inspectorMode
  viewport
  panelWidths
  canvasMode
  pendingConnectionDraft
  isRuleDrawerOpen
  isTemplateDrawerOpen
  activeColorPickerNodeId
  inlineEditingNodeId
```

Keep server data in React Query, not in the canvas UI store.

### Non-Goals for MVP

- real-time collaboration
- version diffing
- undo and redo history engine
- advanced auto-routing
- custom scripting UI

### Next UI Document

The next useful UI document should be:

`rule_builder_component_specification`

That document should define:

- operand selection UX
- operator list
- backend serialization rules
- validation messages

---

## Korean Translation

### 목적

이 문서는 FlowMat 메인 워크스페이스 화면의 MVP 명세를 정의한다.

이 화면은 제품의 중심이다. 단순한 CRUD 대시보드가 아니라, 플로우 시스템을 설계하는 시각 도구여야 한다.

지향점은 다음과 같다.

- 피그마 수준의 캔버스 인터랙션
- 입력과 출력 구조를 가진 노드 도형
- 도형 뒤에 실행 의미가 연결된 플로우 모델

짧게 말하면:

- 플로우 시스템을 위한 Figma
- 그리고 input, output, rule, resource, run context까지 포함한 설계 도구

### 핵심 계층

프론트엔드는 제품 모델을 다음처럼 다뤄야 한다.

```text
Project
  -> workflow group과 workflow page의 모음
  -> 여러 workflow를 포함

Workflow
  -> 도형과 선의 모음
  -> 하나의 편집 가능한 캔버스 페이지

Node
  -> 캔버스 위의 하나의 도형
  -> 편집 가능한 inputs와 outputs를 내부에 포함

Connection
  -> 노드 또는 노드 I/O 지점 사이의 선
```

이 계층은 데이터 모델 안에만 있으면 안 되고, UI에서도 드러나야 한다.

### 라우트

```text
/projects/:projectId/workflows/:workflowId
```

### 백엔드 의존성

워크스페이스는 다음 API에 의존한다.

- `GET /api/workflows/{workflowId}`
- `GET /api/workflows/{workflowId}/canvas`
- `GET /api/processes?workflowId=...`
- `POST /api/processes`
- `PUT /api/processes/{processId}`
- `DELETE /api/processes/{processId}`
- `GET /api/process-ios?processId=...`
- `POST /api/process-ios`
- `PUT /api/process-ios/{processIoId}`
- `DELETE /api/process-ios/{processIoId}`
- `GET /api/process-connections?workflowId=...`
- `POST /api/process-connections`
- `PUT /api/process-connections/{connectionId}`
- `DELETE /api/process-connections/{connectionId}`
- `GET /api/process-templates`
- `POST /api/process-templates/{templateId}/apply`
- `GET /api/flow-rules?projectId=...`
- `GET /api/flow-rules?targetType=...&targetId=...`
- `POST /api/flow-rules`
- `PUT /api/flow-rules/{ruleId}`
- `DELETE /api/flow-rules/{ruleId}`

색상 관련 백엔드 지원은 현재 MVP 모델에 포함된다.

- `process.colorScheme`
- `process_template.defaultColorScheme`
- `process_io.colorScheme`
- process template apply 요청에서의 색상 override

### 화면 레이아웃

4개 영역 레이아웃을 사용한다.

```text
+---------------------------------------------------------------+
| Top Bar                                                       |
+---------------+-----------------------------+-----------------+
| Left Panel    | Center Canvas               | Right Panel     |
| Template      | Workflow Graph              | Inspector       |
| Palette       |                             | Rules           |
+---------------+-----------------------------+-----------------+
```

중앙 캔버스가 화면에서 시각적으로 가장 강해야 한다.

이 제품은 폼 중심 업무 화면이 아니라, 주위에 도메인 패널이 붙은 디자인 툴처럼 느껴져야 한다.

### 상단 바

상단 바에는 다음이 들어가야 한다.

- 프로젝트 이름
- 워크플로우 이름
- 워크플로우 전환기
- 줌 컨트롤
- 화면 맞춤
- 저장 상태
- 선택 요약
- 빠른 액션

MVP 빠른 액션:

- 노드 생성
- 프로세스 템플릿 적용
- 규칙 패널 열기
- 캔버스 새로고침
- 선택 노드 인라인 이름 변경
- 노드 색상 편집 열기
- 워크플로우 페이지 생성

### 좌측 패널: 템플릿 팔레트

좌측 패널은 삽입과 가속을 위한 영역이다.

섹션:

- Process Templates
- Recently Used Templates
- Quick Node Types

각 템플릿 항목은 다음을 보여야 한다.

- 아이콘
- 이름
- 카테고리
- 노드 타입
- 기본 색상

MVP 동작:

- 클릭해서 템플릿 적용
- 필요하면 적용 후 배치 위치 선택

드래그 앤 드롭은 나중에 추가해도 되지만, 시각 언어는 처음부터 제대로 된 디자인 툴 팔레트처럼 보여야 한다.

### 중앙 캔버스

중앙 캔버스는 메인 그래프 편집기다.

렌더링 모델:

- `process`는 노드
- `process_connection`은 엣지
- `process_io`는 별도 노드가 아니라 노드 내부 구조

그래프 렌더링은 React Flow를 쓰되, 인터랙션 언어는 기본 관리자형 그래프보다 Figma에 더 가까워야 한다.

필수 MVP 인터랙션:

- pan
- zoom
- 클릭 선택
- marquee 선택
- 노드 이동
- 노드 연결
- 더블 클릭 이름 변경
- 키보드 삭제
- escape 선택 해제
- 노드 색상 변경
- 노드 I/O 편집

### 캔버스 감성

캔버스는 폼 입력이 아니라 시각 설계처럼 느껴져야 한다.

권장 요소:

- 은은한 그리드 배경
- 강한 선택 표시
- 명확한 hover 상태
- 분명한 삽입 지점
- 모달 최소화
- 선택 노드 주변의 빠른 액션

### 노드 시각 모델

각 노드는 다음을 보여야 한다.

- 노드 이름
- 노드 색상
- 노드 타입
- 프로세스 타입
- 상태 마커
- 입력 개수
- 출력 개수

각 노드는 다음 항목에 대해 생성, 수정, 삭제를 지원해야 한다.

- 노드 이름
- 노드 색상
- input row
- output row

노드 색상은 장식이 아니라 워크플로우 언어의 일부다.

### 노드 내부 구조

각 노드는 의미를 가진 스마트 도형처럼 동작해야 한다.

권장 내부 레이아웃:

```text
+-----------------------------------+
| Node Header                       |
| name + color + type               |
+-----------------------------------+
| Inputs                            |
| - input A                         |
| - input B                         |
+-----------------------------------+
| Outputs                           |
| - output A                        |
| - output B                        |
+-----------------------------------+
```

중요 원칙:

- inputs와 outputs는 노드 모델 내부에 존재한다
- inspector에서 편집 가능해야 한다
- 도형 자체에도 일부가 보여야 한다

이 지점에서 제품이 Figma보다 더 강해져야 한다.

- Figma는 범용 도형을 준다
- FlowMat은 실행 의미를 가진 도형을 준다

### 노드 헤더 편집

노드 헤더는 다음을 허용해야 한다.

- 인라인 이름 변경
- 색상 칩 미리보기
- color picker 트리거
- node type 배지

MVP 색상 편집:

- preset palette
- 프론트엔드 custom hex 입력
- 백엔드 `colorScheme`에 영속화

선택적 보조 메타데이터:

- width, height 핸들
- rule badge
- warning badge

### 엣지 시각 모델

각 엣지는 다음을 보여야 한다.

- connection label이 있으면 표시
- connection type
- 선택적으로 flow rate와 unit

엣지는 선택 가능해야 하고 inspector에서 편집 가능해야 한다.

### 우측 패널: 인스펙터

우측 패널은 선택 상태에 따라 바뀐다.

모드:

1. 아무것도 선택 안 됨
2. 노드 선택
3. 연결 선택
4. 다중 선택
5. 규칙 모드

#### 비선택 상태

다음을 보여준다.

- 워크플로우 요약
- 노드 수
- 연결 수
- 단축키 힌트

#### 노드 선택 상태

탭:

- General
- I/O
- Rules

General 탭 필드:

- process name
- process color
- process type
- node type
- status
- position
- width
- height
- description

I/O 탭:

- input 목록
- output 목록
- I/O 추가
- I/O 수정
- I/O 삭제

각 I/O row는 다음을 보여야 한다.

- name
- direction
- type
- quantity
- unit
- formula
- color chip
- required flag
- shortage policy

권장 MVP 기본 색상:

- input row: `sky`
- output row: `emerald`

Rules 탭:

- `process` 대상 규칙
- 특정 I/O 활성 시 `process_io` 대상 규칙
- 규칙 생성 액션

#### 연결 선택 상태

다음을 보여준다.

- connection label
- connection type
- from process
- to process
- from I/O
- to I/O
- flow rate
- unit
- delay
- loss rate
- priority

그리고 connection 대상 규칙도 같이 보여준다.

### 주요 사용자 흐름

#### 흐름 1: 워크스페이스 열기

1. 사용자가 프로젝트 워크플로우 라우트를 연다.
2. 앱이 워크플로우 상세를 불러온다.
3. 앱이 워크플로우 캔버스를 불러온다.
4. 캔버스가 노드와 엣지를 렌더링한다.
5. 인스펙터가 워크플로우 요약을 보여준다.

#### 흐름 2: 노드 생성

1. 사용자가 노드 생성 또는 템플릿 적용을 누른다.
2. 생성 drawer 또는 modal이 열린다.
3. 사용자가 이름, 타입, 색상을 포함한 필드를 입력한다.
4. 프론트엔드가 `POST /api/processes`를 호출한다.
5. 캔버스 데이터가 갱신된다.
6. 새 노드가 선택된다.

#### 흐름 3: 노드 수정

1. 사용자가 노드를 선택한다.
2. 인스펙터 General 탭이 열린다.
3. 사용자가 필드를 수정한다.
4. 프론트엔드가 `PUT /api/processes/{processId}`를 호출한다.
5. 캔버스가 갱신된다.

이 흐름에는 반드시 다음이 포함된다.

- 노드 이름 변경
- 노드 색상 변경
- 노드 크기 변경
- 설명 수정

#### 흐름 4: 노드 I/O 추가

1. 사용자가 노드를 선택한다.
2. I/O 탭을 연다.
3. input 또는 output을 추가한다.
4. 프론트엔드가 `POST /api/process-ios`를 호출한다.
5. 노드 요약과 표시 row가 즉시 갱신된다.

#### 흐름 5: 연결 생성

1. 사용자가 노드 사이를 연결 드래그한다.
2. 프론트엔드가 가벼운 연결 입력 폼을 연다.
3. 사용자가 연결 타입과 필요 시 I/O 바인딩을 고른다.
4. 프론트엔드가 `POST /api/process-connections`를 호출한다.
5. 캔버스가 갱신된다.

#### 흐름 6: 규칙 추가

1. 사용자가 노드 또는 연결을 선택한다.
2. Rules 탭을 연다.
3. 구조화된 builder로 규칙을 만든다.
4. 프론트엔드가 규칙을 백엔드 필드로 직렬화한다.
5. 프론트엔드가 `POST /api/flow-rules`를 호출한다.

### 상태 모델

권장 로컬 스토어:

```text
workspaceStore
  selectedProcessId
  selectedConnectionId
  inspectorMode
  viewport
  panelWidths
  canvasMode
  pendingConnectionDraft
  isRuleDrawerOpen
  isTemplateDrawerOpen
  activeColorPickerNodeId
  inlineEditingNodeId
```

서버 데이터는 캔버스 UI 스토어가 아니라 React Query에 둔다.

### MVP 비목표

- 실시간 협업
- 버전 diff
- undo, redo 히스토리 엔진
- 고급 자동 라우팅
- 커스텀 스크립팅 UI

### 다음 UI 문서

다음으로 작성할 가치가 큰 UI 문서는 다음이다.

`rule_builder_component_specification`

그 문서에는 다음이 들어가야 한다.

- operand 선택 UX
- operator 목록
- 백엔드 직렬화 규칙
- 검증 메시지
