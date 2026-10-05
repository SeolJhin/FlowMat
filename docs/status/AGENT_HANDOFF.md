# Agent 인계 (세션 1 구역)

> **현행 문서** · 작성 2026-10-03 · 세션 1 Agent가 쉬는 동안(약 5일) 이 구역을 이어받는 Agent가 처음 읽는 문서. 무엇을 하고 무엇을 하지 않는지, 어떻게 검증하고 언제 멈추는지를 적는다. 일의 목록은 [WORKBOARD](WORKBOARD.md), 기능 상태는 [CURRENT_CAPABILITIES](CURRENT_CAPABILITIES.md), 아키텍처 결정은 [결정 인계](../architecture/decision-handoff.md)가 기준이다.

> **2026-10-04 상태:** 인계 Agent가 2am–2ao를 끝낸 뒤 사용자가 멈추고, 세션 1이 다시 이어받았다(같은 구역에서 두 Agent가 동시에 고치지 않기 위해). 다시 인계할 때는 이 문서를 그대로 쓰되 WORKBOARD §1의 마지막 기록과 §2의 마지막 번호부터 확인한다.

> **2026-10-05 추가 검증:** 2aq(열린 피킹의 실제 준비 수량)을 구현했습니다. 전체 백엔드 1,016건·커버리지 기준, 프런트 417건·타입·린트·빌드, 브라우저 34건(BOM 생성 스펙 제외) 통과. 기존 서버를 재시작하지 않고 C: 격리 복사본과 별도 포트·임시 DB를 사용했으며, 검증용 서버·컨테이너는 종료했습니다. 재개 시 WORKBOARD §1의 최신 환경·결과와 §3·§4 결정 대기를 확인합니다.

> **2026-10-05 스캐너 추가 작업:** 2ar–2as 완료. 백엔드 전체 1,023건·커버리지 81.02%, 프런트 421건·타입·린트·빌드, 관련 가짜 API 브라우저 7건 통과. 최신 스캐너 작업 표시, 키보드 포커스·입력 잠금, 실제 완료 응답 안내, 선택 필드 `expectedToLocation`의 서버 잠금 안 대조와 거절 뒤 복구를 구현했습니다. 기존 완료 요청은 호환됩니다. 다음 번호는 2at입니다. 별도 검증 서버는 종료했습니다.

> **2026-10-05 실사 추가 작업:** 2at 완료. 첫 입력·CSV 불러오기 장부 수량을 재조회 뒤에도 유지하고 사라진 입력 행은 전체 요청 거절, Clear counts 후 재실사 가능. 프런트 전체 427건·타입·린트·빌드, 관련 가짜 API 브라우저 3건과 모델 커버리지 라인 100%·분기 97.77% 통과. 서버·마이그레이션 변경 없음. 다음 번호는 2au입니다.

> **2026-10-05 재고 재시도 추가 작업:** 2au 완료. 입고·이동 등 History 명령의 응답 유실 재시도 키 유지와 저장 중 입력 잠금. 프런트 전체 433건·타입·린트·빌드, 가짜 API E2E 2건, 공통 명령 6건·커버리지 100% 통과. 서버·DB·마이그레이션 변경 없음. 다음 번호는 2av이며 FEFO 출고·예약에서 같은 격차를 확인 중입니다.

> **2026-10-05 FEFO 재시도 추가 작업:** 2av 완료. 출고·예약의 응답 유실 재시도와 입력 잠금, 프로젝트별 키 분리. 프런트 전체 437건·타입·린트·빌드, 재고·FEFO 가짜 API E2E 4건, 공통 명령·FEFO mutation 10건·대상 커버리지 100% 통과. 자동 승인 검토 사용량 한도로 보류된 브라우저는 제한 시간 후 승인 경로로 재실행했습니다. 백엔드는 변경·재실행하지 않았으며 마지막 전체 결과는 2as의 1,023건·81.02%입니다. 다음 번호는 2aw입니다. PID·시작 시각·스크립트로 확인한 4186 검증 서버와 자기 esbuild 자식만 종료했습니다.

> **2026-10-05 실사 재시도 추가 작업:** 2aw 완료. 실사 응답 유실 복구, 행 순서 변경 대응, 중첩 수량 구분. 프런트 443건·타입·린트·빌드, 실사 브라우저 5건, 명령·FEFO·실사 단위 16건·커버리지 기준 통과. 서버의 거래 없는 실사 재생 한계는 stock-count C13에 기록. 다음 번호 2ax, 만료 폐기 화면 결과 유지·복구를 확인 중입니다. 4187 검증 프런트만 실행 중입니다.

