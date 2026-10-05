# FlowMat × 외부 후보 50개: 관련 구현 코드 전수 대조

> **참고 문서(동결)** · 갱신하지 않는다. 쓴 날 기준의 근거·조사이며, 현행 문서와 다르면 현행 문서가 우선한다. 지금 기준은 [docs/README.md](../../README.md), 이 폴더 안내는 [reference/README.md](../README.md).

검수 기준: 2026-09-27. FlowMat `main` 커밋 [`15bb481e`](https://github.com/SeolJhin/FlowMat/commit/15bb481e29002b2dad7bebfe876c590532614e6a), 외부 저장소는 아래 파일 링크의 고정 커밋 기준. **앞서 제시한 50개 후보 모두에 대해 저장소 트리와 관련 파일을 확인**했다. `OCA/wms`처럼 현재 기본 브랜치에 도메인 구현이 없는 경우에는 코드 부재와 실제 구현 저장소를 확인해 따로 표시했다. 이는 FlowMat 관련 기능을 기준으로 한 저장소별 정적 코드 비교이며, 50개 저장소의 모든 파일과 모든 경로의 버그 검증이나 빌드·테스트 실행 결과는 아니다.

구현·검증 갱신: **2026-09-30 14:54 KST**. 아래 외부 비교 링크는 당시 기준으로 유지하고, 추가 구현은 현재 작업 트리의 `9e418c33`과 그 이후 로컬 변경을 기준으로 확인한다. 해당 커밋은 다른 작업자가 만들었으며 이 작업에서 commit·push·브랜치 명령을 실행하지 않았다.

최신 백엔드 검증(2026-09-30 14:54 KST): **943건·148개 클래스, 실패·오류·스킵 각각 0건**, 커버리지 필수 게이트와 빌드 통과. 앞선 실 API 브라우저 12건 통과는 2026-09-29의 결과다. 이름이 null인 포트의 편집 오류를 수정한 뒤 실 API 워크플로 브라우저 1건도 통과했다. 프런트 타입 검사·lint·354건(69개 파일)·빌드는 2026-09-30 다시 통과했다. flow-run 런타임 계약·실사용 부하 검증은 남아 있으며, 원격 GitHub Actions의 재실행 결과는 확인하지 않았다.

## 2026-09-30 14:54 포트·연결 경쟁 및 브라우저 회귀

- `ConditionExpression`의 `==` 허용·평가 불일치, 포트/연결 변경과 워크플로 삭제의 경쟁, 삭제된 워크플로의 포트/연결 단건 조회 노출을 보완했다. 새 테스트 28건은 분리 실행에서 모두 통과했고, 전체 `test jacocoTestCoverageVerification build`는 **943건·148개 클래스, 실패·오류·스킵 0건**으로 통과했다. Gradle 9.8로 4분 32초가 걸렸으며 결과는 `E:/projects/git/.flowmat-test-output/0928-ports/full-summary-0930-1454.json`이다.
- 실 API `workflow-validation.spec.ts` 재검증은 3회 모두 포트 편집 패널에서 `Cannot read properties of null (reading 'trim')`로 실패했다. V1 `process_io.io_name`은 nullable이고 서버의 포트 생성은 이름 생략을 null로 저장하지만, 프런트 `portPolicy.ts`는 `port.name`을 문자열로 가정한다. 이 문제는 앞선 12개 브라우저 검증의 범위 밖이다. 결과는 `E:/projects/git/.flowmat-test-output/0928-browser/workflow-contract-0929/summary.json`이며 수정 범위를 인계 §2에 따라 확인 중이다.
- 현재 CI 일반 브라우저 단계에는 `REAL_API_E2E`가 없어 이 스펙이 스킵된다. 따라서 위 실패는 로컬 실 API 실행에서 확인한 기능 결함이며 원격 CI 실패의 직접 증거로 쓰지 않는다.
- 현재 프런트 의존성으로 타입 검사, lint, Vitest **353건·69개 파일**, 프로덕션 빌드가 모두 통과했다. 단위 검사의 응답 자료가 실제 nullable `io_name`을 반영하지 않아 브라우저 오류가 남아 있다.
- 이후 `portPolicy.ts`의 저장 포트 폼 변환에서 null 이름·유형·색상을 기존 기본값으로 바꾸고, null 응답 회귀 테스트를 추가했다. 수정 전 새 테스트 1건이 실패했고 수정 후 전체 프런트 **354건·69개 파일**, 타입 검사·lint·빌드가 통과했다. 실 API `workflow-validation.spec.ts`도 **1건 통과, 실패·재시도·스킵 0건**이며 결과는 `E:/projects/git/.flowmat-test-output/0928-browser/workflow-contract-0930-port-fix/summary.json`이다. 검증 전용 환경은 정리했다.
- 현재 `build.gradle`, Gradle wrapper, 백엔드 CI, 프런트 패키지 파일의 변경은 다른 작업자의 작업으로 보존했다. 기존 마이그레이션·DB 체크섬은 변경하지 않았고, 전용 서버·컨테이너만 검증에 사용했다.

## 2026-09-29 23:33 CI 로그인 제한 구성 완료

**한 줄 결론:** CI에서만 계정당 100회·IP당 200회를 허용하도록 구현했으며 운영 기본값 8회·12회와 초과 요청의 429 차단을 확인했다.

### 한 것

- 기존 실패는 앞선 7회 뒤 NCR의 API 로그인이 8번째, 화면 로그인이 9번째여서 계정 제한 8회를 넘은 것이다. 실 API 12개 스펙은 정상 순서에서 총 21회 로그인하며, 각 스펙의 재시도 2회를 포함하면 최대 63회다. 계정 제한만 올리면 IP 제한 12회에도 걸리므로 두 값을 분리했다.
- `LoginRateLimitProperties`를 추가하고 `AuthController`가 로그인 제한을 이 설정에서 읽도록 변경했다. `application.yml`의 `AUTH_LOGIN_ACCOUNT_LIMIT`·`AUTH_LOGIN_IP_LIMIT` 기본값은 각각 8·12이며, `.github/workflows/browser-e2e.yml`의 백엔드 기동 환경에만 100·200을 넣었다. 제한 창은 기존 10분이고 로그인 실패 잠금 규칙은 그대로다. 0·음수 제한은 설정 검증에서 서버 기동을 실패시킨다.
- 실제 Redis를 사용하는 기본값 통합 테스트 2건·CI 값 통합 테스트 2건과 설정 바인딩·거절 단위 테스트 6건을 추가했다. 구현 전 CI 통합 2건은 조기 429로 실패했고 기본값 2건은 통과했다. 구현 후 새 테스트 **10건 모두 통과**했으며 9번째·13번째·101번째·201번째 요청의 429와 600초 이내 TTL을 확인했다.
- 전체 `test jacocoTestCoverageVerification build`는 **915건·144개 클래스, 실패·오류·스킵 각각 0건**, 3분 16초로 통과했다. 전용 빌드 폴더를 사용했으며 결과는 `E:/projects/git/.flowmat-test-output/0928-ports/full-summary-0929-2333.json`이다.
- CI 순서의 실 API E2E 12개를 같은 전용 DB·Redis에서 workers 1로 실행해 전부 재시도 없이 통과했다. 카운터 초기화 0회, `demo-owner` 카운터 21회, 종료 시 남은 TTL 497초다. 결과는 `E:/projects/git/.flowmat-test-output/0928-browser/sequence-login-limits-0929/summary.json`이다. 실행 뒤 소유를 확인해 전용 18080·5175 서버와 5435·6385 컨테이너만 정리했다.

### 못 한 것

원격 CI 재실행은 수행하지 않았다. 프런트 코드를 바꾸지 않았으며 이번 단계에서 프런트 단위 테스트·lint·typecheck·build를 다시 실행하지 않았다.

### 결정 필요

CI 100회·200회 설정은 사용자의 승인으로 확정·적용됐다. 이전 Redis 초기화 초안은 채택하지 않았으며 아래 과거 기록의 워크플로 승인 대기는 현재 상태가 아니다.

### 넘길 것

CI 담당자는 최신 코드와 환경변수 두 개를 함께 반영해 다음 GitHub Actions 실행을 확인한다. flow-run의 조건·용량·실패 정책 실행 계약은 기존 담당 범위로 남긴다. 이 작업에서는 스테이징·커밋·푸시·브랜치 작업, 기존 마이그레이션 수정·DB repair·UTF-8 BOM 삽입을 수행하지 않았다.

## FlowMat 현재 기준을 바로잡는다

- [`ProductionRun`](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRun.java)의 `workflowRevisionId`, [`FlowRunStep`](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/flowrun/domain/entity/FlowRunStep.java), [`FlowRunStepAttempt`](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/flowrun/domain/entity/FlowRunStepAttempt.java)는 이미 구현돼 있다.
- [`StorageLocation`](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/StorageLocation.java), [`WarehouseTask`](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/WarehouseTask.java), [`StockAllocation`](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/StockAllocation.java)도 이미 구현돼 있다. 이전의 'WMS 위치 모델을 새로 만들자' 같은 제안은 폐기한다.
- 코드에 각각 [`FlowRunStepIntegrationTest`](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/test/java/org/myweb/flowmat/FlowRunStepIntegrationTest.java), [`StorageLocationIntegrationTest`](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/test/java/org/myweb/flowmat/StorageLocationIntegrationTest.java), [`WarehouseTaskIntegrationTest`](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/test/java/org/myweb/flowmat/WarehouseTaskIntegrationTest.java)가 있다. 이번 검수에서 테스트를 실행했다는 뜻은 아니다.

## 후보별 실제 코드 대조

### MES (10개)

| 저장소·고정 소스 | 소스에서 확인한 구현 | FlowMat 대응 코드 | 검수 판단 |
|---|---|---|---|
| [Mes-Open/OpenMes `BatchStep.php`](https://github.com/Mes-Open/OpenMes/blob/0ca2dc0336494ceeb6e8f054f5e03230133934e0/backend/app/Models/BatchStep.php) | 단계 상태 READY/IN_PROGRESS/DONE, 설비와 실제 시간·수량 | [실행 단계](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/flowrun/domain/entity/FlowRunStep.java) | 완료 상태·시간·실적 연결 방식 비교 |
| [sindohmes/mes4u `MtlRoutingDetails.java`](https://github.com/sindohmes/mes4u/blob/ed57f3db9e1eca6bcad4a4afb20225f72f8663c9/src/main/java/com/sindoh/sdmes/model/MtlRoutingDetails.java) | routing_id+operation_id, 순서·유효일·단위 | [공정](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/domain/entity/Process.java) | 경로 버전과 공정 순서 비교 |
| [SMEWebify/WebErpMesv2 `InventoryService.php`](https://github.com/SMEWebify/WebErpMesv2/blob/83ebb12c8479340bcdb5f523790cfe3d45d3c574/app/Services/Inventory/InventoryService.php) | 재고 실사 시작 시 현재 재고 스냅샷을 트랜잭션에서 생성 | [재고 이력](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/InventoryTransaction.java) | 실사 스냅샷과 장부 재고 분리 참고 |
| [kuaigeyun/kuaigeyun-mes `work_order_operation.py`](https://github.com/kuaigeyun/kuaigeyun-mes/blob/ad113f14abdc98c6320b2296883c0af6d51dfbcc/riveredge-backend/src/apps/kuaizhizao/models/work_order_operation.py) | 작업지시 공정별 계획·실제 시작/종료·양품/불량 수량 | [실행 단계](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/flowrun/domain/entity/FlowRunStep.java) | FlowRunStep와 ProductionRunItem의 결합 경계 비교 |
| [iplus-framework/iPlusMES `ProdOrder.cs`](https://github.com/iplus-framework/iPlusMES/blob/52962b3782a2ccbe55ca9af7f05914baa951c337/gip.mes.datamodel/EFModels/ProdOrder.cs) | 생산주문과 별도 주문 상태 엔티티 참조 | [작업지시](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/WorkOrder.java) | 상태 사전 분리 패턴 검토 |
| [VidetteMakes/MESS `ProductionLogStepAttempt.cs`](https://github.com/VidetteMakes/MESS/blob/66f751e5660e95b62b9d85805ba88a4fc00b90ed/MESS/MESS.Data/Models/ProductionLogStepAttempt.cs) | 한 생산 단계에 다수 시도, 성공·시간·불량 사유 | [시도 기록](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/flowrun/domain/entity/FlowRunStepAttempt.java) | FlowMat에 이미 시도 엔티티가 있으므로 오류/불량 분류만 비교 |
| [factorysemantics/factorysemantics-mes `workorders.py`](https://github.com/factorysemantics/factorysemantics-mes/blob/f9705990fd8d6ccd3e930b61915df06899100919/src/fsmes/domain/workorders.py) | 작업지시·공정 각각의 상태와 설비/제품 연결 | [작업지시](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/WorkOrder.java) | HOLD/CLOSED와 단계 상태 차이를 검토 |
| [xianshi3/virtual-path-mes `ProcessStep.java`](https://github.com/xianshi3/virtual-path-mes/blob/8bc864b30180bc5f6ac7648f48c5bf41057e222a/mes-process/src/main/java/com/mes/process/entity/ProcessStep.java) | 템플릿 공정 단계의 순서·표준 소요시간 | [공정](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/domain/entity/Process.java) | 설계 속성으로 표준 시간 필요성 평가 |
| [baryonlabs/open-mes-korea `work_order.ex`](https://github.com/baryonlabs/open-mes-korea/blob/926115d2216fef9085669889d66443f0f7d11b22/open_mes/lib/open_mes/production/work_order.ex) | 생성·수정·상태 전이 changeset 분리 | [작업지시](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/WorkOrder.java) | 일반 수정 API에서 상태 변경이 가능한지 대조 |
| [OCA/manufacture `mrp_bom.py`](https://github.com/OCA/manufacture/blob/75d07dcbad5b893cdb887bf80b2a275b084fc291/mrp_bom_version/models/mrp_bom.py) | BOM draft/active/historical 버전 전이 | [BOM](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/bom/domain/entity/BomHeader.java) | BOM 고정과 폐기된 정의의 조회 계약 검토 |

### BPM (10개)

| 저장소·고정 소스 | 소스에서 확인한 구현 | FlowMat 대응 코드 | 검수 판단 |
|---|---|---|---|
| [flowable/flowable-engine `ProcessInstance.java`](https://github.com/flowable/flowable-engine/blob/74fdb349c134e96e1f10592020ccca6e2e4b85f0/modules/flowable-engine/src/main/java/org/flowable/engine/runtime/ProcessInstance.java) | 인스턴스에 정의 ID/버전/시작 사용자·시각 | [실행/리비전](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRun.java) | 이미 구현된 리비전 링크의 호환성과 null 경로 검증 |
| [camunda/camunda `ProcessInstanceLifecycle.java`](https://github.com/camunda/camunda/blob/1e8e2a36500f2898b530465b53cd830f5e3f2dff/zeebe/engine/src/main/java/io/camunda/zeebe/engine/processing/bpmn/ProcessInstanceLifecycle.java) | 요소별 최종·종료 가능 상태를 명시 | [실행 단계](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/flowrun/domain/entity/FlowRunStep.java) | 단계 상태 전이 허용 집합 대조; 외부 라이선스 주의 |
| [operaton/operaton `ProcessInstance.java`](https://github.com/operaton/operaton/blob/2ced2ec415ef0ef38c3c6e68f360e194a470ef7a/engine/src/main/java/org/operaton/bpm/engine/runtime/ProcessInstance.java) | 실행이 프로세스 정의를 참조하고 중지 여부를 노출 | [실행/리비전](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRun.java) | 중지/폐기 정책만 비교 |
| [Activiti/Activiti `ProcessInstance.java`](https://github.com/Activiti/Activiti/blob/729359d1e52069fb012f8aa620009735fc18cf4f/activiti-core/activiti-engine/src/main/java/org/activiti/engine/runtime/ProcessInstance.java) | 실행의 정의 ID·정의 버전 보관 | [실행/리비전](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRun.java) | FlowMat의 최신 발행본 선택 계약 비교 |
| [bonitasoft/bonita-engine `ProcessInstance.java`](https://github.com/bonitasoft/bonita-engine/blob/a8a4a40c1d82f2aa4250df6072665ae3fbe6291c/bpm/bonita-common/src/main/java/org/bonitasoft/engine/bpm/process/ProcessInstance.java) | 실행 상태·시작/완료 시각·시작자 | [실행/리비전](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRun.java) | 감사 필드 범위 비교 |
| [ProcessMaker/processmaker `ProcessRequest.php`](https://github.com/ProcessMaker/processmaker/blob/0d63878bafb41c90257fe1a8ce4208abbc3a1b58/ProcessMaker/Models/ProcessRequest.php) | 프로세스 요청이 정의와 버전 모델을 참조 | [실행/리비전](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRun.java) | 버전 지정·실행 이력 경계 비교 |
| [conductor-oss/conductor `WorkflowDef.java`](https://github.com/conductor-oss/conductor/blob/da325130588fdff8ed89f924d77a970ca63bcdf1/common/src/main/java/com/netflix/conductor/common/metadata/workflow/WorkflowDef.java) | 버전·작업 목록·입력/출력·실패 워크플로 | [공정/포트](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/domain/entity/ProcessIo.java) | 조건/재시도 전체 엔진 도입 전 정의 계약만 비교 |
| [temporalio/temporal `execution_manager.go`](https://github.com/temporalio/temporal/blob/d8f9c6d86b2cd0ea5c27d0694a598da84c6d337d/common/persistence/execution_manager.go) | 실행 갱신과 히스토리 저장·실패 시 상태 되돌림 | [실행 이벤트](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/flowrun/domain/entity/FlowRunEvent.java) | 상태 기록 원자성 및 재시도 중복 위험 검토 |
| [cadence-workflow/cadence `retry.go`](https://github.com/cadence-workflow/cadence/blob/b22b5e2770e4020131ec24d1c33e6d330033b6c5/service/history/execution/retry.go) | 치명 오류와 최대 시도 수로 재시도 판단 | [시도 기록](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/flowrun/domain/entity/FlowRunStepAttempt.java) | 실패 유형별 재시도 정책 검토 |
| [bpmn-io/bpmn-js `Modeling.js`](https://github.com/bpmn-io/bpmn-js/blob/6eaa6917b1a61f9fe527c7ac31ed0855204c1bec/lib/features/modeling/Modeling.js) | 명령 스택을 통한 모델 변경 | [편집 이력](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_frontend/src/lib/flowmat-editor/history/HistoryManager.ts) | 이미 있는 HistoryManager의 모델/저장 취소 경계 대조 |

### SCM (10개)

| 저장소·고정 소스 | 소스에서 확인한 구현 | FlowMat 대응 코드 | 검수 판단 |
|---|---|---|---|
| [frePPLe/frepple `operation.py`](https://github.com/frePPLe/frepple/blob/98b2442c80183e3d10f4e4e7a4d043e41f4f335c/freppledb/input/models/operation.py) | OperationMaterial에 생산·소비 수량과 장소 연결 | [공정/포트](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/domain/entity/ProcessIo.java) | 계획 수량과 재고 실적의 책임 분리 |
| [fleetbase/fleetbase `schedule.js`](https://github.com/fleetbase/fleetbase/blob/4ff6980c6db6f3e8103b3ec425a089aa6d251af4/console/app/models/schedule.js) | 루트 코드는 일정 UI; 핵심 물류 코드는 git submodule fleetops | [창고 작업](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/WarehouseTask.java) | [fleetops Order 소스](https://github.com/fleetbase/fleetops/blob/main/server/src/Models/Order.php)에서 경로·배차 비교 |
| [openboxes/openboxes `StockMovement.groovy`](https://github.com/openboxes/openboxes/blob/71454492fd8a8aeef88151b13c171d244c0dbf1a/src/main/groovy/org/pih/warehouse/api/StockMovement.groovy) | 재고 이동에 출발·도착 장소·상태·배송 예정일 | [재고 이력](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/InventoryTransaction.java) | 이동 명령과 장부 기록을 구분 |
| [OCA/purchase-workflow `purchase_request.py`](https://github.com/OCA/purchase-workflow/blob/515fba4ead2891734f8c32cfaa4f3e77a8740aca/purchase_request/models/purchase_request.py) | 구매요청 draft→승인→진행 상태 및 요청 라인 | [작업지시](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/WorkOrder.java) | 구매요청은 별도 도메인; 생산지시를 재사용하지 않음 |
| [OCA/stock-logistics-workflow `stock_quant.py`](https://github.com/OCA/stock-logistics-workflow/blob/fd568a6a98dccb918ee6db6728e6881ab9532e79/stock_no_negative/models/stock_quant.py) | 품목·장소별 음수 재고 제약 | [재고](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/Inventory.java) | FlowMat 재고 차감 경로의 원자적 검사와 비교 |
| [OCA/delivery-carrier `stock_picking.py`](https://github.com/OCA/delivery-carrier/blob/b2b9b5ec25561f5845f55c7d641bda749842abd9/delivery_pre_shipping/models/stock_picking.py) | 피킹을 운송사에 전달하는 외부 연동 | [창고 작업](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/WarehouseTask.java) | FlowMat 현 범위는 출고 연동 전 단계 |
| [SE214-Semicolon/Warehouse-and-Supply-Chain-Management-System `stock-movement.entity.ts`](https://github.com/SE214-Semicolon/Warehouse-and-Supply-Chain-Management-System/blob/905c34cee9e62809b9f6f72c1c1678bcf68983de/backend/src/modules/inventory/entities/stock-movement.entity.ts) | 이동 수량·출발/도착 장소·이동 종류 | [재고 이력](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/InventoryTransaction.java) | 이동 기록의 위치 필드 비교 |
| [samirsaci/supply-chain-optimization `supply_chain_optimization.py`](https://github.com/samirsaci/supply-chain-optimization/blob/351bb2ad832712540089d1acb443220bb1bd5bdf/supply_chain_optimization.py) | PuLP 수요 제약·공장 능력 제약의 입지 최적화 | [공정/포트](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/domain/entity/ProcessIo.java) | 업무 시스템 구현이 아닌 계획 알고리즘 참고 |
| [emoss08/Trenova `handler.go`](https://github.com/emoss08/Trenova/blob/b74bd2dcc6cbd01259efcb9914ff135178e4aabd/services/tms/internal/api/handlers/shipmenthandler/handler.go) | 운송건 목록·배정·상태·요금 준비 API | [창고 작업](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/WarehouseTask.java) | 차량·운임은 현재 FlowMat 범위 바깥 |
| [microsoft/Recurring-Integrations-Scheduler `Scheduler.cs`](https://github.com/microsoft/Recurring-Integrations-Scheduler/blob/b6f09b6671e46490e3b5fcd192ce1ae4cc6593a5/Scheduler/Scheduler.cs) | Quartz 기반 Dynamics 통합 작업 스케줄링 | [실행 이벤트](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/flowrun/domain/entity/FlowRunEvent.java) | SCM 도메인 모델로 사용하지 않음 |

### ERP (10개)

| 저장소·고정 소스 | 소스에서 확인한 구현 | FlowMat 대응 코드 | 검수 판단 |
|---|---|---|---|
| [frappe/erpnext `bom.py`](https://github.com/frappe/erpnext/blob/e4621bfb506ac2677a078b1847bba9a88db6efba/erpnext/manufacturing/doctype/bom/bom.py) | BOM 트리 전개와 원가 계산 서비스 분리 | [BOM](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/bom/domain/entity/BomHeader.java) | 복잡 BOM의 전개/순환 검증 비교 |
| [odoo/odoo `mrp_production.py`](https://github.com/odoo/odoo/blob/17ff827a18248397342e73bb2bcac48e2b8e1027/addons/mrp/models/mrp_production.py) | 생산지시와 투입/산출 stock move 관계 | [실적 품목](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRunItem.java) | 공정 실적과 재고 반영 경계 비교 |
| [Dolibarr/dolibarr `bom.class.php`](https://github.com/Dolibarr/dolibarr/blob/1a1a727c67a94ccbb15e37ed8f8fa19c46c1d79a/htdocs/bom/class/bom.class.php) | BOM DRAFT/VALIDATED/CANCELED 상태 | [BOM](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/bom/domain/entity/BomHeader.java) | 승인 후 수정과 실행 시 버전 고정 비교 |
| [metasfresh/metasfresh `MPPOrder.java`](https://github.com/metasfresh/metasfresh/blob/2b933f0d1fa14c06a4d54d1750e33c9589bd6bf0/backend/de.metas.manufacturing/src/main/java/org/eevolution/model/MPPOrder.java) | 제조주문과 문서 상태·라우팅 연계 | [작업지시](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/WorkOrder.java) | Java 서비스 경계는 추가 추적 필요; 기술스택 유사성만으로 채택하지 않음 |
| [idempiere/idempiere `MProduction.java`](https://github.com/idempiere/idempiere/blob/d04fadd21e4a0b82faab6ddac6ee947d7a0a5c5c/org.adempiere.base/src/org/compiere/model/MProduction.java) | DocAction 구현, 생산 실행의 문서 상태 | [실행/리비전](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRun.java) | 문서 상태와 재고 이벤트 원자성 비교 |
| [apache/ofbiz-framework `ProductionRun.java`](https://github.com/apache/ofbiz-framework/blob/9711ae85345df0eddb6a6767f7bbc7af7547caae/applications/manufacturing/src/main/java/org/apache/ofbiz/manufacturing/jobshopmgt/ProductionRun.java) | ProductionRun에 routing task와 자재 component 목록 | [실행 단계](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/flowrun/domain/entity/FlowRunStep.java) | 단계/자재 기록의 집계 경계 비교 |
| [axelor/axelor-open-suite `StockMove.xml`](https://github.com/axelor/axelor-open-suite/blob/0c70d561b19fc454eba9fdd41689258846626d75/axelor-stock/src/main/resources/domains/StockMove.xml) | 재고 이동의 출발/도착 위치와 계획/실제 라인 | [재고 이력](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/InventoryTransaction.java) | FlowMat의 StorageLocation·WarehouseTask와 대조 |
| [etendosoftware/etendo_core `M_PRODUCTION.xml`](https://github.com/etendosoftware/etendo_core/blob/4839a43fd102a5ec71b27cb2eefb286a8365b2cb/src-db/database/model/tables/M_PRODUCTION.xml) | 생산 헤더의 날짜·조직·프로젝트 FK 제약 | [실행/리비전](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRun.java) | DB 수준 제약 비교, 실행 서비스는 추가 추적 대상 |
| [inoerp/inoERP `inv_item_master.js`](https://github.com/inoerp/inoERP/blob/4cd2b39fcc63dbcd27c56d79c81223716befd05f/assets/js/ierp/inv/inv_item_master.js) | 현 기본 브랜치에 README의 Go 백엔드 소스가 없고 JS 후크만 확인 | [BOM](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/bom/domain/entity/BomHeader.java) | 현 코드만으로 ERP/MES 서버 모델 벤치마크 부적합 |
| [tryton/tryton `production.py`](https://github.com/tryton/tryton/blob/61ba7e961f88d60a1da7c461732136bfc37a7ec5/modules/production/production.py) | 생산 input/output 각각 stock move 연결 | [실적 품목](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRunItem.java) | 생산 실행에서 자재 이동의 기록 방식 비교 |

### WMS (10개)

| 저장소·고정 소스 | 소스에서 확인한 구현 | FlowMat 대응 코드 | 검수 판단 |
|---|---|---|---|
| [openwms/org.openwms `EventPublisher.java`](https://github.com/openwms/org.openwms/blob/9d263bf65ec75301e0302539ae7bf581412742b8/org.openwms.core.util/src/main/java/org/openwms/core/event/EventPublisher.java) | 루트는 공통 이벤트 유틸; 도메인 서비스 분리 | [창고 작업](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/WarehouseTask.java) | [공개 TMS TransportOrder](https://github.com/openwms/org.openwms.tms.transportation/blob/master/src/main/java/org/openwms/tms/TransportOrder.java)로 대상 교체 |
| [GreaterWMS/GreaterWMS `models.py`](https://github.com/GreaterWMS/GreaterWMS/blob/be9c952e01a06a9725ee7ad8c64dddfb34cc9884/stock/models.py) | onhand/검수/보류/불량/피킹 재고 구분 | [재고](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/Inventory.java) | 가용량과 실물량 상태 구분 검토 |
| [fjykTec/ModernWMS `StockmoveEntity.cs`](https://github.com/fjykTec/ModernWMS/blob/1837e17e6017f3cb6aea93437d2370659ee9392b/backend/ModernWMS.WMS/Entities/Models/Stockmove/StockmoveEntity.cs) | 이동 상태·출발/도착 goods location | [창고 작업](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/WarehouseTask.java) | 작업 완료와 실제 재고 이동의 연결 비교 |
| [jingsewu/open-wes `IStockApi.java`](https://github.com/jingsewu/open-wes/blob/9d09311ab08e8b2d7472410b56558cf520757458/server/modules-wes/wes-api/src/main/java/org/openwes/wes/api/stock/IStockApi.java) | SKU 배치/컨테이너 재고 잠금·동결 API | [재고 예약](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/StockAllocation.java) | FlowMat 예약/격리 수량 의미 비교 |
| [OCA/wms `README.md`](https://github.com/OCA/wms/blob/fcb1718ef8e498e1fb87fb2dbc48d5ad90473046/README.md) | 기본 브랜치에 WMS 구현 애드온 없음; 다른 저장소 안내 | [보관 위치](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/StorageLocation.java) | 코드 벤치마크 대상에서 제외, OCA 개별 모듈로 대체 |
| [OCA/stock-logistics-warehouse `stock_move.py`](https://github.com/OCA/stock-logistics-warehouse/blob/ef117acc8e51dc4bf904ccd5c62fe8c7f21f9de6/stock_move_location/models/stock_move.py) | 위치 간 이동을 stock.move 확장으로 표현 | [보관 위치](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/StorageLocation.java) | 위치 이동과 장부 이력 일치 조건 검토 |
| [OCA/stock-logistics-shopfloor `zone_picking.py`](https://github.com/OCA/stock-logistics-shopfloor/blob/ff1d24a6684017182e09e987cdc0dc451ae2aecf/shopfloor/services/zone_picking.py) | 구역 스캔·로트·피킹 수량 단계 처리 | [창고 작업](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/WarehouseTask.java) | 작업 단계·오인식/정정 UX 참고 |
| [myTinyWMS/myTinyWMS `InventoryItem.php`](https://github.com/myTinyWMS/myTinyWMS/blob/d381867a96495b9bda7636276064a7d723fb4702/app/Models/InventoryItem.php) | 실사 항목과 품목·처리자 연결; 저장소 archived | [재고](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/Inventory.java) | 유지보수 중단으로 구현 채택 제외 |
| [shuxiang/MT-WMS `stockin.py`](https://github.com/shuxiang/MT-WMS/blob/785f56dfe9035492f64a94f55da30c0d79c08f73/models/stockin.py) | 입고에 회사/창고/소유자·외부 주문 참조 | [창고 작업](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/WarehouseTask.java) | 프로젝트/소유자 격리와 이동 출처 비교 |
| [openshiporg/openship `Order.ts`](https://github.com/openshiporg/openship/blob/04b231d936a6954d07f11f839246d5815a4d12f2/features/keystone/models/Order.ts) | 쇼핑 주문 연결·순차적 링크 라우팅 중심 | [창고 작업](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/WarehouseTask.java) | 현재 코드는 OMS 경계, WMS 구현으로 일반화하지 않음 |

## 검수 결론

1. **우선 비교군:** Mes-Open/OpenMes, kuaigeyun/kuaigeyun-mes, OCA/manufacture, Flowable, Conductor, bpmn-js, frePPLe, openboxes, ERPNext, Odoo, Tryton, ModernWMS, open-wes. 이미 있는 FlowMat 기능과의 차이를 특정 파일 수준에서 추적할 수 있다.
2. **원래 추천 교정:** `openwms/org.openwms`는 공통 유틸과 문서 저장소여서 구현 비교는 공개 `org.openwms.tms.transportation`으로 이동한다. `OCA/wms`는 기본 브랜치의 애드온이 없으므로 개별 OCA 저장소로 이동한다. `fleetbase/fleetbase`는 git submodule의 `fleetops` 실제 코드까지 확인해야 한다. `inoerp/inoERP`는 README가 말하는 Go 백엔드 소스가 현재 브랜치에 보이지 않아 제외한다. `myTinyWMS`는 archived 상태다.
3. **FlowMat 위험과 현재 작업 트리의 보완:** 기준 커밋 `15bb481e`의 [`ProductionFlowRunAdapter`](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/application/ProductionFlowRunAdapter.java)는 `simulation`, `test`, `dry_run`을 허용하지만, 당시 [`ProductionRunServiceImpl`](https://github.com/SeolJhin/FlowMat/blob/15bb481e29002b2dad7bebfe876c590532614e6a/flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/application/ProductionRunServiceImpl.java)의 품목 기록은 실행 유형을 보지 않고 재고·예약·LOT에 반영했다. 이는 [실행 모델](../../archive/2026-09-architecture/execution-model.md)의 시뮬레이션 계약과 충돌했다. **이번 로컬 작업 트리**에서는 비실제 실행의 재고·예약·계보 변경과 실제 생산량 집계를 차단하고, 정정 및 실행 유형 검증도 보완했다. 이 변경은 기준 커밋 링크에 포함되지 않는다.
4. **2026-09-28 추가 보완:** 발행 리비전이 없는 생산 실행도 선택한 `processIoId`의 `itemId`·`direction`을 검사한다. 다른 품목이나 반대 방향의 기록은 저장·재고 처리 전에 필드 이름을 담은 메시지와 HTTP 400으로 거절한다. 발행 리비전 경로는 고정된 포트 정의를 계속 사용한다. 생산 정정의 LOT 소비자 안내는 입출력 기록만 보던 방식에서 **아직 역분개되지 않은 실제 재고 차감 거래**를 조회하는 방식으로 바꿨다. 거래가 없는 시뮬레이션·0수량·반올림 후 0수량은 제외하고, 과거 잘못 저장된 시뮬레이션 차감 거래는 진단에 포함한다.
5. **생산 수량·동시 변경 보완:** 시작의 `plannedOutputQty`, 종료의 `actualOutputQty`, 품목 기록의 `plannedQty`·`actualQty`가 음수이면 필드 이름을 포함한 HTTP 400으로 거절한다. 품목 기록·취소·종료·체크리스트 확인/해제·LOT 자동배분은 동일한 실행 행을 잠근 뒤 최신 상태를 검증한다. LOT 자동배분의 잠금 순서도 실행 → 재고로 맞췄다. 작업 안내의 수정·단계 추가/삭제·삭제·발행·리비전 복사는 안내 행을 잠그므로, 발행을 기다린 요청이 오래된 draft 상태로 발행본을 바꿀 수 없다.
6. **LOT 계보의 물리 이동 기준:** 계보 연결과 생산 LOT 표시는 일치하는 LOT의 비영 재고 거래가 있고 그 거래가 역분개되지 않은 기록만 사용한다. 0수량 및 `0.01 g → 0.0000 kg`처럼 재고 정밀도에서 0으로 반올림되는 기록은 기록 순서와 관계없이 계보를 만들지 않는다. 취소·정정의 계보 재구성도 같은 기준을 적용하며, 해당 실행이 잘못 남긴 생산 LOT 표시를 정리한다. 전체 기존 데이터의 일괄 정리는 실행하지 않았다.
7. **체크리스트 리비전 연결 보존:** 기존 계약 R1은 첫 확인 때의 리비전을 유지하지만, 기존 코드는 마지막 확인 행을 지우면 현재 배포본으로 돌아가 마감 제한도 달라졌다. `production_run.work_instruction_id`에 첫 성공한 확인의 리비전을 보존하도록 수정했다. 조회나 실패한 확인은 연결을 만들지 않는다. 최신 마이그레이션이 V37임을 생성 직전에 다시 확인하고 **V38만 추가**했다. 확인 행을 전부 지운 뒤에는 기존 테이블에서 원래 연결을 복구할 수 없기 때문에 영속 필드가 필요하다. V38은 남아 있는 확인 중 가장 이른 시각의 리비전을 채우고, 확인이 없는 실행은 미연결 상태로 둔다. 이미 전부 삭제된 과거 확인의 리비전은 자동 복구할 수 없다. 기존 DB에는 적용하지 않고 Testcontainers에서만 검증한다.
8. **문서 부채:** [`docs/archive/2026-09-architecture/domain-roadmap.md`](../../archive/2026-09-architecture/domain-roadmap.md)의 P1은 이미 구현된 실행 리비전 고정을 후보 작업으로 남기고, P3은 이미 있는 `StorageLocation`·`WarehouseTask`를 도입 예정처럼 설명한다. 현행 기능표와 실제 코드에 맞춘 갱신이 필요하다. 기존 도메인 문서는 다른 세션 담당이므로 이번 작업에서는 편집하지 않았다.

### 이번 보완 작업의 우선순위

| 우선순위 | 확인된 근거 | 필요한 작업 | 완료 증거 |
|---|---|---|---|
| P0 | `simulation` 품목 기록이 `InventoryCommandService.apply` 및 예약 소비로 이어지는 경로 | 비실제 실행 유형의 재고·예약·LOT 부작용 경계를 정하고 생산 서비스에 적용 | 로컬 수정 완료; `ProductionSimulationIntegrationTest`에서 수량·거래·예약·계보 확인 |
| P1 | 실행 시작에는 `simulation`이 노출되지만 재고 연결 품목 기록에 모드 확인이 없음 | `test`·`dry_run`까지 같은 정책을 적용하고 취소·정정·LOT 자동배분 경로를 함께 검토 | 로컬 수정 완료; `test`·`dry_run`·정정 승인·LOT 자동배분·취소 회귀 검증 통과 |
| P1 | 리비전이 없는 실행에서 선택 포트와 다른 품목·입출력 방향을 기록할 수 있음 | 리비전 없는 경로에도 포트 계약 검증 적용 | 로컬 수정 완료; `ProductionRunPortContractIntegrationTest` 6건에서 두 경로의 거절·재고 불변 및 정상 단위 환산 확인 |
| P1 | LOT 소비자 안내가 시뮬레이션·0수량 기록도 실제 소비자로 간주함 | 소비자 조회를 역분개되지 않은 재고 차감 거래로 제한 | 로컬 수정 완료; `ProductionSimulationIntegrationTest`에서 비실제 3개 유형·0수량·미세 수량·과거 시뮬레이션 거래 검증 |
| P1 | 음수·DB 범위 초과·저장 정밀도 아래 수량이 계획·실적·단위 환산에 전달됨 | 각 필드 검증 후 소수 4자리로 정규화하고 단위 환산·BOM·재고에 동일 수량 사용 | 구현 완료; `ProductionRunQuantityIntegrationTest` 37건에서 경계·변환·정정·불변 검증 |
| P1 | 종료를 기다리는 기록·취소·체크리스트·자동배분이 이전 running 상태로 성공함 | 실행 행 잠금 후 상태 검증, 실행 → 재고 잠금 순서 통일 | 로컬 수정 완료; `ProductionRunLifecycleConcurrencyIntegrationTest` 6개 API 경로 검증 |
| P1 | 발행을 기다리는 수정·삭제가 발행본을 바꾸거나 draft로 되돌림 | 작업 안내의 변경·발행·리비전 복사를 동일한 행 잠금으로 직렬화 | 로컬 수정 완료; `WorkInstructionConcurrencyIntegrationTest`에서 발행본 불변과 대기 후 리비전 복사 검증 |
| P1 | 재고 이동이 없는 0수량·반올림 후 0수량이 LOT 계보와 생산 표시를 만듦 | 계보 생성·재구성을 역분개되지 않은 비영 재고 거래로 제한 | 로컬 수정 완료; `ProductionRunLotMovementIntegrationTest`로 기록 순서·취소·과거 생산 표시 정리 검증 |
| P1 | 마지막 확인을 취소하면 실행의 안내 리비전 연결과 원래 마감 제한이 사라짐 | 첫 성공한 확인의 리비전을 실행에 영속 보존, 기존 확인 자료 이관 | 로컬 수정 완료; `RunInstructionRevisionIntegrationTest` 4건 및 V37 → V38 업그레이드 1건 통과 |
| P1 | LOT 자동 투입이 자기 작업지시의 예약 재고까지 부족으로 판단함 | 실제 실행의 후보 수량에 자기 열린 할당의 남은 양을 더하고 만료·격리 규칙 유지 | 구현 완료; `RunInputAllocationServiceTest` 10건, `RunInputReservationIntegrationTest` 12건 통과 |
| P1 | 작업지시 제목·목표 수량이 DB 길이·정밀도 범위를 벗어남 | Unicode 기준 제목 100자, 양수 목표량의 소수 4자리·상한·반올림 후 0 검증 | 구현 완료; `WorkOrderQuantityIntegrationTest` 14건, 서비스 단위 테스트 37건 통과 |
| P1 | 명시적 예약·단위 환산 후 BOM 잔여량에 소수 4자리를 넘는 수량이 사용됨 | 품목별 합산 후 HALF_UP 적용, 명시적 요청이 0으로 반올림되면 400, BOM의 0 잔여량은 제외 | 구현 완료; `StockAllocationServiceTest` 8건, `StockAllocationPrecisionIntegrationTest` 8건 통과 |
| P1 | 작업지시 변경·예약 반환·사용이 잠금 대기 전에 상태와 사용량을 읽음 | 작업지시·프로젝트 할당·재고 잠금 순서를 통일하고 커밋된 값으로 재검증 | 구현 완료; `WorkOrderConcurrencyIntegrationTest` 12건과 FEFO 잠금 경합 테스트 통과 |
| P1 | CI의 스냅샷 검증 17건이 실패하고 잘못된 입력이 DB 오류로 반환됨 | 저장 전에 JSON·문자·메타데이터·숫자 범위를 검사하여 필드명 포함 400 반환 | 구현 완료; `RunStateSnapshotValidationIntegrationTest` 30건 통과 |
| P1 | Stock의 datalist 입력을 E2E가 textbox로 탐색하여 시간 초과 | BOM·LOT와 계보 E2E에서 정확한 Location 레이블 사용 | 수정 완료; 두 시나리오 및 나머지 실 API CI 시나리오 총 12건 통과 |
| P1 | 초안 BOM의 같은 자재 여러 줄이 동일 재고를 각각 사용 가능한 것으로 계산함 | 줄별 단위 환산·4자리 반올림 후 품목별 합산하여 생산 가능량 계산 | 수정 완료; `BuildableQuantityIntegrationTest` 3건 통과, 중복 자재 승인 거절 유지 |
| P1 | 생산량 0으로 종료한 실행의 BOM 사용량 차이가 계획 생산량을 기준으로 계산됨 | 진행 중 기본값 0과 종료 시 확정한 0을 상태로 구분 | 수정 완료; `RunCostIntegrationTest` 3건 통과, 진행 중 계획 기준 유지 |
| P1 | 포트 스키마의 설명·추가 메타데이터에서 NUL은 DB 오류, 짝 없는 surrogate는 저장 허용됨 | 스키마 전체 문자열·키를 저장 전에 검사하고 필드명 포함 400 반환 | 수정 완료; 생성·수정·정상 Unicode 통합 테스트 11건 및 관련 검증 32건 통과 |
| P1 | flow-run에서 연결의 조건식·용량·실패 정책을 읽는 코드가 없음 | 담당 세션에서 실행 입력·상태·재시도·멱등성 계약을 정하고 적용 | 인계 대상; 소유 범위에 따라 읽기만 수행, 실행 도메인 미수정 |
| P2 | 오래된 로드맵의 P1·P3이 현행 구현과 불일치 | 구현 완료 항목과 향후 할 일을 재분류 | 실제 서비스·마이그레이션과 문서 대조 |

### 로컬 보완 검증 (2026-09-28 오전 기록)

- `ProductionRunServiceImplTest`, `WorkOrderServiceImplTest`, `OpenRunInputsTest`: **45건 통과, 0건 실패**. 수정 전에는 시뮬레이션 재고 이동·작업지시 상태 변경·생산량 집계·자재 투입 집계·정정 재고 이동, 알 수 없는 실행 유형 허용 및 리비전 없는 실행의 포트 불일치를 회귀 테스트로 재현했다. 음수 계획·실적 거절 회귀 테스트 3건을 추가했다.
- `ProductionSimulationIntegrationTest`: **10건 통과, 0건 실패**. 실제 Postgres/Redis에서 비실제 실행의 재고·예약·거래·LOT 계보·정정 승인·LOT 자동배분·취소와, LOT 소비자 안내의 비실제 유형·0수량·반올림·과거 잘못 저장된 시뮬레이션 거래를 검증했다.
- `ProductionRunPortContractIntegrationTest`: **6건 통과, 0건 실패**. 발행 리비전 유무별 품목·방향 불일치 거절 및 품목 기록·재고·거래 불변, 정상 포트의 공정 추론·방향 정규화·단위 환산을 확인했다.
- `ProductionRunQuantityIntegrationTest`: **4건 통과, 0건 실패**. 음수 시작·종료·계획 및 실적을 거절하고 실행·작업지시·재고·기록을 바꾸지 않는지 확인했다. 0수량 종료는 계속 허용한다.
- `ProductionRunLifecycleConcurrencyIntegrationTest`: **6건 통과, 0건 실패**. 실제 PostgreSQL 실행 행 잠금을 잡고 종료를 커밋한 뒤, 대기하던 기록·취소·중복 종료·체크리스트 확인/해제·FEFO 요청이 종료된 상태를 보고 거절되는지 검증했다.
- `WorkInstructionConcurrencyIntegrationTest`: **6건 통과, 0건 실패**. 발행을 기다린 수정·단계 추가/삭제·삭제·중복 발행은 HTTP 409로 거절하며, 리비전 복사는 커밋된 발행본의 내용으로 새 draft를 만드는지 확인했다. `DatabaseContention`은 고정 지연 대신 PostgreSQL의 실제 잠금 대기를 관찰하는 테스트 전용 도구다.
- `ProductionRunLotMovementIntegrationTest`: **10건 통과, 0건 실패**. 입력/출력 양쪽의 0수량·반올림 후 0수량을 두 기록 순서로 검증하고, 취소 후 재구성·정상 계보·기존의 잘못된 생산 LOT 표시 정리를 확인했다.
- `RunInstructionRevisionIntegrationTest`: **4건 통과, 0건 실패**. 마지막 확인 해제 후 원래 리비전·마감 제한 유지, 새 리비전 단계 거절과 원래 단계 재확인, 조회·실패한 확인은 연결하지 않음, 과거 인스턴스가 만든 미연결 확인의 취소를 검증했다.
- `RunInstructionBindingMigrationIntegrationTest`: **1건 통과, 0건 실패**. Testcontainers의 별도 스키마에서 V37까지 적용하고 확인 자료를 넣은 뒤 V38로 업그레이드했다. 가장 이른 확인의 리비전 이관, 확인 없는 실행의 null 유지, 외래키 제약 및 추가 변경 없는 재실행을 확인했다. 개발·운영 DB는 사용하지 않았다.
- 이전 전체 백엔드 `test jacocoTestCoverageVerification build`: **518건 통과, 실패·오류·스킵 각각 0건**, 118개 테스트 클래스, 커버리지 검증 및 빌드 통과 (2026-09-28 10:35 KST 당시 로컬 작업 트리, 2분 14초). 앞선 전체 검증 484건 이후 회귀 테스트 34건을 추가했다. 중간 검증도 513건·116개 클래스 모두 통과했다. **아래 오후 추가 변경의 전체 검증 결과는 아니다.**
- 2026-09-28 수정 전 재현: 새 회귀 테스트 13건 중 9건 실패로 포트 불일치 허용과 시뮬레이션 소비자 오인을 확인했다. 추가 재현 5건 중 2건 실패로 0수량·반올림 후 재고 이동이 없는 기록의 소비자 오인을 확인했다. 최종 전체 실행에서는 모두 통과했다.
- 이어진 수정 전 재현: 음수 검증 7건 중 7건 실패, 실행 상태 경쟁 6건 중 6건 실패, 안내 발행 경쟁 6건 중 6건 실패, LOT 계보 5건 중 4건 실패를 확인한 뒤 구현을 수정했다. LOT 검증은 기록 순서와 과거 생산 표시 사례를 더해 최종 10건으로 확장했다.
- 다음 재현은 체크리스트 리비전 3건 중 2건 실패였다. 마지막 확인을 해제하면 리비전이 바뀌고 원래 필수 확인의 마감 제한을 우회할 수 있음을 확인한 뒤 영속 연결을 구현했다. 관련 안내·동시 변경·업그레이드 통합 테스트 20건은 모두 통과했다.
- 검증 출력은 `E:/projects/git/.flowmat-test-output/0928-ports/`로 분리했다. 첫 시도는 C 드라이브 출력과 E 드라이브 프로젝트의 경로 차이로 테스트 실행 전에 실패하여, 같은 드라이브의 별도 경로로 수정했다. 기존 서버 출력 폴더·실행 중인 개발 컨테이너·기존 마이그레이션은 변경하지 않았다. 프런트 변경은 없으며 이번 실행에는 프런트 테스트를 포함하지 않았다.
- 기존에 저장된 비실제 실행이 이미 만든 재고 거래는 자동으로 되돌리지 않는다. 거래·예약·LOT 영향을 데이터별로 확인한 뒤 정정해야 한다. 새 기록의 취소는 연결된 과거 거래가 있으면 기존 역분개 경로를 사용한다.
- 기존에 저장된 포트 불일치 기록은 수정하거나 삭제하지 않는다. 이후 새 기록부터 검증하며, 기존 기록의 취소·정정은 해당 실행 상태에 맞는 기존 API로 처리할 수 있다. 실행 리비전이 없는 경우 포트 정의를 동결하는 기능은 이번 변경에 포함하지 않는다.
- 기존 음수 기록은 자동 수정하지 않는다. LOT 계보와 생산 표시는 해당 실행의 취소·정정으로 재구성할 때 정리한다. 실행 행의 동시 변경과 동일 안내의 발행 경쟁은 검증했지만 실사용 부하 시험은 수행하지 않았다.
- 이번 추가 구현은 `domain/production` 서비스·저장소·엔티티와 그 테스트, 신규 V38 마이그레이션에 한정했다. 기존 V1~V37 마이그레이션, `domain/flowrun`, 재고·품목 도메인 코드는 변경하지 않았다. 커밋·푸시·브랜치 작업과 UTF-8 BOM 삽입은 하지 않았다. 이 문서는 현재 `.gitignore`의 `*.md` 규칙으로 무시되며 로컬 파일만 갱신했다.
- 외부 저장소 비교 표는 기준 커밋의 정적 조사로 남겨 둔다. 이 로컬 검증은 외부 50개 저장소의 빌드·실행 검증을 뜻하지 않는다.

### 2026-09-28 오후 구현 완료 및 CI 원인 분석

- 작업지시 수정·승인·취소·완료·실행 시작·설비 배정은 행 잠금 후 현재 상태를 검증한다. 예약 생성·반환·사용과 FEFO는 `실행(있는 경우) → 작업지시 → 프로젝트 할당 advisory lock → 재고` 순서로 직렬화한다. 자기 할당 조회도 잠금 이후에 수행한다. 이전 문서의 "구현·DB 검증 대기"는 해소됐다.
- 실제 실행의 FEFO 수량은 `가용 + 자기 열린 할당의 남은 양`이다. 다른 작업지시의 몫, 이미 소비·반환한 양, 만료·사용 불가능 LOT는 더하지 않는다. 환산 후 필요량을 소수 4자리 HALF_UP으로 맞춘 뒤 후보 조회·분할·기록에 동일하게 사용한다. 반올림 후 0은 400으로 거절한다.
- 작업지시 제목은 trim 이후 Unicode code point 기준 100자까지다. 양수 목표량은 소수 4자리 HALF_UP, 최소 저장량 0.0001, 최대 9999999999.9999를 검사한다. 생산 계획·실적도 저장 정밀도와 상한을 검사하며, 원본 수량을 먼저 정규화한 다음 단위 환산과 재고 처리를 수행한다. `0.000049 kg`이 저장 시 0이 되면서 환산 후 재고만 움직이는 경로를 차단했다. 정정의 0수량 추가 및 반올림 후 변화 없는 생산량 변경도 거절한다.
- 예약 요청은 같은 품목 줄을 합산한 뒤 소수 4자리로 맞춘다. 0으로 반올림되는 명시적 요청은 `lines.quantity`를 포함한 400이다. BOM 잔여량도 같은 정밀도로 맞추며 0이면 예약하지 않는다.
- 앞서 실행하지 못했던 실제 DB 검증이 완료됐다: 작업지시 경합 12건, 예약 FEFO·경합·미세 수량 12건, 예약 정밀도 8건, 작업지시 제목·수량 14건, 생산 수량 37건 모두 통과했다. 전체 백엔드 검증도 15:45에 633건, CI 원인 수정 후 22:26에 663건·125개 클래스 통과했다. `test jacocoTestCoverageVerification build`와 프런트 `typecheck`·`lint`·353건 테스트·`build`를 실행했다. 실행별 테스트 수를 합산하지 않는다.
- [확인한 백엔드 CI 실패](https://github.com/SeolJhin/FlowMat/actions/runs/36414143150)는 661건 중 스냅샷 검증 17건 실패였다. 현재 HEAD에 해당 테스트가 들어 있지만 입력 검증 구현이 없어 잘못된 JSON·문자·숫자·길이가 DB까지 전달되는 것이 원인이다. `RunStateSnapshotServiceImpl`에서 저장 전 검사하고 HTTP 400으로 바꿨다. 30건의 실제 DB 회귀 테스트가 통과한다.
- 스냅샷 JSON은 단일 완전한 값이어야 하며 배열·문자열·숫자·boolean·JSON null도 허용한다. 원문 숫자를 재직렬화하지 않는다. 모든 토큰을 검사하여 중복 키로 덮인 잘못된 값도 거절한다. JSON과 메타데이터의 NUL·짝 없는 surrogate를 거절하고, 숫자의 정수부 131072자리·소수부 16383자리 범위를 검사한다. 이름 100자·유형 30자는 Unicode 문자 수로 검사하며 작성자는 로그인 사용자로 고정한다. [PostgreSQL JSON 규칙](https://www.postgresql.org/docs/16/datatype-json.html), [numeric 범위](https://www.postgresql.org/docs/16/datatype-numeric.html)를 대조했다.
- [확인한 브라우저 CI 실패](https://github.com/SeolJhin/FlowMat/actions/runs/36414143009)는 BOM·LOT의 `Location` textbox 탐색 시간 초과였다. 실제 Stock 입력에는 datalist가 있어 combobox 역할이다. BOM·LOT와 LOT 계보 스펙을 `getByLabel('Location', { exact: true })`로 수정했다. 격리 환경에서 실패를 재현한 뒤 두 시나리오를 통과시켰다.
- CI 실 API 스펙 **12건 모두 통과, 실패 0, 재시도 0, workers 1**: 백엔드 계약·BOM/LOT·LOT 계보·예약·작업 안내 5건(36.9초), 보관위치·검사기준·부적합 3건(16.7초), 창고작업·설비일정·교체시간 3건(16.3초), 설비부하 1건(4.6초). 이 결과는 로컬 검증이며 원격 CI 재실행 결과는 아니다.
- 다음 CI 제약: 위 12단계는 같은 계정으로 로그인 21회를 수행한다. 서버는 계정당 10분 8회·IP당 10분 12회를 제한한다. BOM·LOT 실패 뒤 단계가 건너뛰어져 원격 CI에서 429를 확인한 것은 아니지만, 전체 진행 시 제한 초과가 예상된다. 각 실 API 단계 전에 해당 잡의 전용 Redis에서 `auth:ratelimit:login-*` 카운터만 초기화하는 초안을 `E:/projects/git/.flowmat-test-output/0928-browser/browser-e2e.proposed.yml`에 준비했다. 같은 명령을 소유가 확인된 로컬 전용 Redis에서 실행해 카운터 키 2개가 0개로 줄고 후속 테스트가 통과함을 확인했다. **인계 F의 워크플로 편집 금지 때문에 승인 대기이며 실제 워크플로는 수정하지 않았다.**
- 검증 출력은 `E:/projects/git/.flowmat-test-output/0928-ports/`, 브라우저 결과·실패 trace는 `E:/projects/git/.flowmat-test-output/0928-browser/test-results*`에 분리했다. 전용 포트 18080·5175·5435·6385와 별도 컨테이너를 사용한 뒤 소유 라벨·프로세스 시작 시각·전용 실행 경로를 검사하여 종료했다. Vite의 Volta 자식 프로세스도 실제 listener PID를 기록하여 정리한다. 공유 서비스·기존 V1~V38 마이그레이션·Git 인덱스는 수정하지 않았다.

### 2026-09-28 23:21 생산 계산 검증

- **백엔드 전체 666건·125개 클래스, 실패·오류·스킵 각각 0건.** `test jacocoTestCoverageVerification build` 통과, 실행 시간 3분 23초. 아래 두 계산 수정과 스냅샷 검증을 포함한 작업 트리 전체 결과다. 프런트 최신 실행은 `typecheck`·`lint`·353건/69개 파일 테스트·`build` 모두 통과했고, 실 API 브라우저 12건도 통과했다.
- 초안 BOM 생산 가능량: 같은 자재가 5 kg·2000 g 두 줄이면 한 배치 필요량 7 kg으로 합산해 재고 10 kg/배치 10개 기준 **14개**로 계산한다(이전 20개). 줄별 환산 후 소수 4자리 반올림을 먼저 하므로 0.06 g 두 줄의 필요량은 0.0002 kg이다. 재고 0.0003 kg이면 1개다(이전 3개). 부산물·폐기물은 필요량에 더하지 않고 자재별 첫 등장 순서를 유지한다. **중복 품목의 승인 금지 계약은 유지**한다. 승인 단계에서 중복을 이미 거절하므로 준비 점검·MRP·예약의 중복 자재 경로를 현재 API에서 도달 가능한 결함으로 보고하거나 변경하지 않았다.
- BOM 사용량 차이: 진행 중 실행은 `actualOutputQty` 기본값 0이므로 계획량을 기준으로 계산한다. 종료 상태에서 확정한 0은 실제 생산량으로 계산해 기준 투입량 0, 사용한 재료 전량을 차이로 표시한다. 계획 20개/재료 10 kg에서 실제 생산 0·투입 3 kg·단가 2이면 차이 금액은 6이다. 0으로 나누는 차이 비율·개당 원가는 null이다. 기존 진행 중 계산과 양수 생산량 계산도 함께 검증했다.
- 위 회귀 테스트 수정 전에는 6건 중 3건 실패했다. 0 기준의 첫 수정은 진행 중 기본값까지 실제량으로 간주하여 2건이 실패했고, 종료 상태를 함께 검사한 뒤 전체 666건을 통과시켰다. 실사용 부하·운영 데이터 정리는 별도이며 수행하지 않았다.
- 공유 작업 트리에서 다른 쪽의 스테이징을 확인했다. 검증 결과는 **현재 작업 트리** 기준이고 Git 인덱스와 차이가 있다. 폐기한 실험 테스트 `RepeatedBomMaterialIntegrationTest.java`도 인덱스에는 남아 있으므로 커밋 담당자가 최신 파일 상태를 확인해야 한다. 이 작업에서는 스테이징·커밋·푸시를 수행하지 않았다. 새 마이그레이션 추가·기존 마이그레이션 수정·DB repair 및 UTF-8 BOM 삽입도 없다.

### 2026-09-28 23:26 공정 포트 스키마 보완

- `PortSchema.parse`에서 스키마 전체 문자열·객체 키를 검사한다. 최상위 설명·알 수 없는 추가 메타데이터·배열 안의 객체·속성 설명에도 같은 저장 규칙을 적용한다. NUL과 짝 없는 surrogate는 `schemaJson contains a character PostgreSQL cannot store.`를 포함한 HTTP 400이다. 재귀 호출 대신 대기열로 순회하여 중첩 구조를 처리한다.
- 생성·수정 양쪽에서 거절되며 실패한 수정은 기존 스키마·role을 보존한다. 기존의 객체·속성·필수 키·연결 호환성 규칙을 유지하고, 정상 한글·이모지·추가 메타데이터·PostgreSQL이 허용하는 다른 제어 문자는 저장·조회된다. 기존 데이터나 발행된 리비전은 자동 수정하지 않는다.
- `ProcessPortJsonbValidationIntegrationTest` **11건 통과**: 잘못된 스키마 5종의 생성·수정 10건과 정상 저장·조회·수정 1건. 수정 전 11건 중 10건 실패했으며 NUL 6건은 409, 짝 없는 surrogate 4건은 200이었다. 포트·연결·워크플로 검증을 포함한 관련 **32건·4개 클래스 통과, 실패·오류·스킵 각각 0건**. 추가 변경 후 23:29의 전체 `test jacocoTestCoverageVerification build`도 **677건·126개 클래스, 실패·오류·스킵 각각 0건**, 2분 31초로 통과했다.
- 공유 기능표 `CURRENT_CAPABILITIES.md`는 인계에서 허용한 **공정 IO·연결 행만** 실제 구현과 맞췄다. 다른 기능 행은 수정하지 않았다. `domain/flowrun`에서는 조건식·용량·실패 정책 소비를 확인하지 못했고, 실행 적용은 기존 인계대로 담당 세션에 넘긴다. 런타임 계약 확정과 실사용·부하 검증은 완료 항목으로 표시하지 않는다.

### 2026-09-29 포트·연결 및 스냅샷 입력 보완

- 연결 수정의 `flowRate`, `delayTimeSec`, `lossRate`는 기본 `JsonNode`의 double 변환을 거치지 않고 원래 소수를 읽는다. `1.0000000000000000001`의 초과 자릿수, `1e-400`의 극소 값, DB 범위를 넘는 지수 값을 필드 이름을 포함한 HTTP 400으로 거절한다. 정상 경계 값·지수 표기·소수 끝의 0은 허용한다. 필드 생략은 기존 값 유지, 명시적 null은 유량 제거 및 지연·손실 0의 기존 정책을 보존한다. 요청 필드에만 deserializer를 적용했다. 누락과 null 구분은 [Jackson의 JsonNode 구현](https://github.com/FasterXML/jackson-databind/blob/2.19/src/main/java/com/fasterxml/jackson/databind/deser/std/JsonNodeDeserializer.java#L65-L77)을 대조했다.
- 포트·연결 저장 대상 문자열은 공백 정규화 전에 NUL과 짝 없는 surrogate를 검사한다. 이름·타입·역할·자원 종류·단위·수식·색상·조건식·핸들·레이블 및 방향·Y/N·실패 정책에 적용했다. `WorkflowText`를 스키마 문자 검증에도 사용하여 같은 규칙을 유지한다. HTTP 400에 필드 이름이 있고, 실패한 수정은 수량·역할·레이블·연결 버전을 바꾸지 않는다. 정상 한글·이모지·탭·개행은 저장·조회·수정된다.
- 스냅샷 이름·유형·메모의 원래 문자도 trim 전에 검사한다. 앞뒤 NUL이나 NUL만 있는 값이 사라지는 문제를 막고, 정상 공백 정규화·Unicode 길이 제한·기본 유형·사용자 정의 유형은 유지한다.
- 연결 컨트롤러는 잘못된 JSON 및 파서가 표현하지 못하는 숫자를 HTTP 400 오류 envelope로 반환한다. 식별 가능한 숫자 필드는 이름을 알려 주며, 원문 입력·SQL·스택 정보는 응답에 포함하지 않는다. 다른 도메인의 전역 예외 처리기는 변경하지 않았다.
- 수정 전 재현: 소수 검증 13건 중 9건 실패(200 6건·500 3건), 문자열 검증 29건 중 28건 실패(200 18건·409 10건), 스냅샷 45건 중 앞뒤 NUL 9건 실패(모두 200), 추가 JSON 파싱 검사 65건 중 4건 실패(모두 500). 각 재현 뒤 구현을 수정했다.
- 최종 해당 테스트: `ProcessConnectionDecimalValidationIntegrationTest` **24건**, `ProcessPortConnectionTextValidationIntegrationTest` **37건**, `ProcessPortJsonbValidationIntegrationTest` **11건**, `RunStateSnapshotValidationIntegrationTest` **45건**, 각각 실패·오류 0건. 앞선 677건 이후 총 76건을 추가하여 전체 **753건·128개 클래스**가 통과했다. 전체 `test jacocoTestCoverageVerification build`는 2분 41초, 실패·오류·스킵 각각 0건이다. 실행 결과는 `E:/projects/git/.flowmat-test-output/0928-ports/full-summary-0929-0015.json`에 있다. 00:08의 중간 전체 검증 727건도 통과했다.
- 계약 PC-14~PC-16과 기능표의 공정 IO·연결 행을 갱신했다. 기존 데이터와 발행본의 자동 변경, 마이그레이션·DB repair, 워크플로 편집, 스테이징·커밋·푸시·브랜치 작업 및 BOM 삽입은 수행하지 않았다. 기존 인덱스의 폐기 실험 테스트와 구버전 계산 구현은 커밋 담당자가 최신 작업 트리와 대조해야 한다.

### 2026-09-29 CI 실패 해결 및 생산 입력 보완 (과거 기록)

**한 줄 결론:** 백엔드 실패의 구현을 완료해 전체 808건이 통과했고, 브라우저 로그인 제한 대응안은 전용 환경의 12개 스펙에서 검증했다. 실제 CI 워크플로 적용은 인계 F에 따른 승인 대기다.

- [최신 백엔드 CI](https://github.com/SeolJhin/FlowMat/actions/runs/36445080568)는 `1a6715c`에서 801건 중 20건이 실패했다. 모두 구현 전 회귀 테스트인 `ProductionAuditTextIntegrationTest`에 해당했다. 로컬 검증 실행이 사용량 제한으로 자동 승인 검토를 완료하지 못한 동안 해당 테스트가 커밋에 포함됐고, 이번에 필요한 서버 검증을 마무리했다. 테스트를 삭제하거나 실패를 숨기지 않았다.
- `ProductionText`는 원래 문자열의 NUL·짝 없는 surrogate를 trim 전에 거절하고, 공백 정리 이후 빈 문자열을 null로 정규화한다. 작업지시 제목, 작업안내 제목·본문·단계·값 레이블·URL, 실행 확인 값·메모, 생산 항목 취소 사유, 정정 요청 사유·거절 메모에 적용했다. 네 요청 DTO의 `@NotBlank` 응답에도 해당 필드 이름을 넣었다. 정상 한글·이모지와 저장 가능한 내부 제어 문자는 보존하며 기존 길이 기준과 로그인 제한은 유지한다.
- 필수 확인 값을 공백 정리 후 빈 문자열로 저장해 마감 조건을 통과하던 경로를 차단했다. 거절된 확인은 리비전을 고정하거나 확인 행을 만들지 않는다. 거절된 취소는 재고를 역분개하거나 기록을 취소하지 않고, 거절된 정정 요청·거절 결정은 실적과 승인 상태를 보존한다. 기존 권한·동시성·리비전 고정 테스트도 통과했다.
- 설비 부하는 정수 초 대신 나노초를 포함한 기간 비율로 계산한다. 0.5초 작업의 0.2초 조회 구간은 필요한 10시간 중 4시간, 1.5초 작업의 0.5초 구간은 3.33시간이다. 서로 다른 UTC offset도 검증했다. 목표보다 많이 생산한 진행 중 작업지시의 남은 수량은 0으로 표시한다. 다른 담당 영역의 설비 달력 계산과 기존 마이그레이션은 수정하지 않았다.
- 이어 작업지시 `instruction`·`assignedTo`·`instructionUrl`의 생성·수정도 보완했다. 설명의 NUL은 기존 409 대신 필드명이 든 400으로, 앞뒤 NUL·짝 없는 surrogate가 사라지거나 대체되어 저장되는 경우도 400으로 거절한다. 실패한 수정은 기존 제목·설명·담당자·URL을 보존한다. 정규화 후 빈 선택 필드는 null로 지우며 정상 Unicode URL은 보존한다. 기존 데이터는 자동 정정하지 않는다.
- 수정 전 재현은 설비 부하 4건 실패, 작업안내 입력 23건 중 19건 실패, 원격 감사 입력 21건 중 20건 실패, 추가 메타데이터 7건 모두 실패였다. 메타데이터 6개 잘못된 요청은 409 2건·200 4건이었고, 빈 선택 필드 해제는 400이었다. 최종 네 회귀 클래스는 각각 **4·23·21·7건, 총 55건 모두 통과**했다. `ProductionText`의 JaCoCo LINE은 14/14다.
- 전체 `test jacocoTestCoverageVerification build`는 **808건·132개 클래스, 실패·오류·스킵 각각 0건**, 3분 4초로 통과했다. 결과는 `E:/projects/git/.flowmat-test-output/0928-ports/full-summary-0929-1720.json`이다. 앞선 17:12의 전체 801건·131개 클래스도 통과했다. 컴파일 출력은 계속 전용 디렉터리를 사용했다.
- [최신 브라우저 CI](https://github.com/SeolJhin/FlowMat/actions/runs/36445080851)는 `nonconformity.spec.ts` 로그인에서 실패했다. 재시도 API 응답은 `Too many requests`다. 코드와 호출 횟수를 대조하면 앞선 7회 뒤 NCR API 로그인이 8번째이고 화면 로그인이 9번째여서 계정당 10분 8회 제한을 초과한다. BOM·LOT와 그 뒤 위치·검사 표준 단계는 이 실행에서 이미 통과했다.
- 대응안은 각 실 API 단계 직전에 **해당 CI 잡 전용 Redis**의 `auth:ratelimit:login-*` 키만 초기화하는 것이다. 초안 `E:/projects/git/.flowmat-test-output/0928-browser/browser-e2e.proposed.yml`이 실제 파일의 12개 실행 명령 외에는 바꾸지 않음을 대조했다. 전용 로컬 환경에서도 429 제한을 먼저 확인한 뒤 같은 초기화를 적용해 **12개 스펙, 실패·재시도 성공·스킵 각각 0건**으로 통과했다. 결과는 `E:/projects/git/.flowmat-test-output/0928-browser/sequence-0929/summary.json`이다. 이 브라우저 실행은 17:12 빌드 기준이며 이후 메타데이터 변경은 최종 백엔드 통합 테스트로 검증했다. **인계 F의 워크플로 편집 금지 때문에 실제 파일은 수정하지 않았으며 승인을 요청해 둔 상태다.**
- 검증 전용 18080·5175 서버와 5435·6385 컨테이너는 소유 정보를 확인해 정리했다. 공유 서버·DB·Redis는 종료하거나 재설정하지 않았다. 이전 보고의 폐기 실험 테스트는 최신 커밋에 없고, 현재 인덱스에도 변경은 없다. 이번 수정은 작업 트리에 남겼으며 스테이징·커밋·푸시·브랜치 작업, 기존 마이그레이션 수정·DB repair·UTF-8 BOM 삽입은 수행하지 않았다.

### 2026-09-29 22:57 참조값·빈 값·명령 코드 보완 (과거 기록)

**한 줄 결론:** 18:08의 858건에 회귀 47건을 추가한 전체 **905건**과 빌드·커버리지 게이트가 통과했다. 원격 CI에는 아직 로컬 변경이 반영되지 않았고, 브라우저 워크플로 적용은 인계 F에 따른 승인 대기다.

#### 한 것

- 생산 시작·품목 기록·정정·기록 무효화·LOT 자동 투입의 참조 ID를 공백 정리와 조회 전에 검사한다. 잘못된 ID가 정상 ID로 바뀌어 처리되거나 DB 오류로 반환되는 경로를 필드명이 든 400으로 막았다. 실패 시 작업지시 상태·기록·승인 요청·재고가 보존되고 정상 재시도는 성공한다.
- 작업지시의 `projectId`, `workflowId`, `targetItemId`, `bomId`도 원본 문자 검사 후 처리한다. 선택 참조는 공백 정리 후 내용이 없으면 null로 지운다. 추가 8건 중 수정 전 5건은 잘못된 ID를 200으로 처리했고, 2건은 `bomId` 오류의 필드명이 없었으며, 1건은 빈 선택 참조를 400으로 거절했다.
- 생산 `runType`, `direction`, 정정 `kind`, 작업지시 `priority`의 NUL이 정상 코드로 바뀌지 않도록 정규화 전에 검사한다. 수정 전 추가 10건 모두 잘못된 코드가 200으로 처리됐다. 실패 후 실행·작업지시·재고·정정 요청 불변성과 유효한 대소문자·공백 입력을 검증했다.
- 포트·연결의 참조 ID에도 PC-15 검사를 적용한다. 추가 13건 중 수정 전 NUL 12건은 DB 오류의 409였고, 짝 없는 surrogate 1건은 없는 품목으로 처리된 404였다. 지금은 필드명이 든 400이며, 기존 연결·포트·버전이 보존되고 정상 수정은 성공한다.
- PC-19: 포트·연결의 빈 값 판단을 `trim` 후 수행한다. 생성의 타입·색상·핸들·실패 정책에는 기존 기본값을 적용하고, 수정의 타입·포트 단위는 빈 값이면 유지한다. 선택 텍스트는 null로 지운다. 필수 포트 단위는 원래도 400으로 거절됐으며, 오류 메시지에 `unit`을 추가했다. 내부의 저장 가능한 제어 문자, 권한·호환성 검증, 기존 데이터·발행본은 보존한다.

| 회귀 테스트 | 최종 클래스 전체 | 18:08 이후 추가 |
|---|---|---|
| `ProductionReferenceTextIntegrationTest` | 10건 통과 | 10건 |
| `WorkOrderTextValidationIntegrationTest` | 17건 통과 | 8건 |
| `ProductionCodeLocaleIntegrationTest` | 15건 통과 | 10건 |
| `WorkflowBlankTextIntegrationTest` | 6건 통과 | 6건 |
| `WorkflowReferenceTextIntegrationTest` | 13건 통과 | 13건 |

- 초기 빈 값 테스트의 조건식 자료 2건은 기존 문법에 맞게 단독 `true`를 `quantity >= 0`으로 고친 후 6건 모두의 실제 실패를 다시 확인했다. 수정 후 빈 값·작업지시 관련 23건도 별도 실행에서 통과했다. 두 `hasText` 메서드는 최종 JaCoCo LINE 1/1·BRANCH 4/4다.
- 전체 `test jacocoTestCoverageVerification build`: **905건·141개 클래스, 실패·오류·스킵 각각 0건**, 2분 49초. 결과는 `E:/projects/git/.flowmat-test-output/0928-ports/full-summary-0929-2257.json`이다. 중간 전체 868건·139개 클래스와 892건·140개 클래스도 통과했다. 18:13에 자동 승인 검토의 사용량 제한으로 실행하지 못한 검증은 재시도 가능 시각 이후 새 승인 검토를 거쳐 실행했다. 미실행 명령을 통과로 기록하지 않았다.
- 변경은 `ProductionRunServiceImpl`, `ProductionRunCorrectionServiceImpl`, `RunInputAllocationService`, `WorkOrderServiceImpl`, `ProcessIoServiceImpl`, `ProcessConnectionServiceImpl`, `ProcessIoCreateRequest` 및 표의 테스트에 반영했다. 프런트와 기존 마이그레이션은 이번 추가 범위에서 수정하지 않았다. 브라우저 12건은 17:12 빌드의 이전 결과이며 최신 빌드에서 재실행한 결과가 아니다. 커밋·푸시·스테이징·브랜치 작업·DB repair·UTF-8 BOM 삽입은 하지 않았다.

#### 못 한 것·결정 필요·넘길 것

실제 CI 워크플로 편집은 인계 F의 제한에 따라 승인 대기다. 준비한 잡 전용 Redis 초기화 초안은 앞선 로컬 브라우저 12건에서 검증됐지만 실제 파일에는 적용하지 않았다. 조건·용량·실패 정책의 실행 적용은 flow-run 담당 범위로 남긴다. 이번 보고와 포트 계약·J 인계서만 갱신했으며 새 Markdown 보고서는 만들지 않았다.

### 2026-09-29 18:08 입력·코드 정규화·숫자 저장 보완 (과거 기록)

**한 줄 결론:** 생산과 공정 포트·연결의 추가 오류를 수정하고, 17:20의 808건에 회귀 50건을 더한 전체 **858건**을 통과했다. CI 워크플로 적용 승인과 flow-run 실행 계약은 계속 남아 있다.

- 작업지시 `assignedTo`를 정규화 후 Unicode 문자 50자까지 허용한다. 51자는 생성·수정 모두 필드명이 든 400으로 거절하고 기존 작업지시를 보존한다. 실제 DB는 `varchar(50)`이었으므로 엔티티 매핑도 50자로 맞췄다. 50자 ASCII·이모지 저장과 정상 수정, 51자 실패를 확인했다.
- 생산의 우선순위·실행 유형·투입 방향·정정 유형·상태 검사와 규칙 평가 사실의 코드 정규화를 `Locale.ROOT`로 통일했다. 터키어 환경의 `HIGH`, `SIMULATION`, `INPUT`, `VOID_ITEM`, `ADD_ITEM`, `SET_OUTPUT_QTY`를 검증했다. 실제 실행은 재고를 차감하고 시뮬레이션은 차감하지 않는 기존 의미를 유지한다. 테스트 JVM의 언어 설정은 매번 원래 기본값과 DISPLAY·FORMAT 설정으로 복구한다.
- 생산 단위는 공백 정리 전에 NUL·짝 없는 surrogate를 검사하고, 정규화 후 필수 값과 Unicode 문자 20자 제한을 검사한다. 일반 기록·정정 요청·LOT 자동 투입에 같은 검사를 적용하고 두 저장 엔티티의 단위 매핑을 `varchar(20)`과 맞췄다. 기존 단위 미지정 품목의 사용자 단위는 계속 허용한다. 잘못된 요청은 기록·승인 요청·재고를 바꾸지 않으며, 유효한 20자 ASCII·이모지 단위는 세 경로에서 저장된다.
- 재고 예약·실적 정정의 `lines` 배열에 null 항목이 있으면 500 대신 400으로 거절한다. 정상 행 다음에 null이 있어도 부분 저장·예약·재고 이동이 없고, 뒤이은 정상 요청은 처리된다. 예약의 `lines.itemId`도 쿼리·공백 정리 전에 잘못된 문자를 검사한다. 끝의 NUL이 정상 품목 ID로 바뀌어 예약되던 문제와 내부 NUL의 DB 오류를 수정했다.
- 포트 `ioType`, `resourceType`, `colorScheme`, 연결 `connectionType`과 자원 종류 비교도 언어에 독립적으로 정규화한다. 포트 코드의 대소문자만 바꾼 수정은 기존 연결을 깨지 않는다. 수학적 0인 포트 수량·연결 용량은 일반적인 0으로 저장해 `0e-1000000`의 PostgreSQL 오류를 없앴다. 0이 아닌 극소 값의 기존 정밀도 검사는 유지한다. 계약 PC-17·PC-18에 새 입력 적용과 과거 데이터의 개별 수정 원칙을 기록했다.
- 예약 수량은 반복 행을 먼저 합산한 뒤 반올림한다. 반올림 결과가 확실히 0인 값은 자릿수를 펼치지 않고 0으로 처리하여 `1e-2147483647`의 500을 필드명이 든 400으로 바꿨다. `0.00005` 경계·HALF_UP·중복 행 합산·환산 후 예약 소비가 계속 통과한다.

| 회귀 테스트 클래스 | 최종 결과 |
|---|---|
| `WorkOrderTextValidationIntegrationTest` | 9건 통과 |
| `ProductionCodeLocaleIntegrationTest` | 5건 통과 |
| `ProductionUnitTextIntegrationTest` | 24건 통과 |
| `ProductionNullLineIntegrationTest` | 4건 통과 |
| `ProcessPortCodeLocaleIntegrationTest` | 3건 통과 |
| `ZeroQuantityIntegrationTest` | 6건 통과 |
| `StockAllocationItemIdIntegrationTest` | 4건 통과 |
| `StockAllocationPrecisionIntegrationTest` | 10건 통과 |

- 수정 전 재현: 담당자 길이 2건, 단위 입력 22건, null 항목 4건, 포트 코드 3건, 0의 DB 저장 2건, 예약 ID 4건이 실패했다. 생산 코드 테스트는 누락한 필수 계획 수량을 보완한 후 실행 유형·투입·정정 4건의 실패를 다시 확인했다. 우선순위도 초기 실행에서 실패했다. 극소 예약 수량 2건 중 1건은 500이었다. 새 0 테스트의 승인 호출 도우미 누락으로 발생한 컴파일 오류 1건도 보완했다.
- 전체 `test jacocoTestCoverageVerification build`: **858건·138개 클래스, 실패·오류·스킵 각각 0건**, 2분 42초. 결과 `E:/projects/git/.flowmat-test-output/0928-ports/full-summary-0929-1808.json`. 중간 전체 검증은 17:56의 843건·135개 클래스와 18:01의 852건·137개 클래스도 통과했다. 새 단위 검사 `storedUnit`의 JaCoCo LINE 6/6·BRANCH 4/4, 0 정규화 `normalizeQuantity`의 LINE 1/1·BRANCH 2/2, 안전한 예약 반올림 `scale`의 LINE 3/3·BRANCH 2/2다.
- 프런트와 실제 CI 워크플로는 이번 추가 범위에서 수정하지 않았다. 브라우저 12건은 앞서 17:12 빌드로 실행한 17:15의 결과이며, 이번 변경을 적용한 브라우저 재실행 결과로 표기하지 않는다. 기존 데이터·발행본·마이그레이션을 일괄 변경하지 않았고 커밋·푸시·스테이징·브랜치 작업·DB repair·UTF-8 BOM 삽입도 하지 않았다.

## 방법과 한계

각 후보의 기본 브랜치 트리를 검색하고, FlowMat의 워크플로 정의/리비전, 실행 단계, 재고, BOM, 물류 작업과 맞닿는 코드를 직접 읽었다. metasfresh의 GitHub 재귀 트리 응답은 잘렸으므로 관련 제조 모듈과 파일에 한정해 확인했다. 외부 파일 링크는 검수 시점 커밋에 고정했다. 규모가 큰 저장소는 해당 영역의 대표 구현을 조사했으며 파일 수만 수천~수만 개인 저장소의 **전체 소스 라인을 모두 읽었다고 주장하지 않는다**. 직접 테스트 환경 구성·컴파일·동작 검증·보안 감사·라이선스 법률 검토는 범위에 포함되지 않는다. 결과를 코드 변경으로 옮길 때는 한 기능씩 자체 테스트를 실행해야 한다.
