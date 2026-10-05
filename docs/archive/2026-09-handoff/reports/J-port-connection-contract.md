# J. 공정 포트·연결 계약 인계 (갱신: 2026-09-30)


> **보관 문서(레거시)** · 현재 기준이 아니다. 구현·리팩토링으로 사실과 달라진 내용이 있을 수 있으니 작업 근거로 쓰지 않는다. 지금 기준은 [docs/README.md](../../../README.md), 이 폴더 안내는 [archive/README.md](../../README.md).

**한 줄 결론:** 포트·연결 조건식과 삭제 경쟁을 보완한 뒤 전체 백엔드 943건·빌드·커버리지 게이트가 통과했다. 이름이 null인 포트의 화면 중단도 수정해 실 API 브라우저 검증과 프런트 354건이 통과했다. 조건·용량·실패 정책의 실행 적용은 flow-run 담당 범위다.

## 한 것

| 범위 | 결과 |
|---|---|
| F1 연결 무결성 | 자기 연결, 중복 명시 포트 쌍, 방향·자원 종류·품목·단위 불일치를 거절한다. 한쪽 포트만 지정해도 연결 품목·단위를 검사한다. |
| F2 포트 보호 | 연결된 포트의 계약 필드 수정 시 재검증한다. 포트 삭제와 붙은 연결 삭제를 같은 트랜잭션에서 수행하고 연결 삭제 이벤트를 보낸다. |
| F3 조건식 | 함수 호출 없는 500자 제한 파서·평가기와 `attrs` 스키마 참조 검증을 구현했다. |
| F4 스키마 | 객체·속성·필수 키 형태를 저장 시 검증하고, 출발 포트가 도착 필수 속성을 같은 타입으로 공급하는지 검사한다. |
| F5 검증 API | `GET /workflows/{id}/validation`으로 오류·경고 목록을 읽기 권한 아래 제공한다. 데모 `wf_demo_main`은 오류 0건, `SCHEMA_UNVERIFIED` 경고가 나온다. |
| F6 발행 관문 | 오류가 있으면 revision 발행을 409로 막고 경고만 있으면 발행한다. |
| F7 화면 | Check workflow 패널, 오류 우선 정렬, 문제 클릭 시 공정·포트·연결 선택, 포트·연결 저장 오류의 서버 메시지 표시를 추가했다. |

격차 분석: V24·V25는 열과 DB의 기본 제약을 정의했지만 `role`의 업무 뜻, 스키마 호환성, 표현식 문법, 포트 변경 시 연결 무결성, 발행 전 검증은 없었다. 서버 DTO·엔티티는 값을 저장·반환했고, 기존 화면은 `role`·`resourceType`·`schemaJson`·`validationRule`, `conditionExpr`·`capacity`·`failurePolicy`를 편집할 수 있었으나 오류 상세를 표시하지 못했다. FlowRun 서비스는 이 필드를 읽지 않는다. 상세 규칙과 HTTP 응답은 [공정 포트·연결 계약](../../../domain/process-port-connection-contract.md)에 있다.

주요 변경 파일: `domain/workflow/application/{ProcessConnectionServiceImpl,ProcessIoServiceImpl,WorkflowValidationService,WorkflowRevisionService}.java`, `domain/workflow/domain/{contract/PortSchema,expression/ConditionExpression}.java`, `domain/workflow/api/WorkflowValidationController.java`와 응답 DTO, `domain/workflow/repository/ProcessConnectionRepository.java`; `entities/workflow/api/useWorkflowValidationQuery.ts`, `pages/workspace/model/{validationPanelModel,useWorkflowCanvasActions}.ts`, `pages/workspace/ui/{WorkflowCanvasPage,NodeInspector,ConnectionInspector}.tsx`, `e2e/workflow-validation.spec.ts`. 관련 통합·단위 테스트도 추가했다.

## 최신 검증과 추가 변경 (2026-09-30 14:54 KST)

