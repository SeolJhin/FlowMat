# FlowMat — 자유 캔버스 Annotation 실행 계획 (확정판)

> 이 문서는 `flowmat_freeform_canvas_plan.md`(설계 근거 문서)를 전제로,
> 실제 의사결정 세션에서 **확정된 답**만을 기준으로 작업을 실행 순서로 쪼갠 문서다.
> 설계 이유/대안 비교가 필요하면 `flowmat_freeform_canvas_plan.md`를 참조할 것 — 이 문서는 "왜"가 아니라 "무엇을 어떤 순서로"에 집중한다.

---

## 0. 확정된 의사결정 (변경 시 이 표부터 갱신)

| 구분 | 항목 | 확정값 |
|---|---|---|
| 범위 | 1차 annotation 타입 | shape + text + freehand + align/group |
| 범위 | 이미지 annotation | 제외 (후속 phase) |
| 데이터 | DB 마이그레이션 | 즉시 진행 (Flyway) |
| 동기화 | 실시간 동기화 | 1차부터 포함 |
| 동기화 | freehand 드로잉 중 프리뷰 | volatile presence 채널로 실시간 방송 (완성본은 별도 durable 저장) |
| UI | 캔버스 툴바 위치 | 기존 워크스페이스 상단에 통합 |
| 권한 | annotation CRUD 권한 | viewer=읽기 전용 / editor 이상=생성·수정·삭제 |
| 테마 | 다크/라이트 범위 | 앱 전체 (light/dark/system) |
| 테스트 | 검증 범위 | 백엔드 테스트 + 프론트 빌드/린트 + annotation 핵심 로직(좌표 변환, 정렬 계산) 단위테스트 |
| 배포 | 기능 플래그 | 없음 — 완성 즉시 전체 노출 |

---

## 1. 작업 묶음 5개 개요

```
[1] 데이터 모델 + 백엔드 CRUD       (canvas_annotation 신설)
[2] 실시간 동기화                   (STOMP durable + volatile 확장)
[3] 프론트 캔버스 통합               (xyflow nodeTypes 확장 + 상단 툴바)
[4] 권한 적용                       (viewer/editor 분기)
[5] 테마 시스템                     (다른 트랙, 병행 가능)
```

작업 묶음 1~4는 순차 의존성이 있다(1 없이는 2, 3, 4 불가). 5(테마)는 완전히 독립적인 트랙이라 병렬로 진행해도 된다.

---

## 2. 작업 묶음 1 — 데이터 모델 + 백엔드 CRUD

### 2.1 Flyway 마이그레이션 (즉시 실행 확정)

```
src/main/resources/db/migration/V8__canvas_annotation.sql
```

내용은 `flowmat_freeform_canvas_plan.md` §2.1의 스키마를 그대로 사용한다. 확정 범위(이미지 제외)에 맞춰 `image_asset_url` 컬럼은 유지하되(스키마 유연성을 위해 nullable로 남김) 이번 phase의 API/UI에서는 다루지 않는다.

체크: `annotation_type` CHECK 제약을 확정 범위에 맞게 좁힌다.

```sql
annotation_type   VARCHAR(20) NOT NULL
    CHECK (annotation_type IN ('shape', 'freehand', 'text')),  -- image는 이번 phase 제외
```

### 2.2 패키지 생성 순서

```
com.flowmat.canvas.annotation/
├── domain/
│   ├── CanvasAnnotation.java          # 1번째 — 엔티티부터
│   ├── AnnotationType.java            # enum: SHAPE, FREEHAND, TEXT (IMAGE 제외)
│   └── ShapeKind.java                 # enum: RECTANGLE, ELLIPSE, DIAMOND
├── repository/
│   └── CanvasAnnotationRepository.java # 2번째
├── service/
│   ├── CanvasAnnotationService.java          # 3번째 — CRUD
│   ├── FractionalIndexService.java           # 4번째 — z_index 계산
│   └── CanvasAnnotationReconcileService.java # 5번째 — version/versionNonce 병합
├── dto/
│   ├── CanvasAnnotationResponse.java
│   ├── CanvasAnnotationCreateRequest.java
│   ├── CanvasAnnotationPatchRequest.java
│   └── CanvasAnnotationBatchRequest.java     # align/group 배치 업데이트용
└── controller/
    └── CanvasAnnotationController.java       # 6번째 — 맨 마지막
```

