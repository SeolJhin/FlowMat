# Workspace Implementation Sequence

## English

### Purpose

This document defines the exact frontend implementation order for the MVP workspace.

It answers:

- what to build first
- what depends on what
- what can stay stubbed temporarily
- what should be verified against the live REST API first

This sequence assumes a RESTful React client and the document stack already defined in:

- `frontend_mvp_architecture`
- `workflow_canvas_state_machine`
- `canvas_component_contracts`
- `workspace_rest_api_playbook`

### Delivery Principle

Build vertically, not horizontally.

That means:

- do not finish every API hook before any UI exists
- do not finish every UI shell before any real data flows
- instead, complete one thin end-to-end slice at a time

Each slice should include:

- query or mutation hook
- minimal view model mapping
- visible UI
- live API verification

### Phase 0: Project Skeleton

Goal:

- create the frontend shell with the correct architecture before workspace features begin

Build:

- Vite React TypeScript app
- router structure
- TanStack Query provider
- Zustand store skeleton
- shared API client
- shared error normalization
- shared layout shell

Files to create first:

```text
src/app/providers/QueryProvider.tsx
src/app/router/index.tsx
src/shared/api/httpClient.ts
src/shared/api/unwrapApiResponse.ts
src/shared/lib/normalizeUiError.ts
src/shared/types/api.ts
src/pages/workspace/ui/WorkspaceRoute.tsx
```

Can stay stubbed:

- actual workspace rendering
- rule drawer
- template palette content

Exit criteria:

- app boots
- router works
- API client can call one backend endpoint

### Phase 1: Workflow Canvas Read Path

Goal:

- render the live workflow canvas from backend REST data

Build:

- `useWorkflowCanvasQuery(workflowId)`
- `toWorkflowCanvasViewModel`
- `WorkflowCanvasPage`
- `CanvasViewport`
- minimal `CanvasNode`
- minimal `CanvasEdge`

Required backend endpoint:

- `GET /api/workflows/{workflowId}/canvas`

Dependency order:

1. DTO types
2. view model mapper
3. query hook
4. page shell
5. viewport
6. node and edge rendering

Can stay stubbed:

- inspector editing
- node rename
- connection creation
- rules

Live API checkpoint:

- page shows nodes at correct positions
- node color renders from `colorScheme`
- I/O rows appear grouped under node
- edges connect using `sourceHandle` and `targetHandle`

Exit criteria:

- one real workflow canvas loads without mock data

### Phase 2: Selection and Inspector Read Path

Goal:

- make the canvas inspectable

Build:

- selection store
- derived inspector state
- `NodeInspector`
- `ConnectionInspector`
- selected I/O row handling

Dependency order:

1. selection state
2. derived selectors
3. inspector shell
4. node detail rendering
5. connection detail rendering

Can stay stubbed:

- inspector submit actions
- rule editing actions

Live API checkpoint:

- clicking node opens node inspector
- clicking I/O row opens process I/O context
- clicking edge opens connection inspector

Exit criteria:

- every visible object on canvas is inspectable

### Phase 3: Node Edit Slice

Goal:

- complete the first end-to-end write slice for nodes

Build:

- `useUpdateProcess`
- `useCreateProcess`
- `useDeleteProcess`
- node create dialog or drawer
- node general tab submit
- node delete action
- inline rename start and submit
- color change submit

Required endpoints:

- `POST /api/processes`
- `PUT /api/processes/{processId}`
- `DELETE /api/processes/{processId}`

Optimistic policy:

- rename: yes
- color change: yes
- move: yes
- create: no
- delete: no

Live API checkpoint:

- create node and see it after canvas refetch
- rename node and see optimistic patch
- recolor node and see optimistic patch
- delete node and confirm graph refresh

Exit criteria:

- node lifecycle is fully usable without mocks

### Phase 4: Node I/O Edit Slice

Goal:

- make node internal inputs and outputs editable

Build:

- `useCreateProcessIo`
- `useUpdateProcessIo`
- `useDeleteProcessIo`
- I/O list in inspector
- I/O create form
- I/O edit form
- I/O delete action

Required endpoints:

- `POST /api/process-ios`
- `PUT /api/process-ios/{processIoId}`
- `DELETE /api/process-ios/{processIoId}`

Special rules:

- `processIo.colorScheme` must render
- `processIoId` must be used as stable handle id
- quantity values should be normalized for form input

Can stay stubbed:

- drag reorder of rows
- advanced formula helpers

Live API checkpoint:

- create input row and see it appear in node body
- create output row and see handle become connectable
- edit color and quantity, then verify canvas refresh

Exit criteria:

- node internals are editable and visible

### Phase 5: Connection Create and Edit Slice

Goal:

- make the graph structurally editable

Build:

- connection draft state
- React Flow connect handlers
- `useCreateProcessConnection`
- `useUpdateProcessConnection`
- `useDeleteProcessConnection`
- connection confirm popover or lightweight drawer

Required endpoints:

- `POST /api/process-connections`
- `PUT /api/process-connections/{connectionId}`
- `DELETE /api/process-connections/{connectionId}`

Critical contract:

- preserve `sourceHandle`
- preserve `targetHandle`
- preserve `fromIoId`
- preserve `toIoId`

No optimistic create in MVP.

Live API checkpoint:

- connect default node handles
- connect specific I/O rows
- reload canvas and verify edge still attaches to the same handles

Exit criteria:

- graph topology editing works with live API

### Phase 6: Rule Read and Create Slice

Goal:

- attach backend rule capability to the workspace

Build:

- `useFlowRulesQuery`
- `useCreateFlowRule`
- `useUpdateFlowRule`
- `useDeleteFlowRule`
- `RuleDrawer`
- rule list in inspector

Required endpoints:

- `GET /api/flow-rules`
- `POST /api/flow-rules`
- `PUT /api/flow-rules/{ruleId}`
- `DELETE /api/flow-rules/{ruleId}`

No optimistic create in MVP.

Live API checkpoint:

- create process rule
- create process I/O rule
- create connection rule
- verify `400` error stays in drawer with message shown

Exit criteria:

- rule creation and edit works for all workspace targets

### Phase 7: Template Apply Slice

Goal:

- speed up canvas authoring with templates

Build:

- process template query
- template palette
- template apply action

Required endpoints:

- `GET /api/process-templates`
- `POST /api/process-templates/{templateId}/apply`

Can stay stubbed:

- recently used templates
- drag-and-drop template placement

Live API checkpoint:

- template list loads from backend
- clicking template creates node with correct default color and size

Exit criteria:

- template-driven node insertion works

### Recommended File Build Order

Create files in this order:

```text
1. shared/api/httpClient.ts
2. shared/api/unwrapApiResponse.ts
3. shared/lib/normalizeUiError.ts
4. entities/workflow/model/types.ts
5. entities/workflow/model/toWorkflowCanvasViewModel.ts
6. entities/workflow/api/useWorkflowCanvasQuery.ts
7. pages/workspace/ui/WorkflowCanvasPage.tsx
8. pages/workspace/ui/CanvasViewport.tsx
9. pages/workspace/ui/CanvasNode.tsx
10. pages/workspace/ui/CanvasEdge.tsx
11. pages/workspace/model/workspaceStore.ts
12. pages/workspace/ui/NodeInspector.tsx
13. pages/workspace/ui/ConnectionInspector.tsx
14. features/process-edit/model/*.ts
15. features/process-io-edit/model/*.ts
16. features/connection-edit/model/*.ts
17. features/rule-edit/model/*.ts
18. pages/workspace/ui/RuleDrawer.tsx
19. pages/workspace/ui/TemplatePalette.tsx
```

### Stub Strategy

Use temporary stubs only for boundaries that are not yet under test.

Good stubs:

- static inspector empty state
- local template palette shell
- placeholder rule drawer chrome

Bad stubs:

- fake canvas graph after REST query exists
- fake DTO contracts
- fake handle ids

### Verification Order

Verify in this order:

1. canvas fetch
2. node selection
3. node update
4. I/O update
5. connection create
6. rule create failure handling
7. template apply

Why:

- this order follows dependency depth
- later features depend on earlier data contracts being stable

### Definition of MVP-Done for Workspace

The workspace MVP is done when:

- one real workflow loads from REST
- nodes render with color and I/O rows
- node create, update, delete works
- I/O create, update, delete works
- connection create, update, delete works
- rules can be created and edited
- templates can insert nodes
- common failures are shown as stable UI errors

### What Not To Parallelize Too Early

Avoid building these in parallel too early:

- rule builder and connection editor
- template apply and node create modal redesign
- advanced canvas polish and mutation correctness

Reason:

- they compete for the same core canvas contracts

### Next Document

The next useful document should be:

`workspace_live_api_checklist`

That document should define:

- sample records to seed
- exact manual test steps
- expected API responses
- failure cases to trigger intentionally

---

## Korean Translation

### 목적

이 문서는 MVP 워크스페이스의 정확한 프론트 구현 순서를 정의한다.

다음 질문에 답한다.

- 무엇을 먼저 만들지
- 무엇이 무엇에 의존하는지
- 무엇을 잠시 stub으로 둘 수 있는지
- 무엇을 live REST API로 먼저 검증해야 하는지

이 순서는 다음 문서를 전제로 한다.

- `frontend_mvp_architecture`
- `workflow_canvas_state_machine`
- `canvas_component_contracts`
- `workspace_rest_api_playbook`

### 전달 원칙

수평이 아니라 수직으로 만든다.

의미:

- 어떤 UI도 없이 모든 API hook부터 끝내지 않는다
- 실제 데이터 흐름 없이 모든 UI shell부터 끝내지 않는다
- 대신 얇은 end-to-end slice를 하나씩 완성한다

각 slice에는 다음이 포함돼야 한다.

- query 또는 mutation hook
- 최소 view model 매핑
- 보이는 UI
- live API 검증

### Phase 0: 프로젝트 스켈레톤

목표:

- 워크스페이스 기능 전에 올바른 아키텍처 셸을 만든다

구현:

- Vite React TypeScript 앱
- router 구조
- TanStack Query provider
- Zustand store skeleton
- shared API client
- shared error normalization
- shared layout shell

먼저 만들 파일:

```text
src/app/providers/QueryProvider.tsx
src/app/router/index.tsx
src/shared/api/httpClient.ts
src/shared/api/unwrapApiResponse.ts
src/shared/lib/normalizeUiError.ts
src/shared/types/api.ts
src/pages/workspace/ui/WorkspaceRoute.tsx
```

stub 가능:

- 실제 workspace 렌더링
- rule drawer
- template palette content

완료 기준:

- 앱이 부팅된다
- router가 동작한다
- API client가 백엔드 endpoint 하나를 호출할 수 있다

### Phase 1: Workflow Canvas 읽기 경로

목표:

- 백엔드 REST 데이터로 실제 workflow canvas를 렌더링한다

구현:

- `useWorkflowCanvasQuery(workflowId)`
- `toWorkflowCanvasViewModel`
- `WorkflowCanvasPage`
- `CanvasViewport`
- 최소 `CanvasNode`
- 최소 `CanvasEdge`

필요 endpoint:

- `GET /api/workflows/{workflowId}/canvas`

의존 순서:

1. DTO 타입
2. view model mapper
3. query hook
4. page shell
5. viewport
6. node, edge 렌더링

stub 가능:

- inspector 수정
- node rename
- connection 생성
- rules

live API 체크포인트:

- 페이지가 올바른 위치에 노드를 보여준다
- `colorScheme`에서 노드 색상이 렌더링된다
- I/O row가 노드 아래 그룹화되어 보인다
- edge가 `sourceHandle`, `targetHandle`로 연결된다

완료 기준:

- 실제 workflow canvas 하나가 mock 없이 로드된다

