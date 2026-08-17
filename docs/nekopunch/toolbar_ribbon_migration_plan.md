# FlowMat — 툴바 → 리본 UI 마이그레이션 지침 (toolbar_ribbon_migration_plan)

> AI(Claude Code)가 여러 세션에 걸쳐 이 작업을 일관되게 이어갈 수 있도록 만든 지침서.
> 팀원 문서 `docs/seolly/flowmat_annotation_execution_plan.md`와 겹치는 영역이 있으므로,
> 작업 전 반드시 그 문서와 `docs/seolly/flowmat_freeform_canvas_plan.md`를 같이 확인할 것.

---

## ⚠️ 팀원(seolly)과 논의가 필요한 부분

아래 항목은 nekopunch 혼자 판단으로 확정하지 않고, 작업 전/중 반드시 팀원과 맞춰야 한다.
**클로드 코드는 이 목록에 있는 작업에 진입하기 전, 이미 논의가 끝났는지 nekopunch에게
먼저 확인할 것 — 문서에 논의 완료 여부가 안 적혀 있으면 미완료로 간주한다.**

| # | 논의 필요 항목 | 이유 | 상태 |
|---|---|---|---|
| 1 | `widgets/` 레이어를 이 저장소에 처음 도입하는 것 자체 | 실제 코드에 지금까지 없던 FSD 레이어를 nekopunch가 단독으로 신설하는 것 — 팀 전체 컨벤션에 영향을 줄 수 있음. 0-1절에서 "계획 문서 참조하면 된다"는 답은 받았으나, `widgets/` 신설 자체를 명시적으로 확인한 것은 아님 | 미완료 |
| 2 | Annotate 탭 작업 시 기존 인라인 로직(`WorkflowCanvasPage.tsx`/`CanvasViewport.tsx`)을 리본 쪽으로 옮기는 범위 | 이 파일들은 seolly도 계속 작업 중인 영역(annotation 기능 담당). 리본 작업이 같은 파일을 동시에 건드리면 병합 충돌 위험 큼 | 미완료 — 9절 Step 3 로그 참고 (2026-08-18) |
| 3 | Annotate 탭에서 정말 "실제 기능까지 연결"할지, 이번 스프린트는 "뼈대만"으로 그칠지 | 3절 의존관계 문단에서 백엔드는 준비됐다고 판단했지만, 이건 nekopunch의 harness 검증 결과일 뿐 — annotation 기능 자체의 최종 완성도는 담당자(seolly)가 더 잘 앎 | 미완료 — 9절 Step 3 로그 참고 (2026-08-18) |
| 4 | `nekopunch` 브랜치를 리본 작업에도 계속 재사용할지, 새 브랜치를 팔지 | 0절에 "재사용 또는 컨벤션 확인 후 결정"이라고만 되어 있고 실제 확인은 안 됨 | 미완료 |
| 5 | Step 6(기존 topbar 완전 제거)을 실행해도 되는 시점 | 다른 팀원이 기존 topbar의 버튼을 참조하는 코드를 작업 중일 수 있음 — 제거 전 전체 팀에 공지 필요 | 미완료 |
| 6 | `handleGroup`/`handleUngroup`이 신규 editor 엔진 경로(`editorCommandApiRef`)를 지원하지 않는 이유 | 의도적으로 아직 안 만든 건지, 놓친 건지 확인 필요 — 리본에서 Group 버튼을 누르면 editor 엘리먼트 선택 시 아무 반응이 없을 수 있음 (3-1절 참고) | 미완료 — 9절 Step 3 로그 참고 (2026-08-18, 전제 자체가 낡은 정보였음) |
| 7 | Grid snap 토글 UI를 새로 만드는 것 | `WORKSPACE_EDITOR_GRID_SIZE`는 상수로 고정되어 있고 사용자가 켜고 끄는 UI가 없음 — 이걸 리본에 추가하는 게 이번 스프린트 범위인지, 아니면 팀원이 이미 계획 중인지 확인 필요 (3-2절 참고) | 미완료 — 9절 Step 3 로그 참고 (2026-08-18) |

논의가 끝나면 이 표의 "상태"를 "완료(날짜)"로 갱신하고, 결론을 해당 절(0절, 3절 등)에도 반영한다.

### 논의 로그

