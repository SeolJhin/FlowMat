# FlowMat — 자유 캔버스(Freeform Drawing) 구현 + 범용 도메인 모델 정렬

> 이 문서는 두 가지를 동시에 다룬다.
> **A) 실제 로컬 화면에 빠져 있는 "PPT급 자유 드로잉" 기능을 무엇을, 어떤 파일에, 어떻게 구현할지**
> **B) 그 구현이 `flowmat_architecture_improvement_plan.md`가 정한 범용 Flow Engine 방향(process→flow_node, item→resource)에서 벗어나지 않도록 네이밍/구조를 정렬하는 방법**
>
> 근거 자료: `flowmat_architecture_improvement_plan.md`(범용화 기획안), `collab_status_2026-07-23.md` / `frontend_workspace_status_2026-07-22.md`(현재 실제 구현 상태), `repo_analysis_{excalidraw,tldraw,xyflow,yjs,instldraw}.md`(캔버스 자유도 레퍼런스 5종 전수조사), 이미지 2장(AutoCAD 도면 + FlowMat 웹 목업)
> 스택: Spring Boot + PostgreSQL(+Redis) / React + TypeScript + Vite + TanStack Query + Zustand + `@xyflow/react`

---

## 0. 현재 상태 요약 (착각하지 않기 위한 기준선)

이 프로젝트는 "0에서 시작"이 아니다. 리서치 문서들에 등장하는 실제 파일명 기준으로, 이미 존재하는 것과 없는 것을 먼저 구분한다.

### 0.1 이미 있는 것 (건드리지 않고 재사용)

| 영역 | 실존 파일/기능 | 출처 |
|---|---|---|
| 캔버스 렌더링 | `CanvasNode.tsx`, `CanvasEdge.tsx` (xyflow 커스텀 노드/엣지) | xyflow 분석 §12 |
| 노드 생성 | `NodePickerPopup.tsx`, `createNodeFromConnectionDrop()` (엣지 드롭→노드 생성) | xyflow 분석 §7, §12 |
| 히스토리 | `commandHistory.ts` (자체 undo/redo) | xyflow, excalidraw 분석 |
| 상태 관리 | `workspaceStore.ts`(Zustand), `canvasInteractionStore.ts`, `inlineEditingNodeId` | tldraw, excalidraw 분석 |
| 뷰모델 변환 | `toWorkflowCanvasViewModel.ts` | excalidraw 분석 §8 |
| 협업(서버) | STOMP + JWT 인증, `graphSeq`/`sinceSeq` 증분 동기화, Redis 보존, Presence(JOIN/LEAVE/CURSOR_MOVED/NODE_EDITING/HEARTBEAT) | `collab_status_2026-07-23.md` |
| 협업(프론트) | route-level lazy load, `MiniMap`/`snapToGrid`/`onlyRenderVisibleElements`/`onBeforeDelete` 이미 연결됨, `NodeToolbar`/`EdgeToolbar` 사용 중 | `frontend_workspace_status_2026-07-22.md` |
| 권한/조직 | `ProjectAccessService`(viewer/editor/owner), `ProjectInviteController`, `ProjectMemberController`, RBAC(`roles`/`role_permissions`/`user_roles`), 관리자 역할 관리 UI(`/admin`) | `collab_status_2026-07-23.md` |
| 알림 | 이메일(`MailService`), Slack(`SlackNotificationService`) | `collab_status_2026-07-23.md` |
| 도메인 모델(현재) | `project`, `workflow`, `process`, `process_io`, `process_connection`, `item`, `inventory`, `bom_header/line`, `production_run`, `simulation_run` 등 | `flowmat_architecture_improvement_plan.md` §1 |
| 템플릿 | `WorkflowTemplateServiceImpl`/`ProcessTemplateServiceImpl` + 시드 데이터(제조/소프트웨어/식당/물류 4종 워크플로 템플릿, 16개 프로세스 템플릿) | `collab_status_2026-07-23.md` |

