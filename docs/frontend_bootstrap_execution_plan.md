# Frontend Bootstrap Execution Plan

## English

### Purpose

This document turns the workspace architecture and implementation sequence into an actionable first frontend sprint plan.

It focuses on:

- what to code first
- what to stub temporarily
- what to verify immediately
- what not to overbuild

### Sprint Objective

The first sprint should produce one real, non-mock workspace read path:

- route loads
- backend canvas fetch succeeds
- nodes render
- edges render
- selection works

Nothing else should be allowed to derail that objective.

### Sprint Scope

In scope:

- app shell
- REST client
- API response unwrap
- workflow canvas query
- DTO to view model mapping
- workspace route
- canvas viewport
- node rendering
- edge rendering
- selection store
- basic inspector read state

Out of scope:

- node create
- node edit forms
- I/O edit forms
- connection create
- rule drawer
- template apply
- design polish

### Day-by-Day Sequence

#### Day 1: Shell and HTTP Foundation

Build:

- Vite app
- router
- QueryClient provider
- HTTP client
- API unwrap utility
- UI error normalization

Deliverable:

- app runs
- one basic REST request works

Checkpoint:

- call `GET /api/projects`

#### Day 2: Workflow Canvas Query Layer

Build:

- workflow canvas DTO types
- `toWorkflowCanvasViewModel`
- `useWorkflowCanvasQuery`

Deliverable:

- canvas query returns stable `WorkflowCanvasViewModel`

Checkpoint:

- log or inspect mapped nodes, ports, and edges from a real workflow id

#### Day 3: Workspace Route and Loading States

Build:

- workspace route page
- route param extraction
- loading state
- error state
- empty state

Deliverable:

- `/projects/:projectId/workflows/:workflowId` loads real query data

Checkpoint:

- route shows loading and error states correctly

#### Day 4: Canvas Viewport and React Flow Integration

Build:

- `CanvasViewport`
- React Flow setup
- node list rendering
- edge list rendering

Deliverable:

- real nodes and edges appear on the screen

Checkpoint:

- node positions match backend coordinates
- edge handles resolve correctly

#### Day 5: Selection and Inspector Read Path

Build:

- workspace store
- selection state
- click handlers
- basic node inspector
- basic connection inspector

Deliverable:

- clicking canvas objects updates selection and inspector state

Checkpoint:

- node click shows node summary
- edge click shows connection summary
- empty canvas click clears selection

### File Creation Order

Create files in this order:

```text
1. src/shared/api/httpClient.ts
2. src/shared/api/unwrapApiResponse.ts
3. src/shared/lib/normalizeUiError.ts
4. src/shared/types/api.ts
5. src/entities/workflow/model/types.ts
6. src/entities/workflow/model/toWorkflowCanvasViewModel.ts
7. src/entities/workflow/api/useWorkflowCanvasQuery.ts
8. src/pages/workspace/model/workspaceStore.ts
9. src/pages/workspace/ui/WorkspaceRoute.tsx
10. src/pages/workspace/ui/WorkflowCanvasPage.tsx
11. src/pages/workspace/ui/CanvasViewport.tsx
12. src/pages/workspace/ui/CanvasNode.tsx
13. src/pages/workspace/ui/CanvasEdge.tsx
14. src/pages/workspace/ui/NodeInspector.tsx
15. src/pages/workspace/ui/ConnectionInspector.tsx
```

### Temporary Stubs Allowed

Allowed:

- static toolbar buttons
- placeholder template palette shell
- placeholder rule drawer shell
- read-only inspector tabs

Not allowed:

- fake node ids
- fake handle ids
- fake canvas query data when live query already works
- temporary shape model that diverges from backend DTO mapping

### Immediate Verification Checklist

Before moving past sprint 1, verify:

1. API unwrap handles `success=true`
2. API unwrap handles `success=false`
3. workflow canvas query returns grouped inputs and outputs
4. node color renders from backend `colorScheme`
5. I/O color renders from backend `processIo.colorScheme`
6. edge source and target handles are preserved
7. selection state survives rerender

### Risks to Watch

Primary risks:

- using raw DTOs directly in components
- mixing selection state with React Flow internal state
- losing handle identity during mapping
- overbuilding inspector forms before read path is stable

### Definition of Done for Sprint 1

Sprint 1 is done when:

- workspace route works
- one real canvas renders from backend
- node and edge identity are stable
- selection works
- basic inspector read state works

Not when:

- toolbar looks finished
- palette looks finished
- forms look finished

### Sprint 2 Preview

Sprint 2 should start with:

- process update hooks
- node rename
- node color update
- node move persistence

Because those are the cheapest write-path features after read-path stability.

### Next Document

The next useful document should be:

`frontend_file_scaffold_manifest`

That document should list the exact initial file tree and one-line responsibility for each file.

---

## Korean Translation

### 목적

이 문서는 워크스페이스 아키텍처와 구현 순서를 실제 첫 프론트 스프린트 계획으로 바꾼다.

초점:

- 무엇을 먼저 코딩할지
- 무엇을 잠시 stub으로 둘지
- 무엇을 즉시 검증할지
- 무엇을 과하게 만들지 말아야 하는지

### 스프린트 목표

첫 스프린트는 mock이 아닌 실제 workspace 읽기 경로 하나를 만드는 것이 목표다.

