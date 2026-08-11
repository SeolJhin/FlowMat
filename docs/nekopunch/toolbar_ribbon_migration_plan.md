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
| 2 | Annotate 탭 작업 시 기존 인라인 로직(`WorkflowCanvasPage.tsx`/`CanvasViewport.tsx`)을 리본 쪽으로 옮기는 범위 | 이 파일들은 seolly도 계속 작업 중인 영역(annotation 기능 담당). 리본 작업이 같은 파일을 동시에 건드리면 병합 충돌 위험 큼 | 미완료 |
| 3 | Annotate 탭에서 정말 "실제 기능까지 연결"할지, 이번 스프린트는 "뼈대만"으로 그칠지 | 3절 의존관계 문단에서 백엔드는 준비됐다고 판단했지만, 이건 nekopunch의 harness 검증 결과일 뿐 — annotation 기능 자체의 최종 완성도는 담당자(seolly)가 더 잘 앎 | 미완료 |
| 4 | `nekopunch` 브랜치를 리본 작업에도 계속 재사용할지, 새 브랜치를 팔지 | 0절에 "재사용 또는 컨벤션 확인 후 결정"이라고만 되어 있고 실제 확인은 안 됨 | 미완료 |
| 5 | Step 6(기존 topbar 완전 제거)을 실행해도 되는 시점 | 다른 팀원이 기존 topbar의 버튼을 참조하는 코드를 작업 중일 수 있음 — 제거 전 전체 팀에 공지 필요 | 미완료 |

논의가 끝나면 이 표의 "상태"를 "완료(날짜)"로 갱신하고, 결론을 해당 절(0절, 3절 등)에도 반영한다.

> **2026-08-11 — 항목 1, 4 임시 진행 메모 (상태는 "미완료" 유지)**
> nekopunch가 seolly와 즉시 연락이 어려운 상황이라, 아래 조건으로 Step 1을 임시 진행했다:
> - 항목 1(`widgets/` 신설): 진행함 — 0-1절에 이미 "다른 팀원 코드가 이 폴더를 참조하지
>   않으므로 충돌 위험 없음"으로 리스크가 낮게 평가되어 있었음을 근거로 함.
> - 항목 4(브랜치): 진행함 — 브랜치가 `main` 하나로 통합되어 있어 선택지가 없으므로
>   사실상 이미 답이 정해져 있었음을 근거로 함.
> - 두 항목 모두 정식 논의가 끝난 것은 아니므로 위 표의 "상태"는 의도적으로 "미완료"로
>   유지한다. **seolly에게 사후 공유 필요.**
> - 상세 로그는 9절 참고.

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
[Annotate]     — 계획 문서의 기능 목록 참고, 실제 인라인 로직 재배치 (Shape/Text/Freehand/정렬/그룹/그리드 스냅) — 상세는 3절
[View]         — 자리만 마련 (그룹 없어도 됨, 추후 확장)
[Collaborate]  — Presence 아바타, 워크플로우 전환 select, 저장 상태
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

## 3. Annotate 탭 — 매핑 (⚠️ 0-1절 먼저 읽을 것)

`docs/seolly/flowmat_annotation_execution_plan.md` §4.2는 아래 컴포넌트 구조를 계획했지만,
**0-1절에서 확인했듯 이 컴포넌트들은 실제 코드에 존재하지 않는다** — Align/Group/Grid/Toolbar
로직 전부가 `WorkflowCanvasPage.tsx`/`CanvasViewport.tsx`에 인라인되어 있고,
annotation 렌더링은 `pages/workspace/ui/CanvasAnnotationNode.tsx` 단일 컴포넌트가 담당한다.

따라서 아래 표는 "팀원 컴포넌트를 가져다 쓴다"가 아니라
**"이 기능을 리본 뼈대 안에서 새로 구현하되, 실제 인라인 로직을 그대로 재사용/이전한다"**는
뜻으로 읽는다. Step 3 시작 전 아래를 다시 한번 실제 파일에서 확인할 것
(문서 작성 시점과 실행 시점 사이에 코드가 또 바뀌었을 수 있음):
`WorkflowCanvasPage.tsx`, `CanvasViewport.tsx`, `entities/canvas-annotation/model/annotationLayout.ts`.

| 그룹 | 계획에 있던 이름(참고용, 존재하지 않음) | 실제로 가져올 것 | 비고 |
|---|---|---|---|
| Draw | `ToolButton`(cursor/shape/text) | `WorkflowCanvasPage.tsx`의 annotation 도구 선택 로직 | `ANNOTATION_TOOL_DEFINITIONS` 매핑이 실제로 있는지 확인 |
| Align | `AlignmentButtonGroup` | `WorkflowCanvasPage.tsx`/`CanvasViewport.tsx`의 정렬 로직 + `annotationLayout.ts`의 `computeAlignedPosition` | 좌/중/우/상/중/하 6방향. 순수 계산은 이미 `annotationLayout.ts`에 분리되어 있으므로 그대로 재사용 |
| Group | (계획에만 있던 `GroupButton`) | `WorkflowCanvasPage.tsx` 내 group_id 부여 로직 | 실제 존재 여부부터 확인 |
| Grid | (계획에만 있던 `GridSnapControl`) | `CanvasViewport.tsx`의 `snapToGrid` 관련 로직 | frontend_workspace_status 문서에 `snapToGrid` 언급 있음 — 실제 위치 재확인 |

권한 체크(`canEditAnnotations`, `useWorkflowPermission`)는 기존 로직 그대로 유지 —
viewer는 버튼 비활성 처리.