**중요 정정**: `frontend_workspace_status_2026-07-22.md`에는 "MiniMap, snapToGrid, onlyRenderVisibleElements, onBeforeDelete가 이미 연결됨"이라고 명시되어 있다. xyflow 분석 문서(`xyflow.md`)가 이들을 "FlowMat 미사용"이라 적은 것은 **작성 시점 차이로 인한 정보 불일치**로 보인다 — 실제 구현 착수 전 반드시 현재 `WorkflowCanvasPage.tsx`를 직접 열어 실제 연결 여부를 재확인해야 한다. 이 문서의 아래 계획은 "최신 status 문서(07-23)를 신뢰 기준"으로 작성했다.

### 0.2 실제로 빠져 있는 것 (이미지가 보여준 것과의 간극)

이미지(AutoCAD 도면 + FlowMat 웹 목업)와 현재 구현을 대조하면, 빠진 것은 "캔버스 인프라"가 아니라 **"자유 드로잉 자유도"** 다:

| 빠진 기능 | 현재 상태 | 이미지에서 요구되는 것 |
|---|---|---|
| 자유 도형 생성 | 노드는 팔레트에서 미리 정의된 타입만 생성 가능 | PPT처럼 사각형/원/화살표/텍스트를 캔버스 아무 곳에나 자유 배치 |
| 자유선 그리기 | 엣지는 포트-포트 연결만 가능 | 포트 없이 자유롭게 선/화살표를 긋는 것(주석, 범례선 등) |
| 텍스트/이미지 삽입 | 없음 | 캔버스 위에 텍스트 라벨, 이미지 삽입 (이미지의 "T", 이미지 아이콘 툴바 버튼) |
| 정렬/분포 툴바 | 없음 | 좌/중/우, 상/중/하 정렬, 균등 분포, 그룹화 (이미지 상단 정렬 아이콘들) |
| 도형 리사이즈 | NodeResizer는 있으나 자유 도형용은 없음 | 자유 도형(사각형 등)의 자유 크기조절 |
| 그리드/스냅 표시 UI | snapToGrid는 연결됐으나 그리드 px 설정 UI 없음 | 하단 "그리드: 10px", 스냅 on/off 토글 UI |

**결론**: 인프라(줌/팬/미니맵/undo/협업)는 있다. **"노드 그래프 편집기"에서 "범용 화이트보드 겸 노드 에디터"로 캔버스 표현력을 확장하는 작업이 빠져 있다.**

---

## 1. 범용 도메인 모델 정렬 원칙 (구현 전 반드시 지킬 것)

`flowmat_architecture_improvement_plan.md`의 핵심 문장을 그대로 인용한다:

> 우리는 생산라인을 만드는 것이 아니라, **흐름을 설계하는 엔진**을 만든다.

이 원칙에 따라, 아래에서 설계하는 모든 자유 드로잉 기능은 다음 제약을 지킨다.

### 1.1 네이밍 제약

| 절대 쓰지 않을 이름 (제조 특화) | 대신 쓸 이름 (범용) |
|---|---|
| `ProcessNode`, `EquipmentNode` | `FlowNode` (기존 `process` 엔티티와 별도 레이어) |
| `MaterialItem`, `InventoryItem` | `Resource` |
| `MaterialFlowEdge`, `UtilitySupplyEdge` | `FlowConnection` (`connectionType`은 `resource_category`에서 파생) |
| `productionRun` | `flowRun` (`runType: actual\|simulation\|test\|dry_run`) |

### 1.2 구조 제약 — "자유 드로잉 요소"는 `process`가 아니다

가장 중요한 설계 결정: **이미지의 도형(사각형/원/텍스트/자유선)은 `process`(Node)가 아니라 별도의 "캔버스 주석 레이어(Annotation Layer)"로 분리한다.**