### 2.3 엔드포인트 (확정 범위 반영)

| Method | Path | 설명 | 권한 |
|---|---|---|---|
| GET | `/api/workflows/{workflowId}/annotations` | 목록 조회 (기존 `/canvas` 응답에도 병합) | viewer 이상 |
| POST | `/api/workflows/{workflowId}/annotations` | 생성 (shape/text/freehand) | editor 이상 |
| PATCH | `/api/workflows/{workflowId}/annotations/{id}` | 부분 수정(이동/리사이즈/스타일) | editor 이상 |
| DELETE | `/api/workflows/{workflowId}/annotations/{id}` | soft delete | editor 이상 |
| POST | `/api/workflows/{workflowId}/annotations/batch` | align/distribute/group 배치 처리 | editor 이상 |

권한 체크는 **기존 `ProjectAccessService`를 그대로 재사용**한다(신규 권한 서비스 만들지 않음) — `collab_status_2026-07-23.md`의 `viewer/editor/owner` 3단계 정책을 컨트롤러 진입점에서 그대로 적용:

```java
@PostMapping("/api/workflows/{workflowId}/annotations")
@PreAuthorize("@projectAccessService.canWrite(#workflowId, authentication)")
public CanvasAnnotationResponse create(...) { ... }
```

### 2.4 기존 read path 확장

`GET /api/workflows/{workflowId}/canvas` 응답에 `annotations` 배열을 추가한다 — 신규 별도 엔드포인트 호출 없이 캔버스 최초 로드 시 한 번에 받아온다 (`CanvasReadService` 또는 동등 서비스에 `CanvasAnnotationService.findAllByWorkflow()` 호출 추가).

### 2.5 백엔드 단위 테스트 (확정: annotation 핵심 로직에 추가)

```
src/test/java/com/flowmat/canvas/annotation/
├── service/
│   ├── CanvasAnnotationServiceTest.java        # CRUD 기본 동작
│   ├── FractionalIndexServiceTest.java         # ★ 핵심 — 두 인덱스 사이 값 생성 정확성
│   └── CanvasAnnotationReconcileServiceTest.java # ★ 핵심 — version/versionNonce 충돌 해결 로직
└── controller/
    └── CanvasAnnotationControllerTest.java     # 권한별 접근 테스트(viewer 403, editor 200)
```

`FractionalIndexServiceTest`와 `CanvasAnnotationReconcileServiceTest`가 "핵심 로직" 단위테스트에 해당 — 순수 계산 로직이라 모킹 없이 빠르게 테스트 가능.

---

## 3. 작업 묶음 2 — 실시간 동기화 (Durable + Volatile)

확정: 1차부터 실시간 포함, freehand 그리는 과정도 실시간 방송.

### 3.1 채널 역할 분리

기존 STOMP 인프라(`graphSeq`/`sinceSeq`, Redis 보존, Presence)를 그대로 확장한다 — 새 서버 인프라를 만들지 않는다.

```
/topic/workflow/{id}              (Durable — 기존 채널 재사용)
  └─ payload.changeType: 'node' | 'edge' | 'annotation'
      annotation 완성 시(POST/PATCH 성공 후) 1회 브로드캐스트

/topic/workflow/{id}/presence     (Volatile — 기존 presence 채널 확장)
  └─ 기존: JOIN, LEAVE, CURSOR_MOVED, NODE_EDITING, HEARTBEAT
  └─ 신규: ANNOTATION_DRAWING       ← 이번에 추가
      payload: { userId, annotationType: 'freehand', points: [[x,y],...], inProgress: true }
```

### 3.2 백엔드 추가 작업

