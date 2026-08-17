---
updated_at: 2026-08-18T23:10:00+09:00
author: nekopunch
branch: main
head_commit: ad93410
status: ready
detailed_log: ./history/2026-08/2026-08-18-2310-nekopunch-ribbon-view-tab.md
---

# Current Baton — 지금 이어갈 작업

## 방금 완료한 작업

- 리본 툴바 마이그레이션 Step 5 (View 탭): 이미 Seoly의 `a7560f2`에서 완전히
  채워져 있음을 확인 — **코드 변경 없음**, 문서(§1/§7/§9)만 갱신.
- `fit-view`/`select-all` 버튼이 키보드 단축키와 같은 ref(`fitViewRef`/`selectAllRef`)를
  공유하는 의도된 설계임을 확인, 중복 버튼 없음도 재확인.

상세 근거: [`2026-08-18-2310-nekopunch-ribbon-view-tab.md`](./history/2026-08/2026-08-18-2310-nekopunch-ribbon-view-tab.md)

## 현재 상태

- `main`은 로컬/`origin/main` 모두 `ad93410`까지 진행됐다 (Step 5 문서 커밋 완료,
  relay 문서는 이 바통 커밋에서 반영 예정).
- 작업 트리는 clean (relay 문서만 남음).
- **리본 마이그레이션 Step 1~5 전부 완료.** 다만 Step 3(Annotate 탭, `d6c6c42`)은
  여전히 Seoly 리뷰 대기 중이다.
- **Step 6(기존 workspace-topbar 완전 제거) 진행 조건 미충족** — 마이그레이션 문서
  7절 원칙("Step 6은 1~5가 전부 검증된 뒤에만 진행")에서 "검증"에는 Seoly 리뷰가
  포함된다고 보는 게 안전하다. Step 3 리뷰 전에는 Step 6 착수를 보류할 것을 권장.

## 다음 사람이 먼저 할 일

1. (Step 3 이월, 최우선) Seoly가 Group/Ungroup 통합(`d6c6c42`)을 리뷰하고, 본인이
   남긴 "Align/Distribute 라우팅 우선순위" 미해결 항목과 상충하지 않는지 확인한다.
2. 로컬 Docker(Postgres/Redis)를 띄운 뒤 브라우저에서 Step 3~5를 한 번에 라이브
   확인한다 (전부 nekopunch는 Docker 엔진 문제로 실측하지 못했다).
3. Step 3 리뷰와 라이브 확인이 끝나면 Step 6(기존 topbar 제거) 착수 여부를 결정한다.

## 확인이 필요한 부분

- (Seoly, 2026-08-16, 이월) Align/Distribute 라우팅이 legacy annotation과 backend
  editor element가 섞여 선택된 경우의 우선순위 — 여전히 미해결.
- (Seoly, 2026-08-16, 이월) `useWorkspaceStore()`를 셀렉터 없이 호출하는 곳이 이미 고친
  3개 파일 외에 더 있을 가능성.
- (Seoly, 2026-08-16, 이월) 커넥터는 여전히 신규 backend editor element끼리만 연결되며
  legacy annotation 도형에는 연결되지 않는다 (의도된 범위).
- (nekopunch, Step 3 이월) Group/Ungroup 핸들러 내부 분기 방식이 이 프로젝트 컨벤션과
  맞는지 Seoly 확인 필요.
- (nekopunch, Step 3 이월) Draw 그룹에서 legacy annotation 버튼과 editor 엔진 버튼을
  하나의 그룹에 섞은 것이 UX상 맞는 방향인지.
- (nekopunch, Step 4 이월) workflow-switcher를 Collaborate 탭으로 옮긴 것이 실제
  사용성상 불편하지 않은지.
- (nekopunch, Step 4 이월) `RibbonGroupDefinition.content` 확장 방식이 5-1절 원칙과
  정말 부합하는지 Seoly 확인 필요.
- (nekopunch, Step 5 신규) §1/§7 문서 수정이 실제 코드를 정확히 반영하는지 가벼운
  검토 필요 (코드 변경이 없어 리스크는 낮음).

## 검증 결과

- frontend `npm run build`, `tsc --noEmit`(수정 파일 기준) 통과 — Step 3~5 공통.
- Step 5: 임시 프리뷰에서 fit-view/select-all 클릭 시 실제 호출 확인(콘솔 로그),
  Collaborate 탭의 `content` 확장과 View 탭의 버튼 그룹이 충돌 없이 공존함을 확인.
- **브라우저 라이브 확인 미실행** (Step 3~5 공통) — Docker 엔진 로컬 기동 실패로
  로그인 502.

## 작업 트리 상태

- 상태: dirty
- 미커밋 파일: 이 문서(`BATON.md`)와 이번 history 기록만 남음 —
  `docs/nekopunch/toolbar_ribbon_migration_plan.md`는 `ad93410`으로 이미 커밋 완료
  (nekopunch 소유)
- 기준 commit: `ad93410` (Step 5 문서 커밋 완료, relay 문서는 이 다음 커밋에서 추가 예정)