이유:
- `process`(→ 장기적으로 `flow_node`)는 **Resource IO를 갖는 실행 가능한 처리 단위**다 (`flowmat_architecture_improvement_plan.md` §5.3, §8).
- PPT식 자유 도형(설명용 사각형, 화살표, 텍스트 라벨)은 **처리 단위가 아니라 순수 시각적 주석**이다. 이걸 `process` 테이블에 억지로 넣으면 "범용 Flow Engine"이 아니라 "그림판 겸 워크플로우 엔진"이 되어 버리고, `process_io`/`process_connection`과 무관한 레코드가 핵심 테이블에 섞여 도메인이 오염된다.
- excalidraw/tldraw 리서치도 이 분리를 암묵적으로 보여준다 — tldraw는 `ShapeUtil`(순수 도형)과 `BindingUtil`(도형 간 관계)을 분리하고, workflow 템플릿에서도 `NodeShapeUtil`(워크플로우 노드)과 일반 도형은 별개 타입으로 관리한다.

따라서 신규 테이블/레이어는 `flow_node`가 아니라 **`canvas_annotation`** 이라는 새 이름으로 분리한다 (아래 3장).

---

## 2. 백엔드: `canvas_annotation` 레이어 신설

### 2.1 신규 테이블

```sql
-- V8__canvas_annotation.sql

CREATE TABLE canvas_annotation (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id       UUID NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
    annotation_type   VARCHAR(20) NOT NULL,   -- 'shape' | 'freehand' | 'text' | 'image' | 'arrow'
    shape_kind        VARCHAR(20),            -- 'rectangle' | 'ellipse' | 'diamond' | null(freehand/text/image/arrow일 때)
    x                 DOUBLE PRECISION NOT NULL,
    y                 DOUBLE PRECISION NOT NULL,
    width             DOUBLE PRECISION,
    height            DOUBLE PRECISION,
    rotation          DOUBLE PRECISION DEFAULT 0,
    points            JSONB,                  -- freehand/arrow의 다중 좌표점 [[x,y], [x,y], ...]
    text_content      TEXT,                   -- annotation_type='text'일 때
    image_asset_url   TEXT,                   -- annotation_type='image'일 때
    style             JSONB NOT NULL DEFAULT '{}', -- { stroke, fill, strokeWidth, fontSize, opacity, ... }
    z_index           VARCHAR(20) NOT NULL,   -- fractional index 문자열 (excalidraw 패턴, 2.2절 참고)
    group_id          UUID,                   -- 그룹화된 도형들의 공통 group id (nullable)
    locked_yn         CHAR(1) NOT NULL DEFAULT 'N',
    version           INTEGER NOT NULL DEFAULT 1,       -- excalidraw 패턴: 변경마다 +1
    version_nonce     BIGINT NOT NULL,                  -- excalidraw 패턴: 변경마다 랜덤 재생성 (동시편집 tie-break)
    is_deleted        CHAR(1) NOT NULL DEFAULT 'N',      -- soft delete (tombstone)
    created_by        VARCHAR(64) NOT NULL,
    updated_by        VARCHAR(64) NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_canvas_annotation_workflow ON canvas_annotation(workflow_id) WHERE is_deleted = 'N';
CREATE INDEX idx_canvas_annotation_group ON canvas_annotation(group_id) WHERE group_id IS NOT NULL;
```

**설계 근거**:
- `version`/`version_nonce`/`is_deleted` 3종 세트는 `repo_analysis_excalidraw.md` §2의 충돌 해결 패턴을 그대로 채택 — 이미 백엔드가 STOMP 증분 동기화(`graphSeq`/`sinceSeq`)를 갖추고 있으므로, `canvas_annotation`도 동일한 낙관적 버전 비교로 병합 가능하게 만든다.
- `z_index`를 정수가 아니라 **fractional index 문자열**로 두는 이유는 `repo_analysis_excalidraw.md` §9와 동일 — 두 도형 사이에 새 도형을 끼워 넣을 때 다른 도형의 인덱스를 재계산할 필요가 없다.
- `group_id`는 이미지의 "그룹화" 툴바 버튼(F6) 대응.
- 기존 `process`/`process_connection` 테이블은 전혀 건드리지 않는다 — 이 레이어는 완전히 독립적으로 추가된다.

### 2.2 패키지 구조 (기존 패키지에 자연스럽게 편입)

