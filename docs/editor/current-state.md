# FlowMat Editor Current State

작성일: 2026-08-12

## 요약

현재 FlowMat에는 독립 도형 편집 엔진 v1이 들어갔다. React Flow는 process node와 connection edge를 유지하고, legacy annotation과 신규 editor document element는 별도 SVG editor layer에서 합성 렌더/조작한다.

따라서 새 자유 도형 기능은 기존 React Flow node 체계에 계속 추가하지 않고, 별도 `flowmat-editor` core를 만든 뒤 adapter로 점진 연결하는 방식이 적합하다.

## 확인한 현재 구조

### React Flow 의존

- `flowmat_frontend/src/pages/workspace/ui/CanvasViewport.tsx`
  - `@xyflow/react`를 직접 사용한다.
  - `nodeTypes`에는 `flowmatNode`만 등록되어 있다.
  - annotation은 더 이상 React Flow node로 변환되지 않는다.
  - 좌표 변환은 `screenToFlowPosition`에 의존한다.

- `flowmat_frontend/src/pages/workspace/ui/WorkspaceEditorLayer.tsx`
  - React Flow `ViewportPortal` 안에서 SVG editor layer를 렌더링한다.
  - legacy annotation mirror와 backend editor document element를 같은 편집 표면에 합성한다.
  - 선택, 이동, 리사이즈, 회전, 삭제, 스타일 patch를 storage model별로 분기 저장한다.

- `flowmat_frontend/src/pages/workspace/ui/CanvasNode.tsx`
  - process node 렌더링은 React Flow node에 의존한다.

- `flowmat_frontend/src/pages/workspace/ui/CanvasEdge.tsx`
  - workflow connection edge 렌더링은 React Flow edge에 의존한다.

### 현재 annotation 모델

프론트 타입:

- `CanvasAnnotationType = 'shape' | 'freehand' | 'text'`
- `CanvasAnnotationShapeKind = 'rectangle' | 'ellipse' | 'diamond'`

백엔드 타입:

- `AnnotationType = SHAPE | FREEHAND | TEXT`
- `ShapeKind = RECTANGLE | ELLIPSE | DIAMOND`

현재 shape 도구는 자유 도형 도구가 아니라, 클릭 위치에 rectangle annotation을 생성하는 기능이다.

### 저장 API

현재 annotation API는 다음 경로를 사용한다.

- `POST /workflows/{workflowId}/annotations`
- `PATCH /workflows/{workflowId}/annotations/{annotationId}`
- `DELETE /workflows/{workflowId}/annotations/{annotationId}`
- `POST /workflows/{workflowId}/annotations/batch`

현재 API는 triangle, line, polygon element를 1급 모델로 저장하지 않는다.

### 히스토리

`flowmat_frontend/src/pages/workspace/model/commandHistory.ts`는 Zustand store 기반 undo/redo다. 현재 workflow mutation에 가까운 명령을 저장하며, 새 editor core의 transaction history로 그대로 쓰기 어렵다.

### 협업

`flowmat_frontend/src/entities/workflow/api/useWorkflowSync.ts`는 STOMP 기반이다.

현재 주요 범위:

- process node move
- graph change 수신
- presence
- freehand annotation drawing preview

새 editor element 단위 협업은 아직 별도 모델이 없다.

### 자동 배치

`flowmat_frontend/src/pages/workspace/model/useAutoLayout.ts`는 Dagre를 사용한다. 이는 process graph 배치에 해당하며, 자유 도형 editor core와 분리하는 것이 맞다.

## 판정

### 유지할 것

- 기존 React Flow 기반 workflow canvas
- process node와 domain connection 모델
- 기존 annotation backend/API
- 기존 annotation save/reload/realtime parity

### 분리할 것

- graphic shape와 process node
- graphic line과 workflow connection
- editor selection과 workspace selection
- editor history와 workflow command history
- editor camera와 React Flow viewport dependency

### 바로 하면 안 되는 것

- `CanvasAnnotationNode.tsx`에 triangle, line, rotate, snap을 계속 덧붙이는 방식
- 기존 backend enum에 맞추려고 triangle/line을 freehand나 style JSON에 숨겨 저장하는 방식
- 새 editor core에서 React, React Flow, Zustand, React Query, STOMP를 import하는 방식

## 현재 지시서와의 차이 또는 보강점

`FlowMat_Editor_Engine_Implementation_Directive.md`의 큰 방향은 현재 코드와 맞다. 다만 다음 내용은 명시적으로 보강해야 한다.