- `ConditionExpression`이 지원하지 않는 `==`를 저장 시 400으로 거절하도록 수정했다. 이전에는 저장 후 평가만 항상 false였다. 기존 초안의 잘못된 식은 검증 오류로 표시하고 새 revision 발행을 막는다.
- 포트 생성·수정·삭제와 연결 생성·수정·삭제는 워크플로 잠금 뒤 최신 삭제 상태를 다시 확인한다. 포트는 부모 공정의 삭제 상태도 확인하며, 포트 생성과 revision 발행의 잠금을 맞췄다. 삭제된 워크플로의 하위 포트·연결 조회는 404다. 세부 규칙은 계약 PC-20~PC-22에 적었다.
- 변경 파일은 `ConditionExpression.java`, `ProcessIoServiceImpl.java`, `ProcessConnectionServiceImpl.java`와 새 `ConditionExpressionOperatorTest`, `WorkflowConditionOperatorIntegrationTest`, `PortMutationConcurrencyIntegrationTest`, `WorkflowResourceVisibilityIntegrationTest`다. 새 28건은 분리 실행에서 실패·오류·스킵 0건으로 통과했다.
- 현재 작업 트리의 Gradle 9.8 설정으로 전체 `test jacocoTestCoverageVerification build`를 전용 빌드 폴더에서 실행했다. **943건·148개 클래스, 실패·오류·스킵 각각 0건**, 빌드·커버리지 게이트 통과, 4분 32초. 결과: `E:/projects/git/.flowmat-test-output/0928-ports/full-summary-0930-1454.json`. Gradle·의존성·워크플로 변경 7개 파일은 다른 작업자의 미커밋 변경으로 보존했다.
- 첫 실 API `workflow-validation.spec.ts` 검증은 3회 모두 포트 선택 직후 화면 중단으로 실패했다. DB의 `process_io.io_name`은 null을 허용하고 서버도 이름 생략을 null로 저장하는데, `portPolicy.ts`의 폼 변환은 이를 문자열로 가정해 `hasValidPortSelection`에서 `.trim()` 예외를 냈다. 실패 결과는 `E:/projects/git/.flowmat-test-output/0928-browser/workflow-contract-0929/summary.json`에 남겼다.
- 현재 CI의 일반 `Run browser E2E` 단계는 `REAL_API_E2E`가 없어서 이 스펙을 건너뛴다. 위 실패가 현재 CI의 재현 결과라는 뜻은 아니며, 실제 API를 쓰는 화면의 기능 결함이다.
- `portPolicy.ts`가 저장된 포트의 null 이름·유형·색상을 폼 기본값으로 바꾸도록 수정했다. `portPolicy.test.ts`의 새 회귀는 수정 전 실패했고 수정 후 통과했다. 실 API `workflow-validation.spec.ts` 재검증은 **1건 통과, 실패·재시도·스킵 0건**이며 결과는 `E:/projects/git/.flowmat-test-output/0928-browser/workflow-contract-0930-port-fix/summary.json`이다. 전용 서버·컨테이너는 소유 확인 후 정리했다.
- 현재 프런트 의존성으로 `npm run typecheck`, `npm run lint`, `npm test -- --reporter=dot`, `npm run build`가 모두 통과했다. Vitest **354건·69개 파일, 실패 0건**이다.

## 이전 검증과 추가 변경 (2026-09-29 23:33 KST)

