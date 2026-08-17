---
updated_at: 2026-08-18T22:30:00+09:00
author: nekopunch
branch: main
base_commit: 8b32235
head_commit: b2befac
status: ready
topic: ribbon-collaborate-tab
---

# Relay Leg — 2026-08-18 / nekopunch / ribbon-collaborate-tab

## 목표

리본 툴바 마이그레이션(`docs/nekopunch/toolbar_ribbon_migration_plan.md`) Step 4 —
Collaborate 탭에 Presence 아바타, 저장 상태(savedLabel), workflow-switcher를 배치한다.

## 완료한 작업

- Collaborate 탭에 Presence(아바타)/Status(저장 상태)/Workflow(전환 select) 3개 그룹 구성.
- `RibbonGroupDefinition`에 `content?: ReactNode`를 추가해 클릭 버튼이 아닌 상태 표시형
  그룹(아바타 목록, 저장 라벨, `<select>`)을 지원하도록 최소 확장.
- `remoteCursors`/`savedLabel`/workflow-switcher JSX를 로직 변경 없이 그대로
  `ribbonGroupContent` 객체로 옮기고, 기존 workspace-topbar 위치는 주석 처리.
- Annotate 탭 관련 파일(ribbonConfig.ts의 annotate 부분, group/ungroup 핸들러)은
  이번 Step에서 건드리지 않음 — Step 3 리뷰 대기 상태 보존.

## 주요 변경 파일

- `flowmat_frontend/src/widgets/canvas-toolbar/ui/types.ts`: `RibbonGroupDefinition`에
  `content?: ReactNode` 옵션 필드 추가.
- `flowmat_frontend/src/widgets/canvas-toolbar/ui/RibbonGroup.tsx`: `group.content`가
  있으면 버튼 행 대신 렌더링하도록 분기 — 기존 버튼 기반 그룹 동작은 무변경.
- `flowmat_frontend/src/index.css`: `.ribbon-group__content` 추가 (`.ribbon-group__buttons`와
  동일 flex 레이아웃, 명확성을 위해 별도 클래스로 분리).
- `flowmat_frontend/src/widgets/canvas-toolbar/config/ribbonConfig.ts`: Collaborate 탭에
  `presence`/`status`/`workflow` 그룹(구조만) 추가. `buildRibbonTabs`에 3번째 인자
  `groupContent` 추가 — 기존 `dynamicButtons` 주입 패턴을 그대로 미러링 (5-1절 원칙 유지:
  구조는 config, 콘텐츠는 페이지에서 주입).
- `flowmat_frontend/src/pages/workspace/ui/WorkflowCanvasPage.tsx`: `remoteCursors`/
  `savedLabel`/workflow-switcher JSX를 `ribbonGroupContent` 객체로 그대로 이동(로직 변경 없음).
  기존 topbar 위치는 Step 2/3과 동일한 방식으로 한 줄 주석 처리.

## 커밋

- `b2befac`: `move presence/status/workflow switcher to ribbon collaborate tab (step 4)`
  (코드 5개 파일 + `docs/nekopunch/toolbar_ribbon_migration_plan.md` §9 로그 포함)

## 결정 사항과 이유

- **workflow-switcher 배치: (b) Collaborate 탭으로 이동을 선택.** 근거 —
  0절 "최상단 타이틀 바" 행의 실제 문구는 "워크플로우 이름/상태/Home 링크는 리본과
  별개로 그대로 유지"이며, workflow-switcher를 명시적으로 포함하지 않는다. 실제 코드에서도
  `<select className="workflow-switcher">`는 이름/상태(`workspace-topbar__project`/
  `workspace-topbar__status`)와 달리 워크플로우 "전환"이라는 별도 동작을 트리거하는
  컨트롤이라 성격이 다르다. 실용적으로도 (a)안(타이틀 바에 예외로 잔류)을 택하면 4절
  문서를 다시 고치고 "왜 이 select만 예외인지"를 새로 정당화해야 하는 반면, (b)안은
  기존 4절 그대로 두고 0절 문구의 실제 범위만 따르면 되므로 더 단순한 해석이었다.
  레이아웃상으로도 select는 `workspace-topbar`의 첫 번째 flex 컨테이너 안에서
  조건부(`workflows.length > 1`)로만 나타나는 독립된 블록이라 분리가 쉬웠다.