```
com.flowmat.canvas.annotation/          # 신규 서브패키지
├── controller/
│   └── CanvasAnnotationController.java
│       # GET    /api/workflows/{workflowId}/annotations
│       # POST   /api/workflows/{workflowId}/annotations
│       # PATCH  /api/workflows/{workflowId}/annotations/{id}
│       # DELETE /api/workflows/{workflowId}/annotations/{id}      (soft delete)
│       # POST   /api/workflows/{workflowId}/annotations/batch     (다중 이동/정렬 배치 저장 — 2.4절)
├── service/
│   ├── CanvasAnnotationService.java          # CRUD
│   ├── CanvasAnnotationReconcileService.java # version/versionNonce 비교 병합 (excalidraw reconcile 패턴)
│   └── FractionalIndexService.java           # z_index 계산 (두 인덱스 사이 새 값 생성)
├── domain/
│   ├── CanvasAnnotation.java
│   ├── AnnotationType.java        # enum SHAPE/FREEHAND/TEXT/IMAGE/ARROW
│   └── ShapeKind.java             # enum RECTANGLE/ELLIPSE/DIAMOND
├── repository/
│   └── CanvasAnnotationRepository.java
└── dto/
    ├── CanvasAnnotationResponse.java
    ├── CanvasAnnotationCreateRequest.java
    ├── CanvasAnnotationPatchRequest.java
    └── CanvasAnnotationBatchRequest.java
```

### 2.3 캔버스 통합 조회 응답 확장

기존 `GET /api/workflows/{workflowId}/canvas` 응답에 `annotations` 필드를 추가한다 (신규 엔드포인트를 따로 만들지 않고 기존 read path에 병합):

```json
{
  "nodes": [ ... ],
  "edges": [ ... ],
  "annotations": [
    {
      "id": "...",
      "annotationType": "shape",
      "shapeKind": "rectangle",
      "x": 120, "y": 80, "width": 200, "height": 100,
      "style": { "stroke": "#334155", "fill": "transparent", "strokeWidth": 2 },
      "zIndex": "a1V",
      "version": 3, "versionNonce": 918273645
    }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

### 2.4 실시간 동기화 — 기존 STOMP 인프라 재사용

`collab_status_2026-07-23.md`에 명시된 `graphSeq`/`sinceSeq` 증분 동기화, Redis 보존, echo 필터링용 `clientId` 구조를 **그대로 확장**한다 — 새 채널을 만들지 않는다:

```
기존: /topic/workflow/{id}         → 노드/엣지 변경 브로드캐스트
확장: /topic/workflow/{id}         → 노드/엣지/주석(annotation) 변경을 하나의 payload에 통합
      payload.changeType: 'node' | 'edge' | 'annotation'