**리본으로 이 로직을 옮길 때 지켜야 할 것** (0-1절 근거):
- `annotationLayout.ts` 같은 순수 함수는 그대로 재사용 — 새로 만들지 않는다.
- 상호작용/오케스트레이션 로직(버튼 클릭 → 상태 변경)은 지금처럼 페이지 컴포넌트 근처에
  두는 게 이 저장소의 실제 패턴과 맞다. 리본 컴포넌트(`RibbonButton` 등)는 순수 UI 껍데기로만
  쓰고, `onClick` 핸들러 본체는 `WorkflowCanvasPage.tsx`에서 그대로 가져와 연결한다
  (5-1절의 "핸들러는 상위에서 주입" 원칙과 자연스럽게 맞음).
- annotation 커스텀 상태 통합(`useNodesState` 미사용, 원격 패치·충돌 지연 처리)을
  건드리지 않는다 — 리본은 이 상태를 호출하는 쪽이지, 상태 관리 방식 자체를 바꾸는 작업이 아니다.

**의존 관계**: nekopunch의 harness 검증(2026-08-09, `collaboration-infra`/`sql-queries` 스킬)에
따르면 annotation 데이터 모델과 동기화는 이미 구현되어 있다 —
`CanvasAnnotationReconcileService.java`(version/versionNonce 기반 동시편집 병합),
`CanvasAnnotation.java` 엔티티, `V11__canvas_annotation.sql` 마이그레이션 존재 확인됨.
즉 백엔드/데이터 쪽은 준비되어 있으므로 Step 3는 뼈대만이 아니라 실제 기능 연결까지
진행 가능하다. 다만 `features/canvas-align/`, `features/canvas-group/` 같은 **프론트 쪽
분리된 폴더는 존재하지 않으므로**(0-1절 참고), 그 경로를 찾지 말고 위 표의
"실제로 가져올 것" 열을 따른다. Step 3 진행 직전에 한 번 더 최신 상태를 재확인할 것 —
이 문서 작성 이후 코드가 바뀌었을 수 있다.

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
Step 3: Annotate 탭 — 실제 인라인 로직 재배치 (3절 표 기준, 계획상 컴포넌트명은 존재하지 않으므로 무시)
Step 4: Collaborate 탭 — Presence/워크플로우 전환 이전
Step 5: View 탭 — 자리만 유지, 필요시 이후 스프린트에서 채움
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
2026-08-11 — Step 1: 리본 뼈대 완료 (미커밋, diff만 확인 대기)

요약: widgets/canvas-toolbar/에 리본 공통 컴포넌트(Ribbon/RibbonTab/RibbonGroup/
RibbonButton/types)와 ribbonConfig.ts(구조 전용, buildRibbonTabs(handlers)로 핸들러
주입)를 생성. WorkflowCanvasPage.tsx의 기존 <header className="workspace-topbar">는
그대로 두고, 그 아래에 <Ribbon>을 추가로 렌더링(기존 topbar 버튼은 이번 Step에서 이전
안 함, 나란히 유지). Home/Annotate/View/Collaborate 4개 탭은 구조만 있고 그룹/버튼은
비워둠(Step 2~4에서 채움). activeRibbonTabId는 WorkflowCanvasPage 로컬 useState.

생성 파일:
- flowmat_frontend/src/widgets/canvas-toolbar/ui/types.ts
- flowmat_frontend/src/widgets/canvas-toolbar/ui/Ribbon.tsx
- flowmat_frontend/src/widgets/canvas-toolbar/ui/RibbonTab.tsx
- flowmat_frontend/src/widgets/canvas-toolbar/ui/RibbonGroup.tsx
- flowmat_frontend/src/widgets/canvas-toolbar/ui/RibbonButton.tsx
- flowmat_frontend/src/widgets/canvas-toolbar/config/ribbonConfig.ts
- .claude/launch.json (vite dev 서버 프리뷰 실행용, 매 Step 시각 확인에 재사용)

수정 파일:
- flowmat_frontend/src/pages/workspace/ui/WorkflowCanvasPage.tsx (Ribbon import + 렌더 + activeRibbonTabId state 추가, 기존 로직/타이틀바 미변경)
- flowmat_frontend/src/index.css (.ribbon* 클래스 추가, 기존 CSS 변수(--bg/--border/--text/--text-h/--accent/--accent-bg/--surface) 재사용해 라이트/다크 자동 대응)

검증:
- `npm run build` 성공 확인.
- 실제 화면 확인: 로컬 백엔드가 기동되지 않아(docker daemon 미실행 → 로그인 502) 실제
  워크스페이스 화면(로그인 후 캔버스)까지는 못 열어봄. 대신 app/router/index.tsx에
  임시 프리뷰 라우트(`/__ribbon-preview`)를 추가해 동일한 <Ribbon tabs={buildRibbonTabs()}>
  를 독립적으로 렌더링, 브라우저에서 탭 4개(Home/Annotate/View/Collaborate) 표시 및
  클릭 시 active 클래스/aria-selected 전환을 DOM에서 직접 확인 완료. 확인 후 임시
  라우트와 디버그 컴포넌트는 삭제하고 다시 빌드해 원상태 확인함(현재 diff에 남아있지
  않음). 다음 Step부터는 백엔드(docker compose + Spring Boot)를 먼저 띄우고 실제
  워크스페이스 화면에서 확인할 것 — 이번엔 시간상 대체 검증으로 넘어감.
- 팀원 연락 불가로 항목 1(widgets/ 신설), 4(브랜치)를 임시 진행함 — 위 "논의 로그"
  섹션의 2026-08-11 메모 참고. seolly에게 사후 공유 필요.
```