- route가 열린다
- 백엔드 canvas fetch가 성공한다
- node가 렌더링된다
- edge가 렌더링된다
- selection이 동작한다

이 목표를 흐리는 작업은 허용하지 않는다.

### 스프린트 범위

포함:

- app shell
- REST client
- API response unwrap
- workflow canvas query
- DTO -> view model 매핑
- workspace route
- canvas viewport
- node 렌더링
- edge 렌더링
- selection store
- 기본 inspector 읽기 상태

제외:

- node 생성
- node 수정 form
- I/O 수정 form
- connection 생성
- rule drawer
- template apply
- 디자인 polish

### 날짜별 순서

#### Day 1: 셸과 HTTP 기반

구현:

- Vite 앱
- router
- QueryClient provider
- HTTP client
- API unwrap 유틸
- UI error normalization

산출물:

- 앱 실행
- 기본 REST 요청 하나 성공

체크포인트:

- `GET /api/projects` 호출

#### Day 2: Workflow Canvas Query 계층

구현:

- workflow canvas DTO 타입
- `toWorkflowCanvasViewModel`
- `useWorkflowCanvasQuery`

산출물:

- canvas query가 안정적인 `WorkflowCanvasViewModel` 반환

체크포인트:

- 실제 workflow id 기준으로 매핑된 nodes, ports, edges를 확인

#### Day 3: Workspace Route와 로딩 상태

구현:

- workspace route page
- route param 추출
- loading state
- error state
- empty state

산출물:

- `/projects/:projectId/workflows/:workflowId`가 실제 query 데이터를 로드

체크포인트:

- route가 loading, error 상태를 올바르게 보여준다

#### Day 4: Canvas Viewport와 React Flow 통합

구현:

- `CanvasViewport`
- React Flow 설정
- node list 렌더링
- edge list 렌더링

산출물:

- 실제 node와 edge가 화면에 보인다

체크포인트:

- node 위치가 백엔드 좌표와 일치
- edge handle이 올바르게 해석

#### Day 5: Selection과 Inspector 읽기 경로

구현:

- workspace store
- selection state
- click handler
- 기본 node inspector
- 기본 connection inspector

산출물:

- 캔버스 객체 클릭 시 selection과 inspector state가 갱신

체크포인트:

- node 클릭 시 node summary 표시
- edge 클릭 시 connection summary 표시
- 빈 캔버스 클릭 시 selection 해제

### 파일 생성 순서

다음 순서로 파일을 만든다.

```text
1. src/shared/api/httpClient.ts
2. src/shared/api/unwrapApiResponse.ts
3. src/shared/lib/normalizeUiError.ts
4. src/shared/types/api.ts
5. src/entities/workflow/model/types.ts
6. src/entities/workflow/model/toWorkflowCanvasViewModel.ts
7. src/entities/workflow/api/useWorkflowCanvasQuery.ts
8. src/pages/workspace/model/workspaceStore.ts
9. src/pages/workspace/ui/WorkspaceRoute.tsx
10. src/pages/workspace/ui/WorkflowCanvasPage.tsx
11. src/pages/workspace/ui/CanvasViewport.tsx
12. src/pages/workspace/ui/CanvasNode.tsx
13. src/pages/workspace/ui/CanvasEdge.tsx
14. src/pages/workspace/ui/NodeInspector.tsx
15. src/pages/workspace/ui/ConnectionInspector.tsx
```

### 허용되는 임시 Stub

허용:

- 정적인 toolbar 버튼
- placeholder template palette shell
- placeholder rule drawer shell
- read-only inspector tab

허용되지 않음:

- fake node id
- fake handle id
- live query가 이미 되는데 fake canvas data 유지
- 백엔드 DTO 매핑과 어긋나는 임시 shape model

### 즉시 검증 체크리스트

스프린트 1을 넘기기 전에 다음을 검증한다.

1. API unwrap이 `success=true`를 처리
2. API unwrap이 `success=false`를 처리
3. workflow canvas query가 inputs, outputs를 올바르게 그룹화
4. node color가 백엔드 `colorScheme`에서 렌더링
5. I/O color가 백엔드 `processIo.colorScheme`에서 렌더링
6. edge source, target handle이 보존
7. selection state가 rerender 후에도 유지

### 주의할 리스크

주요 리스크:

- raw DTO를 컴포넌트에서 직접 사용하는 것
- selection state와 React Flow internal state를 섞는 것
- 매핑 과정에서 handle identity를 잃는 것
- 읽기 경로 안정화 전에 inspector form을 과하게 만드는 것

### 스프린트 1 완료 정의

다음이 되면 스프린트 1 완료다.

- workspace route 동작
- 실제 canvas 하나가 백엔드에서 렌더링
- node, edge identity 안정
- selection 동작
- 기본 inspector 읽기 상태 동작

다음이 되었다고 완료가 아니다.

- toolbar가 완성돼 보임
- palette가 완성돼 보임
- form이 완성돼 보임

### 스프린트 2 미리보기

스프린트 2는 다음으로 시작하는 것이 맞다.

- process update hook
- node rename
- node color update
- node move persistence

이유:

- 읽기 경로가 안정된 뒤 가장 싸게 붙일 수 있는 쓰기 경로 기능이기 때문이다

### 다음 문서

다음으로 유용한 문서는 다음이다.

`frontend_file_scaffold_manifest`

그 문서는 초기 파일 트리와 각 파일의 한 줄 책임을 적어야 한다.