nekopunch가 팀원과 논의한 내용을 시간순으로 여기에 남긴다. 위 표의 번호(#)와 연결해서 적는다.
**클로드 코드는 새 로그가 추가되면 위 표의 해당 항목 "상태"도 같이 갱신할 것.**

```
(아직 없음 — 논의가 끝나는 대로 아래 형식으로 추가)

#N — YYYY-MM-DD
결론: (한 줄 요약)
상세: (필요하면 몇 줄 더)
반영 위치: (이 결론을 문서 어디에 반영했는지, 예: "0절 표 수정" / "3절에 추가")
```

---

## 0. 확정된 결정 (변경 시 이 표부터 갱신)

| 항목 | 확정값 |
|---|---|
| UI 컨셉 | AutoCAD 리본(탭 + 그룹 + 아이콘 버튼) |
| 담당자 | nekopunch |
| 위치 | `widgets/canvas-toolbar/` (FSD widgets 레이어) — **알려진 리스크: 아래 참고** |
| 팀원 설계와의 관계 | **부분 참고** — `docs/seolly` 계획 문서의 기능 목록(Draw/Align/Group/Grid)은 그대로 따르되, 계획에 있던 컴포넌트(`CanvasToolbar`/`ToolButton` 등)는 실제 코드에 없으므로 흡수 대상이 없다. 대신 `WorkflowCanvasPage.tsx`/`CanvasViewport.tsx`에 이미 인라인된 실제 로직을 리본 껍데기로 재배치한다. 상세는 0-1절, 3절 참고 |
| 아이콘 라이브러리 | lucide-react |
| 작업 단위 | Step 단위로 쪼개서 진행, Step마다 별도 커밋 |
| 브랜치 | `nekopunch` (Phase 1/2 협업 작업과 동일 브랜치 재사용 또는 팀 컨벤션 확인 후 결정) |
| 최상단 타이틀 바 | 건드리지 않음 (워크플로우 이름/상태/Home 링크는 리본과 별개로 그대로 유지) |
| 검증 방식 | 매 Step마다 `npm run build` + 실제 화면 확인 필수. 컴파일/빌드 성공만으로 완료 판단 금지 (Phase 2에서 sockjs 크래시 사례 참고 — 빌드 성공해도 런타임 크래시 가능) |

### 0-1. 알려진 리스크 — `widgets/` 레이어와 실제 코드 패턴의 불일치

nekopunch의 개인 harness(`my-harness` MCP, `canvas-node-graph-patterns` /
`frontend-patterns` 스킬, 2026-08-09 기준 실제 코드 검증됨)에 따르면:

- FlowMat 프론트엔드에는 **`widgets/` 레이어가 실제로 존재하지 않는다** (전체 트리 확인 결과 없음).
- `flowmat_annotation_execution_plan.md`가 계획했던 `widgets/canvas-toolbar/`,
  `features/annotation-*/`, `entities/canvas-annotation/ui/{Shape,Text,Freehand}AnnotationNode.tsx`
  분리 구조는 **실제로 구현되지 않았다.** 실제로는 annotation 관련 로직 전부가
  `pages/workspace/ui/CanvasAnnotationNode.tsx` (단일 컴포넌트) +
  `WorkflowCanvasPage.tsx`/`CanvasViewport.tsx`에 인라인되어 있다.
- 계획대로 분리된 유일한 부분은 순수 좌표/기하 계산 함수
  (`entities/canvas-annotation/model/annotationLayout.ts`)뿐이다.

**그럼에도 이 문서는 팀원(seolly) 확인 하에 계획 문서(`widgets/canvas-toolbar/`) 그대로 진행한다.**
2026-08-10 기준 nekopunch가 seolly에게 직접 확인 — "계획 문서 참조하면 된다"는 답변을 받음.
이는 계획을 폐기하지 않고 여전히 유효한 설계로 본다는 뜻으로 해석하여 진행하되,
아래 사항을 유의한다:

- `widgets/` 폴더를 새로 만드는 것은 **이 저장소에서 지금까지 없던 첫 사례**다.
  다른 팀원 코드가 이 폴더를 참조하지 않으므로 기존 코드와 충돌할 일은 없지만,
  "왜 이 프로젝트에 갑자기 `widgets/`가 생겼는지"에 대한 맥락을 이 문서와 커밋 메시지에
  남겨서 다른 팀원이 당황하지 않게 한다.
- annotation 관련 실제 기능(Step 3, Annotate 탭)을 구현할 때는 **팀원 계획의 컴포넌트명이
  아니라 실제로 존재하는 `CanvasAnnotationNode.tsx` 등을 기준으로 통합 방법을 다시 판단한다**
  — 계획에 있는 `ToolButton`/`AlignmentButtonGroup`/`GroupButton`/`GridSnapControl`은
  코드에 존재하지 않으므로 "흡수"가 아니라 "이 문서의 리본 뼈대 안에서 새로 구현하며
  기존 인라인 로직을 참조"하는 작업이 된다. Step 3 진행 전 반드시 재확인.
- React Flow 표준 훅(`useNodesState`/`useEdgesState`)을 안 쓰는 것도 의도된 설계다
  (원격 패치, 인라인 편집 충돌 지연 처리 때문) — 리본 작업 중 이 커스텀 상태 통합을
  "단순화"하겠다고 건드리지 않는다.

---

## 1. 탭 구조 (전체 그림)

```
[Home]         — 기존 workspace-topbar 버튼 대부분 이전 (Tools/Modify/Layout/Export)
[Annotate]     — 레거시 annotation(Shape/Text/Freehand) + 신규 flowmat-editor 도구(Rectangle 등) 공존, Align/Group/Arrange/Grid — 상세는 3절 (2026-08-16 갱신)
[View]         — Navigation 그룹(Fit View/Select All) — Seoly가 a7560f2에서 이미 채움
                  (2026-08-18 Step 5 확인 시점 기준, 9절 로그 참고)
[Collaborate]  — Presence 아바타, 워크플로우 전환 select, 저장 상태 — Step 4에서 이전 완료
```

각 탭의 상세 그룹/버튼 매핑은 아래 2절, 3절 참고.

---

## 2. Home 탭 — 그룹/버튼 매핑

기존 `WorkflowCanvasPage.tsx`의 `workspace-topbar` 안 버튼들을 그대로 옮기되, 그룹으로 나누고 아이콘을 붙인다.

| 그룹 | 버튼 | 아이콘(lucide-react) | 기존 소스 위치 |
|---|---|---|---|
| Tools | Pointer | `MousePointer2` | `activeTool === 'select'` |
| Tools | (노드 타입별 도구) | `paletteDefinitions`의 아이콘 필드 있으면 사용, 없으면 `Shapes` | `paletteDefinitions.map(...)` |
| Modify | Undo | `Undo2` | `undo()` |
| Modify | Redo | `Redo2` | `redo()` |
| Layout | Layout TB | `AlignVerticalJustifyStart` | `applyLayout('TB')` |
| Layout | Layout LR | `AlignHorizontalJustifyStart` | `applyLayout('LR')` |
| Export | Export JSON | `FileJson` | `exportJson()` |
| Export | Export PNG | `Image` | `exportPngRef.current(...)` |
| Tools | Add Node | `Plus` | `addNode()` |

주의: 버튼의 `disabled`/`title` 조건(예: `past.length === 0`일 때 Undo 비활성)은 원래 로직 그대로 유지할 것 — 텍스트→아이콘 전환만 하고 동작 조건은 바꾸지 않는다.

---

## 3. Annotate 탭 — 매핑 (2026-08-16 기준 재작성 — 이전 버전은 낡은 정보였음)

### 3-0. 이 절이 다시 쓰여진 이유

2026-08-10 작성 당시엔 "annotation 로직 전부가 인라인, 계획된 컴포넌트는 존재하지 않는다"가
사실이었다. 하지만 그 사이 팀원이 아래를 새로 구축했다 (2026-08-16 프로젝트 zip 재확인):

- **`flowmat_frontend/src/lib/flowmat-editor/`** — 완전히 새로운 자체 벡터 그래픽 엔진.
  Rectangle/Ellipse/Line/Text/Group 엘리먼트, HitTest, SnapManager, HistoryManager,
  SVG 렌더러(`SvgRenderer.ts`), Editor 코어(`Editor.ts`, `EditorStore.ts`)까지 자체 구현.
- **`WorkspaceEditorLayer.tsx`** (1486줄, 신규) — 이 엔진을 캔버스에 연결하는 레이어.
  `onCommandReady`로 `WorkspaceEditorCommandApi`를 상위(`WorkflowCanvasPage.tsx`)에 노출:
  ```ts
  groupSelected() / ungroupSelected()
  alignSelected(direction) / distributeSelected(axis)
  deleteSelected() / duplicateSelected()
  bringSelectedToFront() / sendSelectedToBack()
  undo() / redo() / canUndo() / canRedo()
  ```
- 도구가 두 갈래로 분리됨:
    - `ANNOTATION_TOOL_DEFINITIONS` — 기존 협업용 주석(Shape/Text/Freehand), REST 배치 기반
    - `EDITOR_TOOL_DEFINITIONS` — 신규 editor 엔진 도구(Rectangle/Ellipse/Triangle/Line/
      Connector/Text), 이미 lucide-react 아이콘까지 매핑되어 있음
      (`Square`/`Circle`/`Triangle`/`Minus`/`Waypoints`/`TypeIcon`)

**0-1절의 "annotation은 전부 인라인, widgets 레이어 없음"이라는 진단 자체는 여전히 유효하다**
(리본 관련 `widgets/`는 이번에도 없었음, editor 관련 코드는 `lib/`에 있음 — FSD 레이어가
아니라 자체 판단으로 만든 `lib/` 하위 모듈). 다만 "가져다 옮길 로직이 흩어져 있다"는 전제는
더 이상 맞지 않는다 — `WorkspaceEditorCommandApi`가 이미 깔끔한 인터페이스로 정리되어 있다.

### 3-1. 실제 구조 — 두 시스템이 공존

`WorkflowCanvasPage.tsx`의 `handleAlign`/`handleDistribute`가 실제로 어떻게 짜여 있는지 보면
이 공존 구조가 명확하다 (2026-08-16 기준 실제 코드):

```ts
async function handleAlign(direction: AlignDirection) {
  if (editorSelection.elements.length >= 2) {
    editorCommandApiRef.current?.alignSelected(direction)   // 신규 editor 엔진 경로
    return
  }
  if (!canEditAnnotations) return
  const selected = getSelectedAnnotations()
  if (selected.length < 2) return
  // ... computeAlignedPosition + batchAnnotationMutation  // 레거시 annotation 경로
}
```

즉 **선택된 게 editor 엘리먼트인지 레거시 annotation인지에 따라 자동으로 분기**된다.
`handleGroup`/`handleUngroup`은 아직 레거시 annotation 경로만 있고
(`editorCommandApiRef.current?.groupSelected()`로의 분기가 없음 — Step 3 작업 시 이 부분이
두 경로 다 필요한지 재확인할 것).

### 3-2. 그룹/버튼 매핑 (최신)

| 그룹 | 버튼 | 아이콘(lucide-react) | 연결 대상 |
|---|---|---|---|
| Draw (annotation) | Shape / Text / Freehand | 기존 아이콘 없음 — `Shapes`/`TypeIcon`/`Pencil` 등 신규 지정 | `ANNOTATION_TOOL_DEFINITIONS` (레거시 경로 유지) |
| Draw (editor) | Rectangle / Ellipse / Triangle / Line / Connector / Text | `Square`/`Circle`/`Triangle`/`Minus`/`Waypoints`/`TypeIcon` (이미 `EDITOR_TOOL_DEFINITIONS`에 매핑됨, 그대로 재사용) | `EDITOR_TOOL_DEFINITIONS` |
| Align | 좌/중/우/상/중/하 정렬, 분산(distribute) | `AlignHorizontalJustifyStart` 등 lucide 정렬 아이콘 세트 | `handleAlign(direction)` / `handleDistribute(axis)` — 이미 두 경로 분기 내장, 그대로 호출만 하면 됨 |
| Group | Group / Ungroup | `Group`/`Ungroup` (lucide-react) | `handleGroup()` / `handleUngroup()` — 현재 레거시 경로만 있음, 3-1절 참고 |
| Arrange | Bring to Front / Send to Back / Duplicate | `BringToFront`/`SendToBack`/`Copy` | `editorCommandApiRef.current?.bringSelectedToFront()` 등 — editor 엔진 전용, `editorSelection.elements.length` 로 활성화 여부 판단 |
| Grid | Grid Snap 표시/토글 | `Grid3x3` | `WORKSPACE_EDITOR_GRID_SIZE`(=8) 상수 사용 중, 토글 UI는 없음 — 이번에 새로 만들어야 함 |

권한 체크(`canEditAnnotations`)는 기존 로직 그대로 유지 — viewer는 버튼 비활성 처리.
editor 엔진 관련 버튼(Arrange 그룹 등)의 활성/비활성은 `editorSelection.elements.length`와
`editorCommandApiRef.current`의 존재 여부로 판단한다 (1405줄 `duplicateSelected` 버튼의
`disabled` 조건이 이미 이 패턴을 쓰고 있으므로 그대로 참고).

### 3-3. 리본으로 옮길 때 지켜야 할 것

- `handleAlign`/`handleDistribute`/`handleGroup`/`handleUngroup`/`handleNodePick` 등
  **기존 핸들러 함수 내부 로직은 수정하지 않는다** — 리본 버튼의 `onClick`이 이 함수들을
  그대로 호출하도록 연결만 한다 (Step 2에서 지킨 원칙과 동일).
- `editorCommandApiRef`, `editorSelection` 등 editor 엔진 관련 상태/ref는 절대 새로 만들지
  않는다 — `WorkflowCanvasPage.tsx`에 이미 있는 것을 그대로 참조한다.
- Grid snap 토글 UI(3-2절 Grid 그룹)는 실제로 없는 걸 새로 만드는 유일한 항목이다 —
  `WORKSPACE_EDITOR_GRID_SIZE` 상수를 `useState`로 바꿔서 리본 토글과 연결할지, 다른 방식으로
  할지는 Step 3 진행 시 판단. 이건 팀원 논의 항목(최상단 표 참고)에 새로 추가해야 할 수 있음.
- `flowmat-editor` 자체(`lib/flowmat-editor/` 하위)는 절대 건드리지 않는다 — 리본 작업은
  이 엔진을 "호출하는 쪽"이지 엔진 자체를 수정하는 작업이 아니다.

### 3-4. 의존 관계 (갱신)

annotation 데이터 모델(백엔드)은 여전히 준비되어 있다고 판단됨
(`CanvasAnnotationReconcileService.java`, `CanvasAnnotation.java`, `V11__canvas_annotation.sql`
— 2026-08-09 harness 검증, 이번 재확인에서 뒤집을 근거 없음). 프론트의 editor 엔진도
`WorkspaceEditorCommandApi`로 이미 준비되어 있으므로, **Step 3는 뼈대가 아니라 실제 기능
연결까지 곧바로 진행 가능** — 오히려 이전 버전 문서가 예상한 것보다 작업이 쉬워졌다
(옮길 로직이 흩어져 있지 않고 인터페이스로 정리되어 있으므로).

Step 3 진행 직전에 한 번 더 최신 상태를 재확인할 것 — 이 절 작성 이후 코드가 또 바뀌었을
가능성을 항상 열어둔다 (0-1절 → 3절, 이번이 두 번째 개정이다).

---

## 4. Collaborate 탭 — 매핑

| 그룹 | 내용 | 기존 소스 위치 |
|---|---|---|
| Presence | 접속자 아바타 목록 | `remoteCursors` 렌더링 부분 |
| Status | 저장 상태 (Saving/Saved) | `savedLabel` |
| Workflow | 워크플로우 전환 select | `workflow-switcher` |

---

## 5. 공통 컴포넌트 (Step 1에서 생성)

경로: `flowmat_frontend/src/widgets/canvas-toolbar/ui/`

```
Ribbon.tsx          — 최상위. tabs, activeTabId, onTabChange
RibbonTab.tsx        — 탭 헤더 버튼
RibbonGroup.tsx      — 그룹 컨테이너 + 라벨 + 구분선
RibbonButton.tsx     — 아이콘 버튼 (아이콘 위/라벨 아래, active/disabled 상태)
types.ts             — RibbonTabDefinition / RibbonGroupDefinition / RibbonButtonDefinition
```

이 5개는 Annotate 탭에서 실제 인라인 로직을 재배치할 때도 그대로 재사용된다 —
즉 `RibbonGroup`이 정렬/그룹/그리드 버튼들을 감싸는 바깥 레이아웃 역할을 한다
(3절 참고 — 계획에 있던 `AlignmentButtonGroup` 등의 컴포넌트 자체는 존재하지 않는다).

### 5-1. 확장 규칙 — 새 버튼/그룹/탭 추가 시 반드시 지킬 것

경로: `flowmat_frontend/src/widgets/canvas-toolbar/config/ribbonConfig.ts`

이후 이 프로젝트에서 리본에 기능을 추가하는 모든 작업(이 문서의 Step 2 이후는 물론,
이 문서와 무관한 미래의 다른 스프린트 작업까지 포함)은 아래 규칙을 따른다.
**클로드 코드는 리본에 새 기능을 추가하는 요청을 받으면 이 절을 먼저 읽고 시작할 것.**

- 탭/그룹/버튼의 **구조 정의**는 전부 `ribbonConfig.ts` 한 파일에 모은다.
  `Ribbon.tsx`, `WorkflowCanvasPage.tsx` 등 다른 파일에 버튼 정의를 직접 하드코딩하지 않는다.
- `ribbonConfig.ts`에는 `onClick` 같은 **실제 핸들러 로직을 직접 넣지 않는다.**
  구조(id/label/icon/그룹 배치)만 정의하고, 핸들러는 `buildRibbonTabs(handlers)` 같은 함수로
  상위 컴포넌트에서 주입한다. 이렇게 해야 `ribbonConfig.ts`가 로직 변경 없이도
  레이아웃 변경만으로 재사용 가능하다.
- **새 버튼 하나를 추가하는 작업은 `ribbonConfig.ts`의 해당 그룹 배열에
  항목 하나를 추가하는 것으로 끝나야 한다.** 여러 파일을 돌아다니며 수정해야 한다면
  설정 구조가 잘못된 것이니 구조부터 다시 점검한다.
- 새 탭이나 새 그룹을 추가할 때도 동일 — `ribbonConfig.ts`의 배열에 항목을 추가하는 방식.

---

## 6. 새 리본 기능이 백엔드를 필요로 할 때 — 협업 원칙

이 문서의 Step 1~6 이후, 리본에 완전히 새로운 기능(팀원의 annotation 설계 범위 밖의 것)을
추가하게 되면 백엔드 변경이 같이 필요한 경우가 생긴다. 이때는 아래 순서를 따른다.
**클로드 코드는 리본에 백엔드 연동이 필요한 새 기능을 추가하는 요청을 받으면
이 절을 먼저 읽고 판단할 것.**

### 6-1. 먼저 판단할 것 — 백엔드 작업이 실제로 필요한가

- 이미 있는 API를 호출만 하는 버튼이면 백엔드 작업 불필요. 바로 프론트 작업으로 진행.
- 새 엔드포인트, 새 테이블/컬럼, 새 STOMP destination 등이 필요하면 아래 6-2부터 따른다.

### 6-2. 순서 — "분석/설계 문서 → 실행계획 문서 → 코드" 3단계

이 프로젝트에서 지금까지 실제로 써온 패턴(repo_analysis → CLAUDE.md/실행계획 → 코드)을
백엔드가 필요한 새 기능에도 동일하게 적용한다. 순서를 건너뛰지 않는다.

1. **설계 문서 작성** — `docs/nekopunch/` 또는 팀원과 합의된 위치에
   무엇을 만들지, 왜 필요한지, 기존 스키마/API와 어떻게 연결되는지 정리
   (팀원 문서 `flowmat_freeform_canvas_plan.md`처럼 "왜"를 담는 문서)
2. **실행계획 문서 작성** — 이 문서(`toolbar_ribbon_migration_plan.md`)나
   팀원 문서(`flowmat_annotation_execution_plan.md`)처럼
   "확정된 결정 표 + 작업 순서"를 담는 문서. 백엔드/프론트 작업 순서와 의존관계를 명시
3. **코드 작업** — 실행계획 문서를 클로드 코드 프롬프트로 변환해 Step 단위로 진행

이 3단계를 건너뛰고 바로 코드부터 짜지 않는다 — 특히 백엔드 스키마 변경은
한 번 배포되면 되돌리기 번거로우므로, 설계 단계에서 충분히 검토한다.

### 6-3. 담당 분리 원칙

- 백엔드 작업은 nekopunch와 팀원이 같이 진행한다.
- 새 기능이 필요로 하는 백엔드 작업 범위를 실행계획 문서에 명시할 때,
  기존 담당 영역(예: 협업 인프라는 nekopunch, annotation 데이터 모델은 팀원)과
  겹치는지 먼저 확인한다. 겹치면 실행계획 문서 작성 전에 담당자끼리 먼저 합의한다
  (문서만 보고 임의로 역할을 배정하지 않는다).
- 담당이 불명확한 새 영역이면, 실행계획 문서의 "확정된 결정" 표에
  담당자를 명시적으로 적어둔다 (팀원 문서의 관행을 따름).

### 6-4. 기존 백엔드 구조와 정합성 확인

새 백엔드 작업을 시작하기 전에 반드시 확인:

- `docs/nekopunch/CLAUDE.md` (또는 최신 협업 인프라 상태 문서, `collab_status_*.md`류) —
  기존 STOMP destination 규칙, Room 모델, 인증 방식과 충돌하지 않는지
- `docs/seolly/flowmat_freeform_canvas_plan.md` §2 — 기존 스키마 설계 원칙
  (version/versionNonce, fractional index 등)과 일관되게 갈지, 새 패턴을 쓸지 결정
- 기존 REST/WebSocket 역할 분리 원칙 — "WebSocket은 실시간 릴레이만, 영속화는 REST/배치가
  담당한다"는 원칙(Phase 1/2에서 확립)이 새 기능에도 적용되는지 검토

---

## 7. Step 순서 (매 Step마다 별도 커밋)

```
Step 1: 리본 뼈대 (탭 4개 전환만 되는 빈 리본, widgets/canvas-toolbar/에 생성)
Step 2: Home 탭 — 기존 workspace-topbar 버튼 이전 + 아이콘 적용
Step 3: Annotate 탭 — WorkspaceEditorCommandApi(align/group/arrange 등) + 레거시 annotation 핸들러 연결 (3절 표 기준, 2026-08-16 갱신)
Step 4: Collaborate 탭 — Presence/워크플로우 전환 이전
Step 5: View 탭 — 원안은 "자리만 유지"였으나 실제로는 Seoly가 a7560f2에서 이미 채워둠
  (Fit View/Select All). 2026-08-18 확인 결과 검증만 진행 — 9절 로그 참고
Step 6: 기존 workspace-topbar의 버튼 영역 완전 제거, 타이틀 바만 남기고 정리
```

Step 6은 1~5가 전부 검증된 뒤에만 진행한다 (기존 기능 삭제는 새 UI 검증 후가 원칙).

---

## 8. 매 Step 공통 체크리스트

- [ ] `npm run build` 성공
- [ ] 실제 화면에서 눈으로 동작 확인 (빌드 성공 ≠ 동작 확인, Phase 2 sockjs 사례 참고)
- [ ] 기존 기능(협업 동기화, 캔버스 조작)에 회귀 없는지 확인
- [ ] 커밋은 Step 단위로 분리, 커밋 메시지에 `ribbon step N` 형식 사용
- [ ] 이 문서의 "1. 탭 구조"나 "0. 확정된 결정"에 변경이 생기면 그 즉시 표부터 갱신

---

## 9. 작업 상태 로그

각 Step 완료 시 아래에 한 줄씩 추가한다 (날짜, Step, 요약, 커밋 여부).

```
[참고] Step 1/2는 커밋으로는 이미 완료되어 있었으나(5dda142 "add ribbon toolbar
step 1", 3fd50a6 "move topbar buttons to ribbon home tab (step 2)", 둘 다
nekopunch) 이 로그에 기록이 안 남아 있었음. Step 3 착수 전 git log로 확인.

2026-08-18 — Step 3: Annotate 탭
결론: Draw/Align/Group/Arrange/Grid 그룹 구성으로 완료. 커밋은 하지 않고 diff만 전달.

상세:
- 착수 전 실제 코드를 재확인한 결과, 3절 표가 예상한 것보다 이미 많이 진행되어
  있었음 — a7560f2 "feat(toolbar): wire arrange/align/navigation commands into
  ribbon" (Seoly, 2026-08-14), b851fa1 "feat(editor): support align/distribute on
  backend editor elements" (Seoly, 2026-08-14), 49bd86d "fix(workspace): stop
  Select All from crashing on large node counts" (Seoly, 2026-08-14) — 세 커밋 모두
  이미 이 브랜치에 병합되어 있었음. 즉 Align/Arrange 계열 버튼은 이미 리본에
  연결되어 동작 중이었고, nekopunch/Seoly가 같은 파일(WorkflowCanvasPage.tsx,
  ribbonConfig.ts)을 순차적으로 커밋하는 방식으로 이미 협업 중이었음 — 항목 2가
  우려한 "동시 작업 충돌"은 실제로는 발생하지 않았음 (순차 커밋, 병합 충돌 없음).
  항목 3(뼈대 vs 실제 연결)도 이미 실제 연결 쪽으로 진행되어 있었음 — 3-4절 결론과
  일치. 다만 이건 "논의 완료"가 아니라 코드 재확인으로 얻은 정황 증거일 뿐이므로
  위 표의 상태는 미완료로 유지함 — 팀원과 명시적으로 확인한 것은 아님.
- 이번 세션에서 실제로 채운 것:
  1. Draw 그룹: ANNOTATION_TOOL_DEFINITIONS(Shape/Text/Freehand, 아이콘 없었음 →
     Shapes/TypeIcon/Pencil로 신규 지정, 3-2절이 제안한 조합 그대로 사용)를
     EDITOR_TOOL_DEFINITIONS(Rectangle 등, 기존 아이콘 매핑 재사용)와 합쳐
     하나의 동적 그룹으로 리본에 연결. 기존에 좌측 패널(Node Palette)에어
     인라인으로 남아 있던 Shape/Text/Freehand 버튼은 제거하고 주석으로 대체
     (Editor Shapes/Align/Group 버튼은 이전 세션에서 이미 제거되어 있었음).
  2. Align 그룹: 기존 handleAlign/handleDistribute 연결을 그대로 유지, 6방향
     정렬 + 분산 2종만 남기고 Group/Ungroup은 아래 3번 그룹으로 분리.
  3. Group 그룹(신규): 항목 6 재확인 결과 전제가 낡아 있었음 — 3-1절은
     "handleGroup/handleUngroup이 editor 엔진 경로를 지원하지 않는다"고 했지만,
     실제로는 WorkspaceEditorCommandApi.groupSelected/ungroupSelected가 이미
     구현되어 있었고 Arrange 그룹의 별도 버튼(group-selected/ungroup-selected)에
     이미 연결되어 동작 중이었음(Seoly, a7560f2). "사용 전에" 안내가 제시한
     폴백(이번 Step엔 만들지 않고 editor 선택 시 disabled 처리)을 그대로 따르면
     이미 동작하던 기능을 되돌리는 셈이라 판단, 대신 Group/Ungroup 버튼을 하나로
     합치고 onClick에서 editor 선택 개수로 분기하도록 재구성함 (undo/redo 버튼이
     이미 쓰던 것과 동일한 패턴 — ribbonHandlers의 onClick에서 분기, handleGroup/
     handleUngroup 함수 내부는 손대지 않음). disabled 조건은 handleAlign과 동일하게
     `editorSelection.elements.length >= 2 || canEditAnnotations` 패턴 재사용.
     → 팀원 논의 없이 임시로 내린 판단이므로 위 표 항목 6은 미완료로 유지.
  4. Arrange 그룹: Duplicate/Delete/Front/Back만 남기고 Group/Ungroup은 제거
     (3번으로 이동).
  5. Grid 그룹(신규): 항목 7 안내대로 RibbonGroup만 추가하고 버튼은 넣지 않음 —
     WORKSPACE_EDITOR_GRID_SIZE는 여전히 고정 상수, 토글 UI 없음. 팀원 논의 후
     별도 Step으로 분리 예정 — 위 표 항목 7은 미완료로 유지.
  - CanvasViewport.tsx 등 다른 위치에 Align/Group을 중복 제공하는 플로팅 툴바가
    있는지 확인했으나 없었음 (grep 결과 없음) — 추가로 주석 처리할 UI 없음.
- 검증:
  - `npm run build` 성공.
  - `tsc --noEmit`: 이번에 건드린 두 파일(WorkflowCanvasPage.tsx, ribbonConfig.ts)
    관련 에러 없음. 남은 에러는 전부 src/test/* (커밋 0a0e19f "test"에서 추가된
    vitest 설정 미비) — 이번 작업과 무관, 기존 이슈로 판단하고 무시.
  - 실제 로컬 서버로 확인을 시도했으나 백엔드(Spring Boot + Postgres/Redis)가
    필요했고, 로컬 Docker Desktop 엔진이 떠 있지 않아(`docker compose up` 실패:
    dockerDesktopLinuxEngine pipe 연결 불가) 백엔드/DB를 띄우지 못함. 대신
    Step 1/2 때처럼 임시 라우트(`/dev/ribbon-preview`, 실제 ribbonConfig.ts +
    Ribbon 컴포넌트를 그대로 렌더링하되 핸들러만 mock)로 렌더링을 확인 —
    Draw(9)/Editor Document(2)/Align(8)/Group(2)/Arrange(4)/Grid(0, 라벨만)
    버튼 구성이 의도대로 렌더링됨을 DOM 조회로 확인. 검증 후 임시 라우트/파일은
    삭제하여 diff에 남지 않음. 핸들러 분기 로직(WorkflowCanvasPage.tsx 안의
    editorSelection 기반 분기)은 실제 백엔드 없이는 클릭 테스트가 불가능해
    코드 리뷰로만 확인함 — 다음에 백엔드를 띄울 수 있는 세션에서 실제 클릭
    검증을 한 번 더 하는 것을 권장.

2026-08-18 — Step 4: Collaborate 탭
결론: Presence/Status/Workflow 3개 그룹으로 완료 (4절 매핑 그대로). workflow-switcher는
"사용 전에" 안내가 제기한 범위 상충 문제에 대해 (b)안 — Collaborate 탭으로 이전 — 을
선택. 커밋은 하지 않고 diff만 전달.

상세:
- 범위 판단(workflow-switcher, 최상단 타이틀 바 vs Collaborate 탭): (b) 선택.
  근거 — 0절 "최상단 타이틀 바" 행의 실제 문구는 "워크플로우 이름/상태/Home 링크는
  리본과 별개로 그대로 유지"로, workflow-switcher를 명시적으로 포함하지 않는다.
  실제 코드(`WorkflowCanvasPage.tsx`)에서도 `<select className="workflow-switcher">`는
  이름/상태(`workspace-topbar__project`/`workspace-topbar__status`)와 달리 워크플로우
  "전환"이라는 별도 동작을 트리거하는 컨트롤이라 성격이 다르고, 4절 표에도 이미
  Collaborate 탭 Workflow 그룹으로 명시되어 있었음. (a)안(타이틀 바에 예외로 잔류)을
  택하면 문서 4절을 다시 고쳐야 하고 "왜 이 select만 예외인지"를 새로 정당화해야 하는
  반면, (b)안은 기존 4절 그대로 두고 0절 문구의 실제 범위(이름/상태/Home 링크)만
  따르면 되므로 더 단순한 해석. 레이아웃상으로도 select는 `workspace-topbar`의 첫 번째
  flex 컨테이너 안에서 조건부(`workflows.length > 1`)로만 나타나는 독립된 블록이라
  분리가 쉬웠음.
- 이번 세션에서 실제로 채운 것:
  1. `RibbonGroupDefinition`(types.ts)에 `content?: ReactNode` 필드 추가 — 클릭 버튼이
     아니라 상태를 보여주는 그룹(아바타 목록, 저장 상태 텍스트, select)을 위한 확장.
     5-1절 원칙 유지: `ribbonConfig.ts`에는 여전히 그룹의 "구조"(id/label/빈 buttons
     배열)만 정의하고, 실제 콘텐츠는 `buildRibbonTabs(handlers, dynamicButtons,
     groupContent)`의 새 세 번째 인자로 페이지에서 주입 — 기존 `dynamicButtons`(그룹에
     버튼을 추가 주입)와 동일한 패턴을 콘텐츠 주입에도 재사용한 것.
  2. `RibbonGroup.tsx`: `group.content`가 있으면 버튼 행 대신 그 콘텐츠를 렌더링하도록
     분기 추가. 버튼 기반 그룹의 동작/마크업은 그대로 유지.
  3. `index.css`: `.ribbon-group__content` 규칙 추가(`.ribbon-group__buttons`와 동일한
     flex 레이아웃) — 버튼이 아닌 콘텐츠에 "buttons" 클래스명을 재사용하면 헷갈리므로
     별도 클래스로 분리.
  4. `ribbonConfig.ts`의 `collaborate` 탭에 `presence`/`status`/`workflow` 3개 그룹
     추가(전부 `buttons: []`, 콘텐츠는 페이지에서 주입).
  5. `WorkflowCanvasPage.tsx`: `remoteCursors`/`savedLabel`/workflow-switcher의 기존
     JSX를 그대로(로직 수정 없이) `ribbonGroupContent` 객체로 옮기고
     `buildRibbonTabs(ribbonHandlers, ribbonDynamicButtons, ribbonGroupContent)`로 연결.
     `workspace-topbar`에 남아 있던 원래 렌더링 위치는 Step 2/3과 동일하게 한 줄
     주석으로 대체(완전 제거는 Step 6).
- 검증:
  - `npm run build` 성공.
  - `tsc --noEmit`: 이번에 건드린 5개 파일 관련 에러 없음. 남은 27개 에러는 전부
    `src/test/*`(Step 3 로그와 동일 — vitest 설정 미비, 이번 작업과 무관).
  - 로컬 Docker 엔진이 이번에도 떠 있지 않아(`docker info` 실패) 실제 백엔드 연동
    화면 확인은 불가. Step 1~3과 동일한 방식으로 임시 라우트(`/dev/ribbon-preview`)를
    만들어 `Ribbon` + `buildRibbonTabs`를 실제 groupContent(아바타 3개 mock, "Saved"
    상태, 2개 옵션 select)로 렌더링해 DOM 조회로 확인 — Presence 그룹에 아바타 3개,
    Status 그룹에 "Saved" 텍스트, Workflow 그룹에 select(옵션 2개)가 의도대로
    나타났고, Home 탭으로 전환해도 기존 버튼들이 정상 렌더링됨을 확인. 검증 후 임시
    라우트/파일은 삭제해 diff에 남지 않음(`git status --short` 재확인). 실제
    `remoteCursors`/`savedLabel`/workflow 전환 클릭 동작 자체는 이번에도 백엔드 없이는
    검증 불가 — Step 3과 마찬가지로 다음에 백엔드를 띄울 수 있는 세션에서 재확인 권장.

2026-08-18 — Step 5: View 탭
결론: (a) — 이미 완전히 채워져 있었음, 검증만 진행. 코드 변경 없음, 문서만 갱신
(1절/7절). 커밋할 코드 diff 자체가 없음.

상세:
- 착수 전 확인한 실제 상태:
  - `ribbonConfig.ts`의 `view` 탭에 `navigation` 그룹이 이미 존재, `fit-view`
    (`Maximize2`)/`select-all`(`BoxSelect`) 버튼 2개가 이미 정의되어 있었음.
  - `WorkflowCanvasPage.tsx`의 `ribbonHandlers`에 `fit-view`/`select-all` 핸들러가
    이미 연결되어 있었음(`fitViewRef.current()` / `selectAllRef.current()`).
    두 ref는 `CanvasViewport`의 `onFitViewReady`/`onSelectAllReady` 콜백으로
    채워지고, 키보드 단축키(`CANVAS_ACTIONS`, `onFitView` 등)와도 같은 ref를
    공유해서 쓰고 있음 — 리본 버튼과 키보드 단축키가 같은 진입점을 재사용하는
    구조라 중복이 아니라 의도된 설계로 판단.
  - Seoly의 `a7560f2`("wire arrange/align/navigation commands into ribbon",
    2026-08-14)가 View 탭까지 이미 채워둔 것으로 확인 — "사용 전에" 안내가
    예상한 그대로. Step 3 때와 같은 패턴(문서가 실제 코드보다 낡음)이 반복됨.
  - 중복 렌더링 여부 확인: `CanvasViewport.tsx`, `WorkspaceEditorLayer.tsx` 등을
    검색했으나 Fit View/Select All을 별도로 렌더링하는 플로팅 버튼은 없었음
    (콜백만 노출, 버튼 자체는 리본에만 존재) — Step 3의 Draw 그룹 중복 문제
    같은 사례는 없음.
- (a)를 선택한 근거: 그룹 구조/핸들러 연결이 전부 이미 존재하고 정상 동작하므로,
  "지켜야 할 것" 항목("이미 동작하는 걸 건드리지 않는다")에 따라 코드는 그대로
  두고 검증 및 문서 갱신만 진행. 리팩토링·구조 변경 없음.
- 이번 세션에서 실제로 한 것: 코드 변경 없음. 1절("View — 자리만 마련" → 이미
  채워짐으로 갱신), 7절(Step 5 설명 갱신)만 수정.
- 검증:
  - `npm run build` 성공(코드 변경 없으므로 baseline 확인 목적).
  - `tsc --noEmit`: `src/test/*` 27개 에러만 남음, 이전 Step들과 동일 — 무관.
  - 로컬 Docker 엔진 이번에도 다운(`docker info` 실패). Step 1~4와 동일하게 임시
    라우트(`/dev/ribbon-preview`)로 View 탭을 렌더링 — `fit-view`/`select-all`
    버튼에 mock 핸들러(alert)를 연결해 클릭 시 실제로 호출되는지 확인(브라우저
    콘솔에 "Page dialog suppressed (alert): fit-view clicked" / "select-all
    clicked" 로그로 확인). Collaborate 탭으로 전환해 Step 4의 `content` 확장
    구조와 View 탭의 버튼 기반 그룹이 같은 리본 안에서 충돌 없이 공존하는 것도
    확인. 검증 후 임시 라우트/파일 삭제, `git status --short`로 diff에 남지
    않았음을 재확인.
```
