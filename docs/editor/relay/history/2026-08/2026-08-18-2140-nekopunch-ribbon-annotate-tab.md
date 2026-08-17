---
updated_at: 2026-08-18T21:40:00+09:00
author: nekopunch
branch: main
base_commit: 0a0e19f
head_commit: d6c6c42
status: ready
topic: ribbon-annotate-tab
---

# Relay Leg — 2026-08-18 / nekopunch / ribbon-annotate-tab

## 목표

리본 툴바 마이그레이션(`docs/nekopunch/toolbar_ribbon_migration_plan.md`) Step 3 —
Annotate 탭에 Draw/Align/Group/Arrange/Grid 그룹을 채우고 기존 핸들러를 연결한다.

## 완료한 작업

- Draw 그룹: `ANNOTATION_TOOL_DEFINITIONS`(Shape/Text/Freehand, 아이콘 신규 추가:
  `Shapes`/`TypeIcon`/`Pencil`)와 `EDITOR_TOOL_DEFINITIONS`(Rectangle 등, 기존 아이콘 재사용)를
  하나의 `draw` 동적 버튼 그룹으로 병합.
- Align 그룹: 기존 `handleAlign`/`handleDistribute` 그대로 연결 (미수정).
- Group 그룹(신규 분리): `arrange` 그룹 안에 있던 `group-selected`/`ungroup-selected`
  (editor 엔진 전용)와 `align` 그룹 안에 있던 `annotation-group`/`annotation-ungroup`
  (legacy 전용) — 총 4개 버튼을 **`group`/`ungroup` 2개로 통합**. `editorSelection.elements`
  개수로 editor 엔진 경로와 legacy `handleGroup()`/`handleUngroup()` 경로를 분기.
- Arrange 그룹: Group/Ungroup을 위 항목으로 이관하고 Duplicate/Delete/Front/Back만 유지.
- Grid 그룹: 빈 스켈레톤만 생성 (토글 UI 없음, 의도적으로 보류).
- 왼쪽 Node Palette 패널에서 이제 리본으로 옮겨진 Annotation 버튼 블록 제거.

## 주요 변경 파일

- `flowmat_frontend/src/widgets/canvas-toolbar/config/ribbonConfig.ts`: Annotate 탭
  `draw`/`align`/`group`/`arrange`/`grid` 그룹 구조 정의.
- `flowmat_frontend/src/pages/workspace/ui/WorkflowCanvasPage.tsx`: `ribbonHandlers.group`/
  `.ungroup`에 editor-vs-legacy 분기 로직 추가, `ribbonDynamicButtons.draw` 병합,
  Node Palette의 중복 Annotation UI 제거.
- `docs/nekopunch/toolbar_ribbon_migration_plan.md`: §3 전면 재작성(2026-08-16),
  §9에 Step 3 로그 추가.

## 결정 사항과 이유

- **`group-selected`/`ungroup-selected`(editor 엔진)를 disabled 처리하지 않고 `group`/
  `ungroup`으로 병합**: 마이그레이션 문서 초안은 "이번 Step에서 editor 경로는 새로 만들지
  않고 disabled 처리"를 지시했으나, 실제 코드를 확인한 결과
  `WorkspaceEditorCommandApi.groupSelected/ungroupSelected`가 Seoly의 `a7560f2`
  (2026-08-14)에서 이미 구현·병합되어 있었다. 이미 동작하는 기능을 disabled 처리하는 것은
  퇴행이라 판단해 두 경로를 하나의 핸들러 안에서 분기하는 방식을 택했다.
  `handleGroup`/`handleUngroup` 함수 자체는 수정하지 않았다.
- 이 판단은 **relay 시스템(`docs/editor/relay/`)의 존재를 모른 채** 내려졌다.
  나중에 `BATON.md`(2026-08-16, Seoly)를 확인한 결과, "Align/Distribute 라우팅이
  legacy annotation과 backend editor element가 섞여 선택된 경우의 우선순위"가 이미
  **Seoly 본인이 미해결로 명시한 항목**이었다는 것을 알게 되었다. 이번 Group/Ungroup
  통합은 그 미해결 지점과 인접한 영역을 건드린 것이라, 코드 정합성은 확인했지만
  Seoly의 사전 논의 없이 진행된 점은 review가 필요하다 (아래 "검토받고 싶은 부분" 참고).

