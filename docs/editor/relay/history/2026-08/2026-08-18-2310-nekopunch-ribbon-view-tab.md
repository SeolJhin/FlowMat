---
updated_at: 2026-08-18T23:10:00+09:00
author: nekopunch
branch: main
base_commit: b2befac
head_commit: ad93410
status: ready
topic: ribbon-view-tab
---

# Relay Leg — 2026-08-18 / nekopunch / ribbon-view-tab

## 목표

리본 툴바 마이그레이션(`docs/nekopunch/toolbar_ribbon_migration_plan.md`) Step 5 —
View 탭 상태를 확인하고, 문서 원안("자리만 마련")과 실제 코드가 일치하는지 검증한다.

## 완료한 작업

- View 탭이 이미 Seoly의 `a7560f2`(2026-08-14)에서 `navigation` 그룹(Fit View,
  Select All)으로 완전히 채워져 있고, `WorkflowCanvasPage.tsx`의 `ribbonHandlers`에도
  이미 연결되어 있음을 확인. **코드는 건드리지 않았다.**
- `fitViewRef`/`selectAllRef`가 `CanvasViewport`의 콜백으로 채워지고, 키보드 단축키
  (`CANVAS_ACTIONS`)와도 같은 ref를 공유하는 구조임을 확인 — 중복이 아니라 의도된 설계.
- `CanvasViewport.tsx`/`WorkspaceEditorLayer.tsx`를 검색해 Fit View/Select All을
  별도로 렌더링하는 중복 버튼이 없음을 확인 (Step 3의 Draw 그룹 중복 사례 재발 없음).
- 마이그레이션 문서 §1, §7의 "View 탭은 자리만 마련" 서술이 낡은 정보였음을 확인하고
  갱신.

## 주요 변경 파일

- `docs/nekopunch/toolbar_ribbon_migration_plan.md`: §1, §7, §9 갱신 (46줄).
  **코드 파일 변경 없음** — 이번 Step의 정상적인 결과.

## 커밋

- `ad93410`: `confirm ribbon view tab already wired, update docs (step 5)`

## 결정 사항과 이유

- Step 5 프롬프트가 제시한 (a)/(b)/(c) 중 **(a) — 이미 완전히 채워져 있어 검증만 진행**을
  선택. 근거: 그룹 구조와 핸들러 연결이 이미 정상 동작하는 상태였고, "이미 동작하는 걸
  건드리지 않는다"는 지시(Step 3에서 얻은 교훈을 이번 프롬프트에 반영한 것)를 그대로
  따름. 리팩토링이나 구조 변경을 하지 않았다.

## 실행한 검증

| 명령 또는 조작 | 결과 |
|---|---|
| `npm run build` | PASS (baseline 확인 목적, 코드 변경 없음) |
| `tsc --noEmit` | PASS — 기존 `src/test/*` 27개 에러만 남음, 이전 Step들과 동일 |
| 임시 프리뷰 라우트로 fit-view/select-all 버튼에 mock 핸들러(alert) 연결 후 클릭 | PASS — 브라우저 콘솔에 "fit-view clicked"/"select-all clicked" 로그로 실제 호출 확인 |
| Collaborate 탭(Step 4의 `content` 확장)과 View 탭(일반 버튼 그룹)이 같은 리본 안에서 공존하는지 확인 | PASS — 충돌 없음 |
| 임시 라우트 삭제 후 `git status --short` 재확인 | PASS — 흔적 없음 |

## 실행하지 못한 검증

- 실제 로컬 백엔드(Docker)를 띄운 브라우저 환경에서의 라이브 확인 — Step 1~4와 동일한
  사유(Docker 엔진 로컬 기동 실패)로 실행하지 못함.

## 알려진 문제와 재현 방법

현재 확인된 실패 사례 없음.

## 다음 작업

1. Step 6(기존 workspace-topbar 완전 제거)을 진행할지 판단 — 문서 7절 원칙상
   "1~5가 전부 검증된 뒤에만" 진행해야 하는데, Step 3(Annotate 탭)이 아직 Seoly
   리뷰 대기 중이므로 엄밀히는 조건 미충족. Step 6 진행 여부를 다음에 정할 것.
2. (Step 3, 4에서 이월) Seoly 리뷰 및 Docker 정상화 후 Step 3~5 전체 브라우저
   라이브 재확인.

## 검토받고 싶은 부분

- 이번 Step은 코드 변경이 없어 특별히 검토받을 지점은 적으나, §1/§7 문서 수정 자체가
  정확한지(View 탭 서술이 실제 코드를 정확히 반영하는지) Seoly가 한 번 훑어보면 좋음.

## 작업 트리 상태

- 상태: clean (문서 커밋 `ad93410` 완료, 이 relay 기록과 `BATON.md`만 남음)
- 미커밋 파일: 이 문서와 `BATON.md`
- 원격 반영: 아직 push 안 함

## 참고 자료

- `docs/nekopunch/toolbar_ribbon_migration_plan.md` §1, §7 (View 탭 서술)
- `docs/editor/relay/history/2026-08/2026-08-18-2140-nekopunch-ribbon-annotate-tab.md`
  (Step 3, "문서가 실제 코드보다 낡음" 패턴 최초 발견)