> **2026-10-05 폐기·게이트웨이 추가 작업:** 2ax–2ay 완료. 폐기 결과 유지와 원래 LOT 집합 복구, HTTP 500 이상 재고·FEFO·실사 미확인 안내. 프런트 전체 446건·타입·린트·빌드, 가짜 API 19건, 명령/mutation 19건·80% 커버리지 기준 통과(라인 94.73%, 분기 84.61%). 서버 변경 없음. 다음 번호 2az, 실사 중 행 삭제 뒤 재시도 확인 중. 4187은 이 Agent 전용 가짜 API 검증 프런트입니다.

> **2026-10-05 실사·포장 입력 추가 작업:** 2az–2bb 완료. 실사 삭제 행 원래 요청 복구, 시트 중복·읽기 취소·오류 안내, 포장 입력 비우기의 옛 환산량 제거. 전체 프런트 449건·타입·린트·빌드, 실사 가짜 API 12건과 포장·재시도 7건 통과. 서버 변경 없음. 다음 번호 2bc, 일괄 입고 파일 선택·검사 응답 순서 점검. 4187 검증 프런트는 이 Agent 소유로 유지 중입니다.

> **2026-10-05 CSV 입고 추가 작업:** 2bc–2bd 완료. 파일/검사 경합·취소·파일 오류 복구, 실제 입고 중 입력 잠금과 저장 미확인 재제출 차단. 프런트 전체 449건·타입·린트·빌드, 가짜 API 8건 통과. 서버 CSV 입고 requestId 재생은 없으며 S10에 한계를 기록. 다음 번호 2be(중복 CSV 열 점검). 4187은 이 Agent 전용 검증 프런트입니다.

> **2026-10-05 중복 CSV 열 추가 작업:** 2be 완료. 실사·품목·입고에서 같은 필드 열 중복·별칭 충돌 거절. 프런트 전체 457건·타입·린트·빌드, 관련 가짜 API 10건·모델 21건·라인 100%·분기 80.80%·기준 통과. 서버 변경 없음. 다음 번호 2bf, 품목 CSV 파일/검사 경합 점검. 4187 유지 중.

> **2026-10-05 품목 CSV 추가 작업:** 2bf 완료. 파일/검사 경합·취소·읽기 실패·저장 중 잠금 보완. 프런트 전체 457건·타입·린트·빌드, 가짜 API 6건 통과. 다음 번호 2bg, BOM 자재 CSV의 같은 경합과 replace 옵션 점검(모든 API 모킹, 실제 BOM 삽입 없음). 서버 변경 없음. 4187 유지 중.

> **2026-10-05 BOM 자재 CSV 추가 작업:** 2bg 완료. 파일/검사/교체 옵션 경합, 파일 읽기 중 현재 옵션 반영, 검사 취소·실제 저장 입력 잠금·중복 열 거절. 전체 프런트 460건·타입·린트·빌드, 가짜 API 8건·모델 14건·라인 100%·분기 93.47%·기준 통과. 실제 BOM 생성·DB 요청 없음. 다음 번호 2bh. 이번에 확인한 CSV 격차는 구현했고 §3·§4 결정 대기는 유지합니다. 4187 전용 검증 프런트는 저장된 PID 26208·UTC 시작 시각·recovery-frontend.mjs 실행 명령을 모두 대조한 뒤 자기 esbuild 자식과 함께 종료했습니다. 기존 8080·5173·컨테이너는 건드리지 않았습니다. 수정한 코드·테스트·문서 40개 파일의 UTF-8 BOM 0, 문서 9개의 깨진 상대 링크 0, diff 공백 오류 0. 코드·문서는 이 Agent가 새로 스테이징하지 않았습니다.

## 1. 맡는 구역

- 백엔드 `domain/inventory`, `bom`, `catalog`, `production`, `quality`와 그 테스트
- 프런트 `pages/inventory`, `pages/runs`의 작업지시·실행 상세·부하표 쪽, `entities/inventory`·`catalog`·`production`·`quality`
- 문서 `docs/domain`(공정 포트·Flow Run 문서 제외), `docs/status`

다른 구역(Flow Run `domain/flowrun`·`RunsRoute`·`FlowRunsPanel`, 인증 `entities/auth`, 공정 포트·연결 `domain/workflow`·`pages/workspace`)의 파일은 고치지 않는다. 공용 파일(`shared/types/api.ts`, `CURRENT_CAPABILITIES.md`)은 덧붙이기만 한다.