- 사용자 승인에 따라 로그인 제한을 설정으로 분리하고 실제 CI 백엔드 기동 환경에 `AUTH_LOGIN_ACCOUNT_LIMIT=100`, `AUTH_LOGIN_IP_LIMIT=200`을 적용했다. 운영 기본값은 계정 8회·IP 12회이며 10분 창과 비밀번호 실패 잠금 규칙을 유지한다. 0·음수 설정은 서버 기동 시 거절한다.
- 변경 파일은 `domain/user/api/AuthController.java`, 새 `domain/user/application/LoginRateLimitProperties.java`, `application.yml`, `.github/workflows/browser-e2e.yml`, 새 `LoginRateLimitDefaultsIntegrationTest`, `LoginRateLimitCiIntegrationTest`, `LoginRateLimitPropertiesTest`다. 구현 전 기본값 2건 통과·CI 값 2건 실패를 확인한 뒤 구현했으며 새 회귀 10건은 모두 통과했다. 실제 Redis에서 9번째·13번째·101번째·201번째 요청의 429와 기존 TTL을 검증했다.
- 전체 `test jacocoTestCoverageVerification build`: **915건·144개 클래스, 실패·오류·스킵 각각 0건**, 3분 16초. 결과는 `E:/projects/git/.flowmat-test-output/0928-ports/full-summary-0929-2333.json`이다. 공유 빌드 경로 대신 기존 전용 빌드 폴더를 사용했다.
- 최신 빌드로 실 API E2E 12개를 CI 순서·workers 1로 실행해 **실패·재시도 성공·스킵 각각 0건**으로 통과했다. Redis 카운터 초기화 없이 로그인 21회가 누적됐고 종료 TTL은 497초다. 결과는 `E:/projects/git/.flowmat-test-output/0928-browser/sequence-login-limits-0929/summary.json`이다. 소유 확인 후 전용 서버·컨테이너만 정리했다.
- 못 한 것: 원격 CI 재실행과 이번 단계의 프런트 단위 검증은 수행하지 않았다. 결정 필요: CI 100·200 설정은 승인·적용됐고 과거 Redis 초기화 초안은 채택하지 않았다. 넘길 것: CI 담당자의 다음 원격 실행 확인과 flow-run 담당자의 런타임 계약 적용이다. 새 Markdown 보고서, 스테이징·커밋·푸시·브랜치 작업, 기존 마이그레이션 수정·DB repair·UTF-8 BOM 삽입은 수행하지 않았다.

## 22:57 검증과 추가 변경 (2026-09-29, 과거 기록)

- 전체 `test jacocoTestCoverageVerification build`: **905건·141개 클래스, 실패·오류·스킵 각각 0건**, 2분 49초. 결과는 `E:/projects/git/.flowmat-test-output/0928-ports/full-summary-0929-2257.json`이다. 중간 전체 868건·892건도 통과했다.
- PC-19: 공백 정리 후 내용이 없는 포트·연결 값은 기본값·기존 값 유지·null 삭제의 기존 규칙을 따른다. `ProcessIoServiceImpl`, `ProcessConnectionServiceImpl`에서 빈 타입이 저장되거나 기존 연결 수정이 409로 실패하던 문제를 수정했다. `ProcessIoCreateRequest`의 필수 단위 오류에는 `unit`을 명시했다. `WorkflowBlankTextIntegrationTest` 6건이 통과했고 두 `hasText` 메서드의 JaCoCo LINE 1/1·BRANCH 4/4다.
- PC-15의 원본 문자 검사를 포트·연결의 요청 본문 참조 ID까지 적용했다. `WorkflowReferenceTextIntegrationTest` 13건에서 잘못된 ID의 400, 기존 포트·연결·버전 보존과 정상 재시도를 확인했다. 수정 전에는 NUL 12건이 DB 오류의 409, 짝 없는 surrogate 1건이 404였다. 상세 필드 목록은 기존 계약 문서에 반영했다.
- 허용된 생산 범위에는 실행·기록·정정·자동 투입·작업지시의 참조 ID와 명령 코드 검사를 추가했다. `ProductionReferenceTextIntegrationTest` 10건, `WorkOrderTextValidationIntegrationTest` 17건, `ProductionCodeLocaleIntegrationTest` 15건이 통과했다. 이번 단계에서 18:08 이후 추가한 회귀는 총 47건이며 전체 실행 횟수를 합산한 숫자가 아니다. 상세 원인과 결과는 기존 벤치마킹 문서에 갱신했다.
- 초기 빈 값 테스트 2건의 조건식 자료를 기존 문법에 맞춰 고친 뒤 실제 실패를 다시 확인했다. 필수 단위는 원래도 400이었으며 메시지만 보완했다. 18:13에 실행하지 못했던 전체 검증은 자동 승인 검토 재시도 가능 시각 이후 다시 승인 검토를 거쳐 통과했다.
- 실제 CI 워크플로는 인계 F의 편집 제한에 따른 승인 대기다. 브라우저 12건은 이전 17:12 빌드의 기록이며 이번 빌드에서 재실행하지 않았다. 프런트·기존 데이터·발행본·마이그레이션을 일괄 변경하지 않았고, 커밋·푸시·스테이징·브랜치 작업·DB repair·UTF-8 BOM 삽입은 하지 않았다.