- **RibbonGroupDefinition에 `content?: ReactNode` 추가로 확장**: 상태 표시(아바타 목록,
  저장 라벨, select)는 클릭 핸들러가 있는 버튼이 아니므로 기존 `buttons` 배열 구조로
  억지로 표현하지 않고, 별도 옵션 필드로 분리. 5-1절의 "구조는 config, 로직/데이터는
  상위 주입" 원칙을 `dynamicButtons`와 동일한 방식(`groupContent` 3번째 인자)으로 확장해
  일관성을 유지함.

## 실행한 검증

| 명령 또는 조작 | 결과 |
|---|---|
| `npm run build` | PASS |
| `tsc --noEmit` | PASS — 기존 `src/test/*` 27개 에러만 남음, 무관 |
| 임시 프리뷰 라우트(`/dev/ribbon-preview`)로 DOM 확인 후 삭제, `git status --short`로 흔적 없음 확인 | PASS — Presence 그룹에 아바타 3개(mock), Status 그룹에 "Saved" 텍스트, Workflow 그룹에 select(옵션 2개)가 의도대로 렌더링됨. Home 탭 전환도 정상 동작 확인 |

## 실행하지 못한 검증

- 실제 로컬 백엔드(Docker)를 띄운 브라우저 환경에서의 라이브 확인 — Step 1~3과 동일하게
  Docker 엔진이 로컬에서 기동되지 않아 실행하지 못함.
- 실제 협업 상황(다중 사용자 접속)에서 Presence 아바타/저장 상태가 실시간으로 갱신되는지
  — 이번 검증은 정적 렌더링(mock)만 확인, 실시간 갱신 자체는 Phase 1/2에서 이미 검증된
  로직을 그대로 재사용했으므로 로직 자체의 리스크는 낮다고 추정.

## 알려진 문제와 재현 방법

현재 확인된 실패 사례 없음.

## 다음 작업

1. 실제 로컬 서버(Docker 정상화 후)에서 Collaborate 탭 브라우저 라이브 확인.
2. Step 5(View 탭, 자리만 유지)로 진행하거나, Step 3(Annotate) 리뷰 결과가 먼저 나오면
   그쪽을 우선 반영.
3. `RibbonGroupDefinition.content` 확장이 이후 다른 상태 표시형 그룹에도 재사용 가능한
   패턴인지 정리해서 5-1절에 반영할지 검토.

## 검토받고 싶은 부분

- workflow-switcher를 Collaborate 탭으로 옮긴 것이 실제 사용성상 불편하지 않은지
  (원래 타이틀 바 근처에 있어 눈에 잘 띄었는데, 탭을 눌러야 보이는 위치로 이동함).
- `RibbonGroupDefinition.content` 확장 방식이 5-1절 원칙과 정말 부합하는지,
  아니면 버튼 기반 구조를 더 억지로라도 유지하는 게 나았을지.
- Step 3와 달리 이번엔 Seoly의 작업 영역과 겹치지 않는다고 판단했으나, Presence/저장
  상태 로직 자체가 협업 인프라(Phase 1/2, nekopunch 담당 영역)와 맞닿아 있어 혹시
  최근에 이 부분도 변경된 게 있는지 재확인 필요.

## 작업 트리 상태

- 상태: clean (Step 4 코드 + 마이그레이션 문서 로그는 `b2befac`로 커밋 완료)
- 미커밋 파일: 이 relay 기록과 `BATON.md`만 남음
- 원격 반영: 아직 push 안 함 (relay 문서 커밋 후 한 번에 push 예정)

## 참고 자료

- `docs/nekopunch/toolbar_ribbon_migration_plan.md` §4 (Collaborate 탭 상세)
- `docs/editor/relay/history/2026-08/2026-08-18-2140-nekopunch-ribbon-annotate-tab.md`
  (Step 3 기록 — Seoly 리뷰 대기 상태 참고)