### Phase 2: Selection과 Inspector 읽기 경로

목표:

- 캔버스를 inspect 가능하게 만든다

구현:

- selection store
- 파생 inspector state
- `NodeInspector`
- `ConnectionInspector`
- 선택된 I/O row 처리

의존 순서:

1. selection state
2. 파생 selector
3. inspector shell
4. node detail 렌더링
5. connection detail 렌더링

stub 가능:

- inspector submit action
- rule editing action

live API 체크포인트:

- 노드를 클릭하면 node inspector가 열린다
- I/O row를 클릭하면 process I/O context가 열린다
- edge를 클릭하면 connection inspector가 열린다

완료 기준:

- 캔버스의 모든 보이는 객체를 inspect할 수 있다

### Phase 3: Node 수정 슬라이스

목표:

- 노드의 첫 end-to-end 쓰기 슬라이스를 완성한다

구현:

- `useUpdateProcess`
- `useCreateProcess`
- `useDeleteProcess`
- node create dialog 또는 drawer
- node general tab submit
- node delete action
- inline rename start와 submit
- color change submit

필요 endpoint:

- `POST /api/processes`
- `PUT /api/processes/{processId}`
- `DELETE /api/processes/{processId}`

optimistic 정책:

- rename: yes
- color change: yes
- move: yes
- create: no
- delete: no

live API 체크포인트:

- 노드를 생성하고 canvas refetch 뒤 보인다
- 노드 이름 변경 시 optimistic patch가 보인다
- 노드 색상 변경 시 optimistic patch가 보인다
- 노드 삭제 후 그래프가 갱신된다

완료 기준:

- 노드 lifecycle이 mock 없이 완전히 usable하다

### Phase 4: Node I/O 수정 슬라이스

목표:

- 노드 내부 input, output을 수정 가능하게 만든다

구현:

- `useCreateProcessIo`
- `useUpdateProcessIo`
- `useDeleteProcessIo`
- inspector의 I/O 목록
- I/O create form
- I/O edit form
- I/O delete action

필요 endpoint:

- `POST /api/process-ios`
- `PUT /api/process-ios/{processIoId}`
- `DELETE /api/process-ios/{processIoId}`

특수 규칙:

- `processIo.colorScheme`가 렌더링돼야 한다
- `processIoId`를 안정적인 handle id로 사용해야 한다
- quantity 값은 form 입력용으로 정규화해야 한다

stub 가능:

- row drag reorder
- 고급 formula helper

live API 체크포인트:

- input row 생성 후 node body에 바로 보인다
- output row 생성 후 handle이 connect 가능해진다
- color와 quantity 수정 후 canvas refresh로 검증한다

완료 기준:

- 노드 내부가 수정 가능하고 화면에 보인다

### Phase 5: Connection 생성 및 수정 슬라이스

목표:

- 그래프 구조를 실제로 수정 가능하게 만든다

구현:

- connection draft state
- React Flow connect handler
- `useCreateProcessConnection`
- `useUpdateProcessConnection`
- `useDeleteProcessConnection`
- connection confirm popover 또는 lightweight drawer

필요 endpoint:

- `POST /api/process-connections`
- `PUT /api/process-connections/{connectionId}`
- `DELETE /api/process-connections/{connectionId}`

핵심 계약:

- `sourceHandle` 유지
- `targetHandle` 유지
- `fromIoId` 유지
- `toIoId` 유지

MVP에서는 optimistic create를 하지 않는다.

live API 체크포인트:

- 기본 node handle 연결
- 특정 I/O row 연결
- canvas 재로드 후 같은 handle에 edge가 다시 붙는지 확인

완료 기준:

- 그래프 topology 수정이 live API로 동작한다

### Phase 6: Rule 읽기 및 생성 슬라이스

목표:

- 백엔드 rule capability를 workspace에 붙인다

구현:

- `useFlowRulesQuery`
- `useCreateFlowRule`
- `useUpdateFlowRule`
- `useDeleteFlowRule`
- `RuleDrawer`
- inspector의 rule 목록