```

`repo_analysis_instldraw.md` §7의 `merge()` 패턴(필드 단위 부분 업데이트, PATCH 사용)을 적용해 이동만 있는 경우 `x, y`만 PATCH — 전체 객체 재전송 금지.

---

## 3. 프론트엔드: 자유 드로잉 레이어 구현

### 3.1 설계 결정 — xyflow 위에 얹을 것인가, 별도 레이어인가

`repo_analysis_xyflow.md`와 `repo_analysis_tldraw.md`를 종합하면 두 선택지가 있다:

| 선택지 | 장점 | 단점 |
|---|---|---|
| A. `@xyflow/react`의 `nodeTypes`에 `shape`/`freehand`/`text` 타입을 추가해 Annotation도 xyflow Node로 취급 | 기존 드래그/선택/줌 인프라 재사용, 구현량 적음 | Annotation이 `process`가 아닌데도 xyflow의 "Node" 개념에 편입되어 나중에 데이터 모델이 헷갈릴 위험 |
| B. xyflow와 완전히 별도인 SVG 오버레이 레이어(tldraw/excalidraw 방식)를 캔버스 위에 얹음 | 데이터 모델이 깔끔하게 분리(2.1절 원칙과 일치), 자유 곡선/도형 렌더링 자유도 높음 | 좌표계/줌 동기화를 직접 구현해야 함(뷰포트 transform 이중관리) |

**채택: A(xyflow nodeTypes 확장) — 단, 프론트 컴포넌트 네이밍과 zustand 스토어는 분리한다.**

이유: 이미 xyflow가 pan/zoom/selection/multi-select/rubber-band selection을 전부 갖고 있고(`frontend_workspace_status_2026-07-22.md`), 별도 SVG 레이어를 얹으면 이 모든 상호작용을 처음부터 다시 구현해야 한다(`repo_analysis_tldraw-sync-cloudflare.md`가 강조하듯 "레이어 분리"는 lift 비용이 크다). xyflow의 `type: 'annotation-shape'`처럼 **별도 타입으로 등록**하면 렌더링/드래그/선택 인프라는 재사용하면서, 데이터는 여전히 `process`와 별개 테이블(`canvas_annotation`)에서 온다 — "타입 문자열 → 정의 레지스트리" 패턴(`repo_analysis_tldraw.md` §3 패턴 3)을 그대로 적용한다.

### 3.2 파일 구조 (기존 FSD 구조에 맞춤)

기존 문서 상 프론트가 FSD 구조인지 여부와 무관하게, 지금 실존하는 파일명(`CanvasNode.tsx`, `WorkflowCanvasPage.tsx`, `workspaceStore.ts`)을 기준으로 자연스럽게 이어지는 경로를 쓴다.

```
src/
├── entities/
│   └── canvas-annotation/                       # 신규
│       ├── model/
│       │   ├── types.ts             # CanvasAnnotation, AnnotationType, ShapeKind
│       │   └── annotationQueries.ts # useCanvasAnnotationsQuery (기존 canvas 쿼리에 병합 권장)
│       └── api/
│           └── canvasAnnotationApi.ts  # GET/POST/PATCH/DELETE, batch
│
├── features/
│   ├── annotation-create-shape/                 # 신규 — 사각형/원/다이아몬드 생성
│   │   └── model/useCreateShapeAnnotation.ts
│   ├── annotation-freehand-draw/                 # 신규 — 자유선 그리기
│   │   └── model/useFreehandDraw.ts              # pointerdown/move/up으로 points 배열 누적
│   ├── annotation-text-insert/                   # 신규 — 텍스트 삽입
│   │   └── model/useInsertTextAnnotation.ts
│   ├── annotation-image-insert/                  # 신규 — 이미지 삽입
│   │   └── model/useInsertImageAnnotation.ts     # 파일 업로드 → image_asset_url
│   ├── annotation-resize/                        # 신규 — 자유 도형 리사이즈
│   │   └── model/useResizeAnnotation.ts
│   ├── canvas-align/                             # 신규 — 정렬/분포 (이미지 F6 툴바)
│   │   └── model/useAlignSelection.ts            # 좌/중/우, 상/중/하 정렬 계산
│   ├── canvas-distribute/                        # 신규 — 균등 분포
│   │   └── model/useDistributeSelection.ts
│   ├── canvas-group/                             # 신규 — 그룹화
│   │   └── model/useGroupAnnotations.ts          # group_id 부여
│   └── canvas-grid-snap-toggle/                  # 신규 — 그리드 px / 스냅 on-off UI
│       └── model/useGridSnapSettings.ts
│
├── widgets/
│   └── canvas-toolbar/                           # 신규 (이미지 상단 캔버스 툴바 F6 전체)
│       ├── ui/CanvasToolbar.tsx
│       ├── ui/ToolButton.tsx                     # 커서/연결/텍스트/이미지 모드 전환 버튼
│       ├── ui/AlignmentButtonGroup.tsx           # 좌/중/우/상/중/하 정렬 버튼 6개
│       ├── ui/GroupButton.tsx
│       └── ui/GridSnapControl.tsx                # 하단 "그리드: 10px", 스냅 on/off (이미지 하단 우측)
│
└── (기존) WorkflowCanvasPage.tsx 등              # 기존 파일에 아래 통합 지점만 추가
```

### 3.3 xyflow 통합 지점 — 기존 `CanvasNode.tsx` 옆에 신규 타입 추가

```tsx
// entities/canvas-annotation/ui/nodeTypes.ts (신규 파일)
import { ShapeAnnotationNode } from './ShapeAnnotationNode';
import { TextAnnotationNode } from './TextAnnotationNode';
import { ImageAnnotationNode } from './ImageAnnotationNode';
import { FreehandAnnotationNode } from './FreehandAnnotationNode';

