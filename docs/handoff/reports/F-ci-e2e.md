# F. CI 브라우저 E2E

**한 줄 결론:** frontend-only CI는 mock 인증 E2E만 실행하고, backend-services CI가 readiness·실 API 계약·BOM/LOT·LOT genealogy 브라우저 흐름을 담당하도록 분리했다.

## 한 것 / 못 한 것

- `.github/workflows/browser-e2e.yml`은 Postgres 16·Redis 7.4 서비스와 backend readiness를 확인한 뒤 `backend-contract.spec.ts`, `bom-lot-flow.spec.ts`, `lot-genealogy.spec.ts`를 `REAL_API_E2E=1`로 별도 실행한다. 실패 시 백엔드 로그와 Playwright 결과를 artifact로 업로드한다.
- `.github/workflows/frontend.yml`은 backend 없는 환경에서 mock 인증 E2E만 실행한다. 이전 원격 실패는 이 job이 backend 의존 흐름까지 실행해 Vite proxy 오류와 timeout을 낸 것이었고, 현재 실행 경계를 분리했다.
- 로컬 검증: mock 인증 E2E 6/6, backend contract smoke 1/1, frontend lint/typecheck/Vitest 176/build, backend 전체 Gradle test, npm audit 0 vulnerabilities가 통과했다. 원격 최신 `Frontend Tests & Lint` run 45(`e2c0aff`)도 lint·typecheck·unit test·build·mock E2E가 모두 통과했다.
- 실제 BOM·LOT 및 genealogy 흐름은 로컬 PostgreSQL 계정 불일치로 demo login API가 500을 반환해 전체 UI 진행을 완료하지 못했다. 이는 테스트 코드 실패가 아니라 로컬 DB 자격 증명 문제이며, CI 서비스 DB에는 별도 CI 자격 증명이 설정돼 있다.
- 원격 backend-services run 1(`e2c0aff`)은 readiness, backend contract, mock browser E2E까지 통과했지만 `bom-lot-flow.spec.ts`의 첫 Item 생성 후 row 확인에서 실패했다. 백엔드 로그에는 반복된 `Resource not found`가 기록됐고, 테스트가 POST 응답 body를 확인하지 않아 원래 오류를 숨기고 있었다. 현재 테스트는 POST `/api/items` 응답을 직접 기다리고 실패 body를 출력하며 목록 반영 대기 시간을 15초로 늘리도록 수정했다. 이 변경은 아직 push 전이다.
- 추가로 로그인 버튼의 `Working...` 상태를 인증 성공으로 오인하지 않도록 대시보드 인사 문구를 기다리며, 실 API 테스트 진입 시 `Inventory` heading을 확인한다. backend contract smoke도 `prj_demo_main`이 `/api/projects` 응답에 실제로 포함되는지 검증하도록 보강했다. 따라서 다음 실행에서는 demo seed 누락·프로젝트 접근 실패·Item POST 실패를 서로 구분할 수 있다.

## 사람 결정이 필요한 것

- 수정사항 push 후 backend-services job에서 실제 BOM·LOT와 genealogy 3개 흐름의 원격 결과 확인. 첫 Item 생성이 다시 실패하면 새 POST 응답 body와 backend correlation 로그로 project/unit/permission 중 원인을 확정한다.
- staging secret/provider 계정이 준비되면 OAuth 및 migration smoke workflow 수동 실행.

## 다른 담당에게 넘길 것

- **CI 소유자:** 변경사항 push 후 mock/frontend 및 backend-services workflow 결과와 artifact를 확인한다.
- **운영 담당:** `STAGING_BASE_URL`, `STAGING_OAUTH_CALLBACK_URL`, `STAGING_DB_URL`, `STAGING_DB_USERNAME`, `STAGING_DB_PASSWORD`를 staging environment에 설정하고 수동 smoke를 실행한다.