## 실행한 검증

| 명령 또는 조작 | 결과 |
|---|---|
| `npm run build` | PASS |
| `tsc --noEmit` (수정된 2개 파일 기준) | PASS — 나머지 에러는 무관한 기존 vitest 설정 이슈 |
| `git diff` 로 id 참조 정합성 수동 확인 (`ribbonConfig.ts`의 `id: 'group'`/`'ungroup'` ↔ `WorkflowCanvasPage.tsx`의 `ribbonHandlers.group`/`.ungroup`) | PASS, 참조 끊김 없음 |
| 임시 프리뷰 라우트(`/dev/ribbon-preview`)로 DOM 렌더링 확인, 이후 삭제 | PASS — 6개 그룹과 버튼 개수 확인 |

## 실행하지 못한 검증

- 실제 로컬 백엔드(Postgres/Redis)를 띄운 브라우저 환경에서의 라이브 확인 — Docker
  엔진이 로컬에서 기동되지 않아 로그인이 502로 실패, 시도하지 못했다.
- 두 명 이상이 동시에 legacy annotation과 backend editor element를 섞어서 선택했을 때
  Group/Ungroup 버튼이 정확히 어느 경로로 동작하는지 실측 — 코드 로직상으로는
  `editorSelection.elements.length` 기준으로 분기하지만, 실제 브라우저 조작으로는
  아직 확인하지 못했다.

## 알려진 문제와 재현 방법

(현재 확인된 실패 사례 없음 — 위 "실행하지 못한 검증" 항목이 사실상의 미검증 리스크)

## 다음 작업

1. Seoly에게 이번 Group/Ungroup 통합(`ribbonConfig.ts`, `WorkflowCanvasPage.tsx`)을
   공유하고, `BATON.md`에 남긴 "Align/Distribute 우선순위 미해결" 항목과 상충하지 않는지
   확인받는다.
2. 로컬 Docker(Postgres/Redis)를 띄운 뒤 브라우저에서 Group/Ungroup을 legacy·editor
   양쪽 선택 상태로 직접 눌러 실제 동작을 확인한다.
3. 확인 후 `docs/nekopunch/toolbar_ribbon_migration_plan.md` 최상단 "논의 필요 항목"
   표의 6번 항목 상태를 갱신한다.

## 검토받고 싶은 부분

- Group/Ungroup 통합 방식(핸들러 내부 분기) 자체가 이 프로젝트의 editor/legacy 분기
  컨벤션과 맞는 방식인지 — `handleAlign`/`handleDistribute`의 기존 분기 스타일을
  그대로 따라 했으나, Seoly가 다른 방식을 의도했을 수 있다.
- Draw 그룹에서 legacy annotation 버튼과 editor 엔진 버튼을 하나의 그룹에 섞어 넣은 것이
  UX상 맞는 방향인지 (두 시스템이 하는 일이 시각적으로 유사해 보일 수 있음).

## 작업 트리 상태

- 상태: dirty
- 미커밋 파일: 이 기록 파일과 `BATON.md`만 남음 — 코드 3개(`ribbonConfig.ts`,
  `WorkflowCanvasPage.tsx`, `toolbar_ribbon_migration_plan.md`)는 `d6c6c42`로 커밋 완료
- 원격 반영: 아직 push 안 함 (Seoly 리뷰 대기 중)

## 참고 자료

- `docs/nekopunch/toolbar_ribbon_migration_plan.md` §3 (Annotate 탭 상세)
- `docs/editor/relay/BATON.md` (2026-08-16, Seoly) — "확인이 필요한 부분" 항목 참고
- `docs/editor/relay/history/2026-08/2026-08-16-1806-seoly-jsonb-verification.md`