// 기존 nodeTypes(예: { process: CanvasNode })에 아래를 병합해서 ReactFlow에 전달
export const annotationNodeTypes = {
  'annotation-shape': ShapeAnnotationNode,
  'annotation-text': TextAnnotationNode,
  'annotation-image': ImageAnnotationNode,
  'annotation-freehand': FreehandAnnotationNode,
};
```

```tsx
// WorkflowCanvasPage.tsx (기존 파일 — 아래 두 줄만 추가하는 형태의 최소 침습적 diff)
import { annotationNodeTypes } from '@/entities/canvas-annotation/ui/nodeTypes';
// ...
<ReactFlow
  nodeTypes={{ ...existingNodeTypes, ...annotationNodeTypes }}
  // annotations는 process 노드와 다른 데이터 소스(canvas_annotation)에서 오지만
  // ReactFlow에 넘길 때는 동일한 Node[] 배열에 합쳐서 전달 (타입 필드로 구분)
  nodes={[...processNodes, ...annotationNodesMappedToReactFlowNode]}
/>
```

**핵심**: `process` 데이터와 `canvas_annotation` 데이터는 **서버/스토어 레벨에서는 완전히 분리**되어 있고, **xyflow에 넘기는 마지막 순간에만 하나의 배열로 합쳐진다.** 이게 2.1절의 "구조 제약"을 지키면서 xyflow 인프라를 재사용하는 핵심 트릭이다.

### 3.4 자유선(Freehand) 그리기 구현

포트 기반 엣지(`CanvasEdge.tsx`)와 완전히 다른 상호작용이므로 별도 모드로 구현한다.

```tsx
// features/annotation-freehand-draw/model/useFreehandDraw.ts
export function useFreehandDraw(workflowId: string) {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const { screenToFlowPosition } = useReactFlow(); // xyflow 좌표 변환 재사용 (xyflow 분석 §9)
  const createAnnotation = useCreateAnnotationMutation(workflowId);

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true);
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setPoints([[pos.x, pos.y]]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setPoints(prev => [...prev, [pos.x, pos.y]]); // 필요 시 throttle 적용(instldraw 패턴, §4 참고)
  };

  const onPointerUp = () => {
    if (points.length > 1) {
      createAnnotation.mutate({
        annotationType: 'freehand',
        points,
        style: { stroke: '#334155', strokeWidth: 2 },
      });
    }
    setIsDrawing(false);
    setPoints([]);
  };

  return { points, isDrawing, onPointerDown, onPointerMove, onPointerUp };
}
```

이 훅은 캔버스 모드가 "펜/자유그리기" 툴로 전환됐을 때만 활성화되며, 기존 선택/드래그 모드와는 `CanvasToolbar`의 `ToolButton` 상태(zustand `canvasToolModeStore`)로 배타적으로 전환한다.

### 3.5 정렬/분포 로직 (이미지 F6 툴바 그대로)

```ts
// features/canvas-align/model/useAlignSelection.ts
type AlignDirection = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';