## 18:08 검증과 추가 변경 (2026-09-29, 과거 기록)

- 전체 `test jacocoTestCoverageVerification build`: **858건·138개 클래스, 실패·오류·스킵 각각 0건**, 2분 42초. 결과는 `E:/projects/git/.flowmat-test-output/0928-ports/full-summary-0929-1808.json`이다.
- PC-17·PC-18: `ProcessIoServiceImpl`, `ProcessConnectionServiceImpl`에서 코드 정규화와 자원 종류 비교를 서버 언어 설정에 독립적으로 처리한다. 유효한 포트 코드의 대소문자 수정은 기존 연결을 유지한다. 포트 수량·연결 용량의 수학적 0은 일반적인 0으로 저장하고, 0이 아닌 값의 기존 숫자 범위·정밀도 검사는 유지한다. 과거 값과 발행본은 자동 변경하지 않는다.
- `ProcessPortCodeLocaleIntegrationTest` 3건과 `ZeroQuantityIntegrationTest` 6건이 통과했다. 후자의 4건은 포트 수량·연결 용량의 생성·수정, 2건은 생산 시작·기록·마감·정정의 기존 0 처리 유지 검증이다. 이전 포트·연결 회귀 89건도 전체 실행에서 계속 통과한다.
- 허용된 생산 코드에는 담당자 50자 검사, 단위 입력 검증, 코드 정규화, null 배열 항목·잘못된 예약 품목 ID 검증, 극소 예약 수량의 안전한 반올림을 추가했다. 실패한 요청의 부분 저장·예약·재고 이동을 막고 정상 재시도를 확인했다. 프런트 수정과 새 마이그레이션은 없다. 세부 원인과 회귀 결과는 기존 `docs/reference/benchmarks/FlowMat-50-repo-code-review.md`에 반영했다.
- 실제 CI 워크플로 수정은 인계 F에 따른 승인 대기다. 브라우저 12건은 앞서 전용 환경에서 17:12 빌드로 검증한 17:15의 기록이며, 이번 빌드에서 재실행했다는 뜻은 아니다. 커밋·푸시·스테이징·브랜치 작업과 BOM 삽입은 하지 않았다.

## 17:20 검증과 추가 변경 (2026-09-29, 과거 기록)

- 전체 `test jacocoTestCoverageVerification build`: **808건·132개 클래스, 실패·오류·스킵 각각 0건**, 3분 4초. 9월 26일에 실패했던 생산 리비전 테스트도 현재 전체 검증에서는 통과한다. 결과는 `E:/projects/git/.flowmat-test-output/0928-ports/full-summary-0929-1720.json`이다.
- 포트·연결 관련 통합 테스트: 소수·JSON 요청 24건, 일반 문자열 37건, 스키마 문자열 11건, 연결 계약 11건, 포트 계약 6건으로 **총 89건 통과**. 실패한 요청의 기존 값·버전 보존과 정상 Unicode·지수 표기·생략/null 정책을 검증했다.
- 추가 코드: `ProcessConnectionUpdateRequest`, `ConnectionDecimalNodeDeserializer`, `ProcessConnectionController`, `WorkflowText`, `PortSchema`, `ProcessIoServiceImpl`, `ProcessConnectionServiceImpl` 및 대응 통합 테스트. PC-14~PC-16의 원래 소수 보존·정규화 전 문자 검사·잘못된 JSON 400 처리를 적용했다. 기존 마이그레이션과 발행된 데이터는 변경하지 않았다.
- 허용된 생산 범위에서는 스냅샷 메타데이터의 앞뒤 NUL 누락도 수정했고 해당 통합 테스트 45건이 통과한다. 이어 설비 부하·필수 확인 값·감사 사유·작업지시 메타데이터를 보완한 회귀 테스트 55건도 통과했다. 프런트 수정은 이번 추가 범위에 없으며 9월 28일의 프런트 353건 기록을 유지한다. 9월 29일에는 CI 로그인 카운터 초기화 초안으로 실 API 브라우저 12건도 다시 통과했다. 실제 워크플로 수정은 인계 F에 따른 승인 대기다. 상세 원인과 결과는 기존 `docs/reference/benchmarks/FlowMat-50-repo-code-review.md`에 갱신했다.
- 결과 폴더는 `E:/projects/git/.flowmat-test-output/0928-ports/`다. 현재 검증 결과는 공유 Git 인덱스와 다른 **작업 트리** 기준이다. 스테이징·커밋·푸시는 하지 않았다.