```
com.flowmat.collaboration/  (기존 패키지에 추가)
├── dto/
│   └── AnnotationDrawingPresenceMessage.java   # 신규 — points, userId
└── controller/
    └── PresenceController.java                 # 기존 파일에 핸들러 1개 추가
        # @MessageMapping("/workflow/{workflowId}/presence/annotation-drawing")
        # DB 저장 없이 즉시 브로드캐스트만 (기존 presence 패턴 그대로)
```

**중요**: `ANNOTATION_DRAWING` 메시지는 DB에 저장하지 않는다 — Redis에도 영속하지 않고 단순 relay. 완성된 annotation은 반드시 2.3절의 POST/PATCH 엔드포인트를 통해서만 저장된다. 두 경로가 절대 섞이지 않도록 주의.

### 3.3 프론트 추가 작업

```
features/annotation-freehand-draw/model/
├── useFreehandDraw.ts              # 기존 계획 문서 §3.4 그대로
└── useFreehandPresenceBroadcast.ts # 신규 — pointermove를 throttle(200ms)해서 volatile 채널 전송

widgets/canvas-workspace/ui/
└── RemoteAnnotationPreview.tsx      # 신규 — 다른 사용자의 ANNOTATION_DRAWING 수신 시 반투명 프리뷰 렌더
```

```ts
// useFreehandPresenceBroadcast.ts (신규)
export function useFreehandPresenceBroadcast(workflowId: string) {
  const stompClient = useStompClient(); // 기존 협업 인프라의 클라이언트 재사용
  const broadcast = useMemo(
    () => throttle((points: [number, number][]) => {
      stompClient.publish({
        destination: `/app/workflow/${workflowId}/presence/annotation-drawing`,
        body: JSON.stringify({ annotationType: 'freehand', points, inProgress: true }),
      });
    }, 200), // instldraw 패턴과 동일한 200ms
    [workflowId],
  );
  return broadcast;
}
```

`useFreehandDraw`의 `onPointerMove` 안에서 로컬 상태 갱신과 동시에 `broadcast(points)`를 호출 — 로컬 렌더링과 원격 방송이 같은 이벤트에서 함께 트리거된다.

### 3.4 충돌 해결 (확정: 기존 version/versionNonce 방식 그대로)

`canvas_annotation`의 `version`/`version_nonce`/`is_deleted`는 `CanvasAnnotationReconcileService`(2.2절)에서 excalidraw reconcile 패턴을 그대로 적용한다 — `process`/`edge`에 이미 동일한 방식이 있다면 공통 유틸로 추출해서 재사용, 없다면 이번에 새로 만드는 로직이 향후 `process`/`edge`에도 재사용 가능한 형태로 작성한다.

```java
// CanvasAnnotationReconcileService.java
public boolean shouldDiscardRemote(CanvasAnnotation local, CanvasAnnotation remote) {
    if (local == null) return false;
    if (local.getVersion() > remote.getVersion()) return true;
    if (local.getVersion() == remote.getVersion()
        && local.getVersionNonce() <= remote.getVersionNonce()) return true;
    return false;
}
```

---

## 4. 작업 묶음 3 — 프론트 캔버스 통합

### 4.1 파일 생성 순서

```
1) entities/canvas-annotation/model/types.ts
2) entities/canvas-annotation/api/canvasAnnotationApi.ts
3) entities/canvas-annotation/model/annotationQueries.ts   (기존 canvas 쿼리에 병합 고려)
4) entities/canvas-annotation/ui/ShapeAnnotationNode.tsx
5) entities/canvas-annotation/ui/TextAnnotationNode.tsx
6) entities/canvas-annotation/ui/FreehandAnnotationNode.tsx
7) entities/canvas-annotation/ui/nodeTypes.ts               (위 3개 컴포넌트 등록)
8) features/annotation-create-shape/model/useCreateShapeAnnotation.ts
9) features/annotation-text-insert/model/useInsertTextAnnotation.ts
10) features/annotation-freehand-draw/model/useFreehandDraw.ts
11) features/annotation-freehand-draw/model/useFreehandPresenceBroadcast.ts (3.3절)
12) features/annotation-resize/model/useResizeAnnotation.ts
13) features/canvas-align/model/useAlignSelection.ts
14) features/canvas-distribute/model/useDistributeSelection.ts
15) features/canvas-group/model/useGroupAnnotations.ts
16) widgets/canvas-toolbar/ui/CanvasToolbar.tsx              (4.2절 — 상단 통합)
17) widgets/canvas-toolbar/ui/ToolButton.tsx
18) widgets/canvas-toolbar/ui/AlignmentButtonGroup.tsx
19) widgets/canvas-toolbar/ui/GroupButton.tsx
20) (기존) WorkflowCanvasPage.tsx — nodeTypes 병합 + CanvasToolbar 삽입 지점만 수정
```

