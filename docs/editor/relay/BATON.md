---
updated_at: 2026-08-18T22:30:00+09:00
author: nekopunch
branch: main
head_commit: b2befac
status: ready
detailed_log: ./history/2026-08/2026-08-18-2230-nekopunch-ribbon-collaborate-tab.md
---

# Current Baton — 지금 이어갈 작업

## 방금 완료한 작업

- 리본 툴바 마이그레이션 Step 4 (Collaborate 탭): Presence/Status/Workflow 3개 그룹 구성.
- `RibbonGroupDefinition`에 `content?: ReactNode` 필드를 추가해 클릭 버튼이 아닌 상태
  표시형 그룹(아바타 목록, 저장 상태, workflow-switcher)을 지원하도록 확장.
  `buildRibbonTabs`에 세 번째 인자 `groupContent` 추가 — 기존 `dynamicButtons` 주입
  패턴을 그대로 미러링해 5-1절(구조는 config, 콘텐츠는 상위 주입) 원칙 유지.
- workflow-switcher는 최상단 타이틀 바가 아닌 Collaborate 탭으로 이전 (근거는 상세
  기록 참고 — 0절 예외 목록에 미포함, JSX상 독립 블록).
- `remoteCursors`/`savedLabel`/workflow-switcher 로직 자체는 수정 없이 그대로 이동.
- Annotate 탭 관련 파일은 이번에도 건드리지 않음 (Step 3 리뷰 대기 유지).

상세 근거: [`2026-08-18-2230-nekopunch-ribbon-collaborate-tab.md`](./history/2026-08/2026-08-18-2230-nekopunch-ribbon-collaborate-tab.md)

## 현재 상태

- `main`은 로컬/`origin/main` 모두 `b2befac`까지 진행됐다 (Step 4 코드 커밋 완료,
  relay 문서는 이 바통 커밋에서 반영 예정).
- 작업 트리는 clean (relay 문서만 남음).
- **Step 3(Annotate 탭, `d6c6c42`)은 여전히 Seoly 리뷰 대기 중** — 아래 "확인이 필요한
  부분" 참고. Step 4는 Annotate 탭과 무관한 영역이라 별도로 진행했다.

## 다음 사람이 먼저 할 일

1. (Step 3 이월) Seoly가 Group/Ungroup 통합(`d6c6c42`)을 리뷰하고, 본인이 남긴
   "Align/Distribute 라우팅 우선순위" 미해결 항목과 상충하지 않는지 확인한다.
2. 로컬 Docker(Postgres/Redis)를 띄운 뒤 브라우저에서 Step 3(Group/Ungroup)과
   Step 4(Presence/Status/Workflow switcher) 둘 다 라이브 확인한다 — 둘 다 nekopunch는
   Docker 엔진 문제로 실측하지 못했다.
3. Step 5(View 탭, 자리만 유지) 진행 여부를 결정한다 — Step 3 리뷰 결과를 먼저
   기다릴지, Step 5로 넘어갈지.

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
- (nekopunch, 신규) workflow-switcher를 Collaborate 탭으로 옮긴 것이 실제 사용성상
  불편하지 않은지 (원래 타이틀 바 근처에 있어 눈에 잘 띄었는데, 탭을 눌러야 보이는
  위치로 이동함).
- (nekopunch, 신규) `RibbonGroupDefinition.content` 확장 방식이 5-1절 원칙과 정말
  부합하는지 Seoly 확인 필요.

## 검증 결과

- frontend `npm run build`, `tsc --noEmit`(수정 파일 기준) 통과 — Step 3, 4 공통.
- Step 4: 임시 프리뷰 라우트로 Presence(아바타 3개 mock)/Status("Saved")/
  Workflow(select 옵션 2개) 정상 렌더링 확인, Home 탭 정상 동작도 재확인.
- **브라우저 라이브 확인 미실행** (Step 3, 4 공통) — Docker 엔진 로컬 기동 실패로
  로그인 502.

## 작업 트리 상태

- 상태: dirty
- 미커밋 파일: 이 문서(`BATON.md`)와 이번 history 기록만 남음 —
  코드 5개(`types.ts`, `RibbonGroup.tsx`, `index.css`, `ribbonConfig.ts`,
  `WorkflowCanvasPage.tsx`) + `toolbar_ribbon_migration_plan.md`는 `b2befac`로
  이미 커밋 완료 (전부 nekopunch 소유)
- 기준 commit: `b2befac` (Step 4 코드 커밋 완료, relay 문서는 이 다음 커밋에서 추가 예정)