## 최초 검증 (2026-09-26, 과거 기록)

| 검사 | 결과 |
|---|---|
| 백엔드 관련 통합·단위 테스트 | 연결 6, 포트 1, 포트 삭제 2, 조건식 2, 발행 1, 워크플로 검증 3건: 총 15건 통과, 실패 0건. |
| 백엔드 전체 `gradlew test` | 415건 중 414 통과, 1 실패. `ProductionRunRevisionIntegrationTest.runItemsUsePublishedProcessesAfterDraftDeletionAndRejectNewDraftNodes`가 200을 기대했으나 409를 받았다. |
| 프런트 `typecheck`, `lint`, `test`, `build` | 모두 통과. Vitest 299건, 실패 0건. |
| 브라우저 | `e2e/workflow-validation.spec.ts` 1건 통과. 새 워크플로에서 Check 패널 오류 0건·경고 1건, 문제 클릭으로 연결 선택, 잘못된 조건식의 서버 오류 인라인 표시, 포트 삭제 후 연결의 화면·API 제거를 확인했다. 테스트 워크플로는 종료 시 삭제했다. |

당시 전체 테스트의 1건은 F6 계약과 기존 생산 테스트 자료의 충돌이었다. 연결 없는 입력 포트를 기본값 `requiredYn=Y`로 만든 뒤 발행 성공을 기대했다. 당시에는 인계서의 다른 세션 소유 범위라 수정하지 않고 권한을 물었다. 현재 전체 검증에서는 이 실패가 재현되지 않으며 해당 테스트도 통과한다.

## 못 한 것·결정 필요

- `flow_run` 내부의 조건 평가, 용량 제한, `stop`·`skip`·`retry` 실행 의미는 flow-run 담당 세션에서 정해야 한다. 현재는 정의 저장과 문법 검증만 한다.
- 공유 기능표 `docs/status/CURRENT_CAPABILITIES.md`는 허용된 공정 IO·연결 행만 구현 상태로 갱신했다. 다른 기능 행과 `shared/types/api.ts`는 이번 추가 범위에서 변경하지 않았다. 일반 실행 모델의 기능표 갱신은 flow-run 담당 세션에 남긴다.
- 새 계약 문서와 이 보고서는 루트 `.gitignore`의 `*.md` 규칙 때문에 로컬에는 있으나 `git status`에는 표시되지 않는다. 추후 커밋 담당자가 필요한 경우 해당 두 파일을 명시적으로 포함해야 한다. 여기서는 커밋·푸시·브랜치·마이그레이션 수정·DB repair를 하지 않았다.

## 넘길 것

flow-run 담당자는 published revision의 연결 스냅샷에서 `conditionExpr`, `capacity`, `failurePolicy`를 읽고, 실행 이벤트의 `quantity`·`unit`·`item`·`attrs`를 `ConditionExpression.evaluate`에 전달해야 한다. 누락 값·타입 불일치는 false다. `capacity`는 한 흐름의 최대 수량이며, 재시도 횟수·간격·멱등성, `skip` 후 단계 상태, 순환 그래프 처리, 실패 이벤트 기록 규칙을 실행 모델에 명시하고 별도 테스트를 붙여야 한다. 발행 시 경고인 `CYCLE`·`UNIT_UNKNOWN`·`SCHEMA_UNVERIFIED`를 실행에서 허용할지 결정이 필요하다.