## 2. 지금 상태 (2026-10-03 밤)

- 커밋 전 변경: [WORKBOARD](WORKBOARD.md) §1. 마이그레이션 V42–V51과 §2의 2a–2al(설비 상태 이력, 부족 예상, 지침 한계 밖 NCR 제안, 끝난 실행 부산물 차이, 위치 간 이동 분석, 모든 단계 반제품 초안, 스캐너 화면, 위치 바코드 라벨, 전환 순서 제안, 좁은 화면 넘침, 재고 있는 위치의 코드 변경 등). 코드는 스테이징하지 않았고 docs는 스테이징돼 있다.
- 마지막 전체 검증: 백엔드 994건과 커버리지 기준(2aj까지), 프런트 409건·린트·타입 검사·빌드와 브라우저 E2E 34건(2ag까지). 2ah 이후 변경(2al의 백엔드 포함)은 관련 단위·통합 테스트와 E2E만 다시 돌렸다. 다음 전체 회귀에서 함께 확인한다.
- 세션 DB(`flowmat-session1-db`, 5434)에 V42–V51이 적용돼 있다. **적용된 마이그레이션은 주석·공백까지 고치지 않는다.** 다음 번호는 V52.
- ADR-002 동결 목록(`flowmat_backend/src/test/resources/archunit_store/`)은 84줄. 줄어들기만 한다.
- **알려진 문제:** 실 API 스펙 `e2e/bom-lot-flow.spec.ts`는 화면으로 BOM을 만들어 승인한다. 그래서 전체 E2E를 돌릴 때마다 세션 DB에 BOM이 쌓였다("BOM 삽입 금지"에 어긋남, 2026-10-03 기준 BOM 41개 중 최근 하루 약 10개). 실행·작업지시가 참조해 지우지 않았다. 정리 여부는 사용자가 정한다. 로컬에서는 이 스펙을 빼고 돌린다(§5).

## 3. 할 일 (순서대로)

1. **CI 확인.** 사용자가 커밋·푸시했다면 GitHub Actions(백엔드, 프런트, 브라우저 E2E, 보안 검사) 결과를 보고 실패를 고친다. 로그는 GitHub 인증이 필요할 수 있다. 공개 API로는 job 단계·annotation까지만 보인다.
2. **하루 한 번 전체 회귀**(§5). 깨지면 원인을 고치고, 고친 내용을 그 기능의 도메인 문서와 WORKBOARD에 남긴다.
3. **결정 메모.** 2026-10-03–04에 WORKBOARD §3의 두 도메인 결정과 §4의 막힌 후보 대부분(할당 재고 피킹, 블라인드 실사, 첨부, 시간대, setup 묶음·부산물 가치·유효일 BOM)에 Proposed 메모를 각 도메인 문서에 써 두었다(WORKBOARD 근거 칸에서 링크). 남은 것은 공정별 지침·검사 기준(flow-run 구역과 함께)과 D2 대기 항목이다. 사용자가 결정하면 그 메모를 근거로 구현 계획을 세운다. 메모의 상태를 올리거나 정리하려고 승인으로 바꾸지 않는다.
4. **결정이 필요 없는 작은 개선만** 구현한다. 예: 재고 화면의 좁은 화면 점검, 접근성, 콘솔 오류, 문서와 코드가 어긋난 곳. 기능마다 단위 테스트, 관련 E2E, 도메인 문서·CURRENT_CAPABILITIES·WORKBOARD 갱신까지 한 묶음.

## 4. 지킬 것

- 브랜치 생성·전환, 커밋, 푸시를 하지 않는다. 변경은 작업 트리에만 남긴다.
- 적용된 Flyway 마이그레이션을 고치지 않는다. 새 마이그레이션은 V52부터, psql `BEGIN; … ROLLBACK;`으로 먼저 돌려 본 뒤 만든다. devtools가 컴파일 때 새 마이그레이션을 바로 적용하므로 완성 전 파일을 두지 않는다.
- dev DB(세션 DB 포함)에 BOM을 넣지 않는다. BOM 화면은 가짜 API 스펙(`e2e/support/mockApi.ts`)으로 확인한다.
- 다른 세션의 dev 서버·컨테이너를 끄거나 재설정하지 않는다. 끌 때는 포트와 시작 시각으로 자기 프로세스인지 확인한다.
- 토큰·쿠키 값을 문서나 보고에 쓰지 않는다. `.gitignore`는 바꾸지 않는다.
- ADR-002 Stage B(다른 context 저장소를 공개 API로)는 **고치는 파일에서만** 한다. 기존 참조를 한꺼번에 고치지 않는다. 공개 API의 `Map` 응답은 빈 입력에 `Collections.emptyMap()`(호출자가 null id를 찾으므로 `Map.of()` 금지).
- 일부러 잡아 둔 뼈대(`global/storage`, 빈 스텁, 쓰지 않는 루트)는 지우거나 지우자고 하지 않는다.
- 결정 상태를 올리지 않는다(ADR-001 Proposed, ADR-002 Accepted, ADR-003 원칙 Accepted·registry Experimental, ADR-004 Proposed, D2 PARTIALLY ACCEPTED).