이미지 annotation 제외가 확정이므로 `ImageAnnotationNode.tsx`, `useInsertImageAnnotation.ts`는 이번 phase에서 생성하지 않는다 (설계 문서 §3.2에서 해당 항목 제거).

### 4.2 캔버스 툴바 배치 (확정: 기존 워크스페이스 상단 통합)

별도 플로팅 패널이 아니라 **기존 워크스페이스 상단 바에 통합**하는 것으로 확정됐으므로, 기존 상단 네비게이션/헤더 컴포넌트를 먼저 확인 후 그 옆에 `CanvasToolbar`를 삽입한다.

```tsx
// (기존) WorkflowCanvasPage.tsx 또는 상단 헤더 컴포넌트 — 최소 침습 diff
<WorkspaceTopBar>
  {/* 기존 요소들 (워크스페이스 이름, 저장상태, 공유 버튼 등) */}
  <CanvasToolbar />   {/* 신규 — 도형/텍스트/펜 도구 + 정렬/그룹 버튼 */}
</WorkspaceTopBar>
```

**확인 필요**: 실제 상단 바 컴포넌트명을 nekopunch가 로컬에서 확인해서 알려주면 정확한 삽입 지점을 다시 잡는다 — 이 문서에서는 임시로 `WorkspaceTopBar`로 표기.

### 4.3 xyflow 통합 (설계 문서 §3.3 그대로, 범위만 축소)

```tsx
// entities/canvas-annotation/ui/nodeTypes.ts
export const annotationNodeTypes = {
  'annotation-shape': ShapeAnnotationNode,
  'annotation-text': TextAnnotationNode,
  'annotation-freehand': FreehandAnnotationNode,
  // 'annotation-image': ImageAnnotationNode,  ← 이번 phase 제외
};
```

### 4.4 align/group 로직 (설계 문서 §3.5 그대로, 확정 범위에 포함됨)

`useAlignSelection`, `useDistributeSelection`, `useGroupAnnotations` 모두 1차 범위에 포함이 확정됐으므로 그대로 구현한다.

### 4.5 프론트 단위 테스트 (확정: 핵심 로직에 추가)

```
features/canvas-align/model/__tests__/
└── computeAlignedPosition.test.ts     # ★ 순수 함수 — 좌/중/우/상/중/하 6방향 좌표 계산 검증

features/annotation-freehand-draw/model/__tests__/
└── screenToFlowPosition.integration.test.ts  # xyflow 좌표 변환 래핑 로직 검증 (필요 시)
```

`computeAlignedPosition`이 순수 함수로 분리되어 있어야(설계 문서 §3.5에 명시) 테스트가 쉽다 — 컴포넌트에서 분리해서 별도 파일로 유지.

---

## 5. 작업 묶음 4 — 권한 적용 (확정: viewer 읽기전용 / editor 이상 CRUD)

### 5.1 백엔드

2.3절 표에 이미 반영됨 — `@PreAuthorize("@projectAccessService.canWrite(...)")`를 모든 쓰기 엔드포인트(POST/PATCH/DELETE/batch)에 적용, GET은 `canRead(...)`(viewer 이상 허용).

### 5.2 프론트