필요 endpoint:

- `GET /api/flow-rules`
- `POST /api/flow-rules`
- `PUT /api/flow-rules/{ruleId}`
- `DELETE /api/flow-rules/{ruleId}`

MVP에서는 optimistic create를 하지 않는다.

live API 체크포인트:

- process rule 생성
- process I/O rule 생성
- connection rule 생성
- `400` 에러 발생 시 drawer가 열려 있고 메시지가 보인다

완료 기준:

- workspace target 전체에 대해 rule 생성과 수정이 동작한다

### Phase 7: Template Apply 슬라이스

목표:

- template로 canvas authoring 속도를 높인다

구현:

- process template query
- template palette
- template apply action

필요 endpoint:

- `GET /api/process-templates`
- `POST /api/process-templates/{templateId}/apply`

stub 가능:

- recently used templates
- drag-and-drop template placement

live API 체크포인트:

- template list가 백엔드에서 로드된다
- template 클릭 시 올바른 기본 색상과 크기로 노드가 생성된다

완료 기준:

- template 기반 node insertion이 동작한다

### 권장 파일 생성 순서

다음 순서로 파일을 만든다.

```text
1. shared/api/httpClient.ts
2. shared/api/unwrapApiResponse.ts
3. shared/lib/normalizeUiError.ts
4. entities/workflow/model/types.ts
5. entities/workflow/model/toWorkflowCanvasViewModel.ts
6. entities/workflow/api/useWorkflowCanvasQuery.ts
7. pages/workspace/ui/WorkflowCanvasPage.tsx
8. pages/workspace/ui/CanvasViewport.tsx
9. pages/workspace/ui/CanvasNode.tsx
10. pages/workspace/ui/CanvasEdge.tsx
11. pages/workspace/model/workspaceStore.ts
12. pages/workspace/ui/NodeInspector.tsx
13. pages/workspace/ui/ConnectionInspector.tsx
14. features/process-edit/model/*.ts
15. features/process-io-edit/model/*.ts
16. features/connection-edit/model/*.ts
17. features/rule-edit/model/*.ts
18. pages/workspace/ui/RuleDrawer.tsx
19. pages/workspace/ui/TemplatePalette.tsx
```

### Stub 전략

아직 검증하지 않는 경계에만 임시 stub을 사용한다.

좋은 stub:

- inspector empty state
- 로컬 template palette shell
- placeholder rule drawer chrome

나쁜 stub:

- REST query가 존재하는데도 fake canvas graph 유지
- fake DTO 계약
- fake handle id

### 검증 순서

다음 순서로 검증한다.

1. canvas fetch
2. node selection
3. node update
4. I/O update
5. connection create
6. rule create failure handling
7. template apply

이유:

- 이 순서는 의존 깊이를 따라간다
- 뒤 기능은 앞 데이터 계약이 안정적이어야 한다

### Workspace MVP 완료 정의

다음이 되면 workspace MVP는 완료다.

- 실제 workflow 하나가 REST로 로드된다
- node가 color와 I/O row를 포함해 렌더링된다
- node create, update, delete가 동작한다
- I/O create, update, delete가 동작한다
- connection create, update, delete가 동작한다
- rule 생성과 수정이 가능하다
- template가 node를 삽입할 수 있다
- 공통 실패가 안정적인 UI error로 보인다

### 너무 일찍 병렬화하지 말 것

다음을 너무 일찍 병렬화하지 않는다.

- rule builder와 connection editor
- template apply와 node create modal redesign
- 고급 canvas polish와 mutation correctness

이유:

- 모두 같은 핵심 canvas 계약을 공유한다

### 다음 문서

다음으로 유용한 문서는 다음이다.

`workspace_live_api_checklist`

그 문서에는 다음이 들어가야 한다.

- seed할 sample record
- 정확한 수동 테스트 절차
- 기대 API 응답
- 의도적으로 발생시킬 실패 케이스