1. Drawing Engine v1의 Save/Reload는 두 범위로 나눈다.
   - Core document Save/Reload
   - Legacy annotation adapter Save/Reload

2. triangle과 line은 core model에는 포함한다.

3. 기존 backend annotation API에는 triangle과 line을 초기 단계에서 억지 매핑하지 않는다.

4. Annotation adapter parity는 기존 `rectangle`, `ellipse`, `diamond`, `freehand`, `text`에 한정한다.

5. process node migration은 React Flow가 실제 요구사항을 막는다는 근거가 생긴 뒤에만 검토한다.

## 다음 단계

1. `flowmat_frontend/src/lib/flowmat-editor/` 아래에 순수 TypeScript core skeleton을 만든다.
2. `EditorDocument`, `EditorElement`, `Camera`, geometry primitive를 먼저 구현한다.
3. React component나 backend API 연결 없이 unit test로 검증한다.
4. 이후 SVG renderer shell과 rectangle tool demo를 별도 단계로 붙인다.

## 2026-08-12 구현 진행 상태

### 완료

- `flowmat_frontend/src/lib/flowmat-editor/` 순수 TypeScript core skeleton
- `EditorDocument`, `EditorElement`, `ElementId`, `Camera`
- rectangle, ellipse, polygon/triangle, line, freehand, text, group element factory
- `Vec2`, `Box2`, `Matrix2D`, `Bounds`, `HitTest`, `Transform`
- `SelectionManager`, `SnapManager`, snapshot 기반 `HistoryManager`
- `EditorDocument` JSON serialization/deserialization
- SVG renderer helper와 React SVG adapter
- `/editor-demo` 독립 route
- demo 기능
  - rectangle, ellipse, triangle, line drag create
  - freehand draw
  - text create
  - single/multi select
  - Shift marquee selection
  - move, resize, rotate
  - duplicate, delete
  - group, ungroup
  - bring front, send back
  - grid snap toggle
  - save/reload snapshot
  - layer panel, property panel
- import boundary test
- annotation adapter
  - legacy annotation `rectangle`, `ellipse`, `diamond`, `freehand`, `text` -> editor element
  - supported editor element -> legacy annotation create/patch payload
  - triangle, line, generic polygon, group은 legacy annotation API에 unsupported로 남김
- 기존 `CanvasViewport.tsx`에 dual layer preview 연결
  - React Flow viewport를 editor camera로 동기화
  - legacy annotation을 workspace SVG editor layer로 렌더
  - 기존 `CanvasAnnotationNode` React Flow node path 제거
- backend editor document 저장 모델/API
  - `workflow_editor_document`, `workflow_editor_element` 마이그레이션
  - `GET/PUT /workflows/{workflowId}/editor-document`
  - rectangle, ellipse, polygon/triangle, line, freehand, text, group 저장 가능
  - 기존 `/annotations` API와 분리
- frontend editor document backend adapter/API
  - core `EditorDocument` -> backend save payload
  - backend document DTO -> validated `EditorDocument`
  - `fetchEditorDocument`, `saveEditorDocument` API 함수와 React Query hook
- workspace editor document read path
  - `/editor-document` 응답을 SVG editor layer에 합성 렌더
  - backend editor element와 legacy annotation id가 겹치면 backend element 우선
  - backend document가 비어 있거나 아직 없으면 legacy annotation mirror를 SVG layer에서 유지
- `/editor-demo?workflowId=...` backend save/reload path
  - workflowId query가 있으면 `GET/PUT /editor-document` 사용
  - workflowId query가 없으면 기존 local snapshot save/reload 유지
- workspace production editor document commands
  - Ribbon Annotate 탭에 editor shape 도구와 Save/Reload command 추가
  - 좌측 패널에 rectangle, ellipse, triangle, line editor shape 도구 추가
  - workspace empty canvas click으로 backend editor element 생성
  - 생성/저장 시 backend editor document만 갱신하고 legacy annotation mirror는 display layer에서만 합성
  - 새 도형은 기존 `/annotations` API가 아니라 `/editor-document`에 저장