```tsx
// widgets/canvas-toolbar/ui/CanvasToolbar.tsx
const { role } = useWorkflowPermission(); // 기존 권한 훅 재사용
const canEdit = role === 'editor' || role === 'owner';

return (
  <div className="canvas-toolbar">
    <ToolButton icon="cursor" ... />
    {canEdit && (
      <>
        <ToolButton icon="shape" onClick={...} />
        <ToolButton icon="text" onClick={...} />
        <ToolButton icon="pen" onClick={...} />
        <AlignmentButtonGroup />
        <GroupButton />
      </>
    )}
  </div>
);
```

viewer는 도구 버튼 자체가 안 보이거나 비활성화 상태로 렌더 — 서버 403은 최후 방어선이고, 1차 방어는 UI 레벨에서 처리한다.

---

## 6. 작업 묶음 5 — 테마 시스템 (독립 트랙, 확정: 앱 전체 light/dark/system)

이 트랙은 작업 묶음 1~4와 파일이 겹치지 않으므로 병행 진행 가능하다. 단, `CanvasToolbar` 등 신규 컴포넌트를 작업 묶음 3에서 만들 때 테마 토큰(CSS 변수)을 처음부터 사용해야 나중에 재작업이 없다 — 순서상 테마의 "토큰 정의" 부분만 먼저 끝내두는 게 유리하다.

### 6.1 권장 순서 (작업 묶음 3보다 먼저 끝내야 하는 부분)

```
1) shared/config/theme/tokens.ts          # CSS 변수 정의 (color, bg, border 등 라이트/다크 값 쌍)
2) shared/config/theme/ThemeProvider.tsx  # light/dark/system 감지 + 적용
3) shared/store/themeStore.ts             # 사용자 선택 저장(zustand + localStorage persist)
4) app/providers에 ThemeProvider 장착
5) (병행 가능) 기존 컴포넌트들 하드코딩된 색상값 → CSS 변수로 치환 (범위가 넓으므로 별도 후속 작업으로 티켓 분리 가능)
6) widgets/settings 또는 상단 네비에 테마 토글 UI 추가
```

### 6.2 작업 묶음 3과의 접점

신규로 만드는 `CanvasToolbar`, `ShapeAnnotationNode` 등은 6.1의 1)~2)가 끝난 뒤 착수하면 처음부터 `var(--color-bg-surface)` 같은 토큰을 쓸 수 있어 다크모드 대응 재작업이 없다. 순서 권장: **6.1의 토큰 정의(1번)만 먼저 끝내고, 이후 작업 묶음 3과 6.1의 나머지(2~6번)를 병행**.

---

## 7. 전체 실행 순서 요약

```
Step 1: Flyway V8 마이그레이션 작성 + 적용                    [작업묶음 1]
Step 2: 테마 토큰 정의만 먼저 (tokens.ts)                      [작업묶음 5-1]
Step 3: 백엔드 canvas_annotation 패키지 전체 구현 + 단위테스트   [작업묶음 1]
Step 4: 실시간 동기화 백엔드 확장 (durable + volatile)          [작업묶음 2]
Step 5: 프론트 entities/canvas-annotation 구현                 [작업묶음 3]
Step 6: 프론트 features (shape/text/freehand/align/group)      [작업묶음 3]
Step 7: 실시간 동기화 프론트 (broadcast + remote preview)       [작업묶음 2]
Step 8: CanvasToolbar 구현 + 기존 상단바 통합                   [작업묶음 3]
Step 9: 권한 분기 적용 (프론트 + 백엔드 재검증)                  [작업묶음 4]
Step 10: 프론트 단위테스트 (computeAlignedPosition 등)          [작업묶음 3]
Step 11: 테마 시스템 나머지(Provider, 토글 UI, 기존 컴포넌트 치환) [작업묶음 5]
Step 12: 백엔드 테스트 + 프론트 빌드/린트 전체 통과 확인          [전체]
Step 13: 배포 (기능 플래그 없음 — 즉시 전체 노출)                [전체]
```

---

*문서 끝 — 이 실행계획은 §0의 확정 결정을 전제로 하며, 결정이 바뀌면 §0부터 갱신 후 해당 영향 범위만 재조정할 것.*