## 5. 검증 방법

- **서버:** 백엔드는 `flowmat_backend`에서 `bootRun --args='--spring.profiles.active=dev'`. 환경 변수는 `DB_URL=jdbc:postgresql://localhost:5434/flowmat`, `DB_USERNAME=flowmat`, `DB_PASSWORD`(`docker inspect flowmat-session1-db`의 `POSTGRES_PASSWORD`), 임의의 `JWT_SECRET`, `AUTH_LOGIN_ACCOUNT_LIMIT=100`, `AUTH_LOGIN_IP_LIMIT=200`. 프런트는 `flowmat_frontend`에서 `npm run dev`(5173, `/api`를 8080으로 넘김). 백그라운드 작업은 시간 제한(최대 2시간)이 지나면 꺼지고 백엔드 java 프로세스만 8080에 남는다. 그 PID의 시작 시각을 확인해 끈 뒤 다시 띄운다.
- **드라이브 루트 접근(2026-10-04 재부팅 뒤):** 이 계정이 E 드라이브 루트(`E:/`)를 읽지 못한다(`E:/projects` 아래는 괜찮음). E: 경로에서 띄우면 Vite가 `EPERM lstat` 오류로 멈추고 gradlew `compileJava`가 "cannot find symbol" 100건으로 실패한다. 권한은 사용자가 고칠 일이고, 그 전에는 `subst X: E:/projects/git`(PowerShell에서는 백슬래시 경로)로 잡은 X:에서 `X:/FlowMat/flowmat_backend`·`flowmat_frontend`를 띄운다(Bash 경로 `/x/FlowMat`, 해제는 `subst X: /d`). 재부팅 뒤에는 `docker start flowmat-session1-db flowmat-uicheck-redis`도 필요하다.
- **준비 확인:** 로그인으로 확인하지 않는다(계정당 10분 8회 제한). `curl http://localhost:8080/api/projects`가 401이면 백엔드, `curl http://localhost:5173/`가 200이면 프런트가 떠 있다.
- **백엔드 변경 뒤:** `gradlew test`가 클래스를 지웠다 다시 만들어 devtools 재시작이 반쯤 될 수 있다. `touch build/classes/java/main/org/myweb/flowmat/Application.class` 후 로그에 새 `Started Application`이 찍히면 브라우저 확인을 한다.
- **전체 회귀:**
  - 백엔드 `./gradlew test jacocoTestCoverageVerification`
  - 프런트 `npx vitest run`, `npm run lint`, `npm run typecheck`, `npm run build`
  - E2E `REAL_API_E2E=1 BASE_URL=http://localhost:5173 npx playwright test --grep-invert "BOM approval"`(33건, `bom-lot-flow` 제외)
- **링크:** 문서를 고친 뒤 상대 링크가 깨지지 않았는지 확인하고 `git add -u docs`(새 md는 `git add -f`).

## 6. 기록과 멈춤

- 하루를 끝낼 때 [WORKBOARD](WORKBOARD.md) §1에 한 줄: 한 일, 검증 결과(건수), 남은 문제.
- 기능을 끝내면 WORKBOARD §2에 다음 번호(2bh부터)로 행을 더하고, CURRENT_CAPABILITIES와 도메인 문서를 같은 변경에서 고친다.
- **멈추는 조건:** 결정 없이 할 일이 남지 않으면 새 일을 만들어 내지 않는다. WORKBOARD §1에 "결정 대기" 목록(무엇을, 왜, 근거 문서)을 정리하고 멈춘다. 결정이 필요한 일을 추측으로 구현하지 않는다.

## 7. 사용자가 하는 일

- 커밋·푸시와 CI 확인(Agent는 하지 않는다). 쉬기 전에 지금 트리를 커밋해 두면 커밋 전 변경이 더 쌓이지 않는다.
- WORKBOARD §3의 결정, 세션 DB에 쌓인 BOM의 정리 여부.