export function useAlignSelection() {
  const selectedNodes = useSelectedCanvasElements(); // process node + annotation 공통 선택 상태
  const updatePosition = useBatchUpdatePositionMutation();

  function align(direction: AlignDirection) {
    const bounds = getSelectionBounds(selectedNodes); // xyflow의 getNodesBounds 재사용 가능
    const updates = selectedNodes.map(node => ({
      id: node.id,
      position: computeAlignedPosition(node, bounds, direction),
    }));
    updatePosition.mutate(updates); // 2.4절의 batch 엔드포인트 사용
  }

  return { align };
}
```

`computeAlignedPosition`은 순수 함수로 분리해 단위 테스트를 붙인다 (좌/중/우: x축 정렬, 상/중/하: y축 정렬 — 이미지 상단 툴바 아이콘 6개와 1:1 대응).

### 3.6 그리드/스냅 UI (이미지 하단 우측)

`frontend_workspace_status_2026-07-22.md`에 따르면 `snapToGrid`는 **이미 ReactFlow viewport에 연결되어 있다.** 따라서 이 항목은 새 기능이 아니라 **기존 기능을 노출하는 UI가 없는 상태**다. 백엔드 변경 없이 프론트 컴포넌트만 추가하면 된다:

```tsx
// widgets/canvas-toolbar/ui/GridSnapControl.tsx (신규 — 순수 UI, 기존 훅에 연결만)
export function GridSnapControl() {
  const { gridSize, snapEnabled, setGridSize, toggleSnap } = useGridSnapSettings(); // 기존 store 값 그대로 노출
  return (
    <div className="grid-snap-control">
      <span>그리드: {gridSize}px</span>
      <input type="range" min={5} max={50} value={gridSize} onChange={e => setGridSize(+e.target.value)} />
      <Toggle checked={snapEnabled} onChange={toggleSnap} label="스냅" />
    </div>
  );
}
```


## 4. 실행 순서 (Phase 단위)

우선순위는 "이미지가 보여준 자유도 간극을 메우는 것"을 최우선으로 하되, 매 Phase가 범용 도메인 모델 원칙(1장)을 위반하지 않는지 체크리스트로 검증한다.

### Phase 1 — 자유 도형 최소 기능 (1~2주)
- [ ] `canvas_annotation` 테이블 + Flyway 마이그레이션 (2.1절)
- [ ] `CanvasAnnotationController` CRUD (2.2절)
- [ ] 기존 `GET /canvas` 응답에 `annotations` 필드 병합 (2.3절)
- [ ] `ShapeAnnotationNode`(사각형/원/다이아몬드), `TextAnnotationNode` 컴포넌트
- [ ] `CanvasToolbar`에 도형/텍스트 삽입 버튼 추가
- [ ] 리사이즈: 기존 xyflow `NodeResizer`를 annotation 타입에도 적용 (신규 구현 최소화)

**체크리스트**: `process` 테이블에 어떤 컬럼도 추가하지 않았는가? → 통과해야 다음 Phase 진행.

### Phase 2 — 자유선 + 정렬/분포 (1주)
- [ ] `useFreehandDraw` 훅 (3.4절)
- [ ] `points` JSONB 컬럼 렌더링 (SVG `<path>`로 자유곡선 그리기, `d3-shape`의 line generator 활용 가능)
- [ ] 정렬 6종 + 균등 분포 (3.5절)
- [ ] 그룹화(`group_id`) — 그룹 선택/이동 시 하위 요소 동시 이동

### Phase 3 — 이미지 삽입 + 그리드/스냅 UI 노출 (3~5일)
- [ ] 이미지 업로드 엔드포인트(정적 파일 스토리지 — `tldraw-sync-cloudflare` 분석의 R2 upload 패턴 참고, S3/MinIO로 대체)
- [ ] `GridSnapControl` 컴포넌트 (3.6절 — 백엔드 변경 없음, 기존 훅 노출만)

### Phase 4 — 실시간 동기화 확장 (기존 인프라 재사용, 3~5일)
- [ ] `canvas_annotation` 변경을 기존 STOMP `/topic/workflow/{id}` 채널에 통합 (2.4절)
- [ ] `version`/`versionNonce` 기반 병합을 annotation에도 적용 (excalidraw reconcile 패턴, 이미 `process`에 있다면 동일 유틸 재사용)

### Phase 5 (장기, 로드맵 문서화만) — 범용 도메인 리네이밍
`flowmat_architecture_improvement_plan.md` §16의 "1단계: 기존 테이블 유지 + 의미 재정의"를 그대로 따른다 — **테이블명을 지금 당장 바꾸지 않는다.** `process`/`item`/`inventory`는 유지하되, 신규로 추가하는 `canvas_annotation`, 그리고 향후 추가될 `domain_template`, `flow_rule` 등은 처음부터 범용 명칭으로 짓는다. 기존 명칭 리네이밍은 별도 스파이크로 분리.

---

## 5. 리서치 5종 통합 우선순위 (자유 캔버스 관점으로 재정렬)

각 개별 분석 문서(`repo_analysis_*.md`)의 우선순위표는 "일반적인 캔버스 개선"을 기준으로 매겨져 있었다. 지금 목표(자유 드로잉 간극 메우기)에 맞춰 재정렬하면:

| 순위 | 항목 | 출처 문서 | Phase |
|---|---|---|---|
| 1 | 자유 도형(사각형/원/텍스트) 생성 — xyflow `nodeTypes` 확장 패턴 | xyflow §3.6, tldraw §2.2(ShapeUtil 개념) | 1 |
| 2 | Fractional index로 z-order 관리 | excalidraw §9 | 1 (스키마에 이미 반영) |
| 3 | 정렬/분포 툴바 | (이미지 직접 요구, 리서치 문서엔 명시적 언급 없음 — 신규 설계) | 2 |
| 4 | 자유선 그리기 + `screenToFlowPosition` 좌표 변환 | xyflow §9(`screenToFlowPosition`), tldraw `DrawShapeUtil` 개념 | 2 |
| 5 | NodeToolbar/EdgeToolbar (선택 시 플로팅 버튼) | xyflow §3.1~3.2 — **이미 연결됐다고 07-23 문서에 있으므로 실제 화면 재확인만 필요** | 확인 필요 |
| 6 | 이미지 삽입 + 정적 파일 스토리지 | tldraw-sync-cloudflare §R2 업로드 패턴 | 3 |
| 7 | version/versionNonce 충돌 해결을 annotation에 확장 | excalidraw §2, §4 | 4 |
| 8 | Durable/Volatile 채널 분리(annotation 이동 중 프리뷰는 volatile) | excalidraw §3.2, yjs §6(Awareness) — 이미 presence 인프라 있음 | 4 (선택적) |
| 9 | 범용 도메인 리네이밍(`process`→`flow_node` 등) | `flowmat_architecture_improvement_plan.md` §16 | 5 (장기) |

---

## 6. 하지 말아야 할 것 (명시적 경계)

이번 작업 범위를 흐리지 않기 위해 아래는 **의도적으로 이번 계획에서 제외**한다:

- **CRDT(Yjs) 전면 도입** — `repo_analysis_yjs.md`가 스스로 결론 내리듯, 현재 STOMP + 낙관적 버전 비교로도 요구사항을 충족하며, CRDT는 Java/Spring 생태계에 공식 포트가 없어 전환 비용이 매우 크다. Awareness(커서) 개념만 이미 구현된 presence 인프라로 충분히 대체된다.
- **tldraw/excalidraw SDK 자체를 라이브러리로 도입** — 라이선스 제약(tldraw 유료) 및 기존 xyflow 인프라와의 중복 때문에 코드 재사용은 하지 않는다. 패턴만 참고한다(각 분석 문서 §5의 "직접 통합 vs 패턴 참고" 구분을 그대로 따름).
- **`process`/`item`/`inventory` 테이블 리네이밍을 지금 실행** — Phase 5로 미룬다. 지금 리네이밍하면 이미 배포된 협업/권한/템플릿 기능 전체에 영향을 준다.
- **Sub-flow(그룹 노드 안에 노드 중첩) 도입** — xyflow §4가 "구현 복잡도: 높음"으로 표시했고, 이미지가 요구하는 자유도(도형 그룹화)는 `group_id` 방식으로 더 가볍게 달성 가능하므로 이번 범위에서 제외.

---

*문서 끝 — Phase 1 착수 전, `WorkflowCanvasPage.tsx`와 `CanvasToolbar` 관련 기존 파일을 직접 열어 0.1절의 "이미 있는 것" 목록이 실제 코드와 일치하는지 재확인할 것 (문서 간 정보 불일치 가능성이 0.1절에 기록되어 있음).*