- workspace editor layer direct manipulation
  - backend editor elements can be selected on the production workspace canvas
  - legacy annotation mirrors can now be selected through the same SVG editor layer
  - Shift-click toggles multi-selection
  - selected backend editor elements and legacy annotation mirrors can be moved, resized, rotated, and deleted
  - Shift-drag on empty canvas performs marquee selection across backend editor elements and legacy annotation mirrors
  - Ctrl/Cmd+D duplicates selected backend editor elements
  - Ctrl/Cmd+G groups selected backend editor elements and legacy annotation mirrors within their own storage model
  - Ctrl/Cmd+Shift+G ungroups selected backend editor elements and legacy annotation mirrors
  - Ctrl/Cmd+[ and Ctrl/Cmd+] send selected backend editor elements and legacy annotation mirrors to back/front
  - pointer-up/delete/style commands persist backend elements through `PUT /workflows/{workflowId}/editor-document`
  - pointer-up/delete/style commands persist legacy annotation mirrors through the existing `/annotations` API
  - legacy text annotations can be double-click edited from the SVG editor layer
- legacy annotation React Flow node replacement
  - `CanvasAnnotationNode.tsx` removed
  - `CanvasViewport.tsx` keeps React Flow nodes scoped to process nodes only
  - annotation selection exposed to existing align/distribute/group commands from the SVG editor layer
- workspace editor element inspector
  - selected backend editor elements are surfaced in the right inspector
  - inspector supports duplicate/delete/group/ungroup/front/back commands
  - inspector supports fill, stroke/color, stroke width, opacity, text, and font size editing where applicable
- workspace editor text creation
  - Annotate editor tools include backend text element creation
- editor line endpoint editing
  - selected unrotated line elements expose start/end endpoint handles
  - endpoint drags normalize line bounds through the pure `moveLineEndpoint` transform helper
  - `/editor-demo` and production `WorkspaceEditorLayer` use the same endpoint action marker
- workspace editor snapping
  - production editor element creation snaps to the 8px workspace grid
  - move, resize, and line endpoint drags snap to the same grid
  - Alt bypasses snap for fine adjustment during pointer drags
- workspace editor keyboard integration
  - V selects the pointer tool
  - R/O/L/T select rectangle, ellipse, line, and text editor tools
  - Esc clears editor selection and returns to pointer
  - Ctrl/Cmd+A selects all editor-layer elements when an editor tool or editor selection is active
- workspace editor document undo/redo
  - backend editor document creation and direct manipulation commands record local history snapshots
  - Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y, and Ribbon Home undo/redo route to editor history in editor context
  - process node/connection undo/redo remains on the existing workflow command history
  - legacy annotation mirror edits remain outside editor history until the legacy annotation API can restore deleted annotations by stable id
- workspace PNG export coverage
  - editor SVG overlay is rendered through React Flow `ViewportPortal`
  - existing PNG export captures `.react-flow__viewport`, so backend editor elements are included with process nodes and edges
- workspace editor document refetch policy
  - graph change application invalidates the editor document query
  - reconnect/resync paths invalidate the editor document query
- dedicated editor-document STOMP graph event
  - backend emits `EDITOR_DOCUMENT_UPDATED` on `/topic/workflow/{workflowId}/graph`
  - event payload is intentionally null; clients refetch `/editor-document`
  - frontend receives the graph event and invalidates the editor document query
- annotation realtime parity regression
  - `applyGraphChangesToCanvas` now has create/update/delete annotation graph-change coverage
  - update path verifies annotation upsert instead of duplicate insertion
- React Flow retention gate
  - `CanvasViewport.retention.test.ts` verifies workflow nodes/edges still mount through React Flow
  - editor elements are verified as a `ViewportPortal` overlay, not a replacement for process graph rendering
- legacy annotation toolbar parity gate
  - `CanvasViewport.retention.test.ts` verifies SVG editor-layer annotation selection feeds the existing annotation toolbar selection ref
  - align, distribute, group, and ungroup handlers remain connected to the legacy annotation batch API
- performance benchmark
  - `SvgRenderer.performance.test.ts` covers large editor document render-node construction with a smoke budget

### 아직 미완료

- Manual browser smoke check for legacy annotation SVG-layer parity

### Remaining after this step

- Manual browser parity check for toolbar-only annotation behaviors

### 다음 작업 기준

다음 단계는 legacy annotation node 제거 이후의 저장/동기화 경계를 더 검증하는 작업이다.

- React Flow는 process node/connection 유지
- SVG layer annotation parity browser smoke test
- workspace editor element 조작을 `SvgEditorSurface` 기반으로 전환
- annotation save/reload/realtime parity regression 추가
- editor document 변경에 대한 STOMP/refetch sync 정책 확정
