# Flow Run (범용 실행 기록)

상태: **구현(V23 2026-09-24 실행, V26 단계·시도·이벤트, V27 단계 취소, V39 그래프 실행, V40 출처 단계).** 2026-10-02에 코드에서 다시 정리한 현행 문서다. 설계 검토 근거는 [보고서 I](../archive/2026-09-handoff/reports/I-reference-architecture.md)(보관).

FlowRun을 장기적으로 도메인 독립적인 실행 Core로 쓴다. 지금 구조는 이를 지원할 기반을 갖췄지만, 비제조 흐름으로 검증될 때까지 범용 실행 능력은 목표로 취급한다([ADR-003](../architecture/adr/ADR-003-resource-port-contract.md) 결정 8·9).

## 모델

| 테이블 | 담는 것 |
|---|---|
| `flow_run` | 프로젝트, 워크플로, 발행 revision(필수), 실행 종류(`actual`·`simulation`·`test`·`dry_run`), 실행 방식(`manual`·`graph`), 상태, 입력·출력 payload, 시작·끝 시각, 요청자, 연결된 생산 실행(`production_run_id`, 있으면) |
| `flow_run_step` | 노드(공정) id, 순번, 상태, 예정 시각, 입력·출력 snapshot, 출처 연결·출처 단계(V40) |
| `flow_run_step_attempt` | 단계의 시도 번호와 상태 |
| `flow_run_event` | 이벤트 종류, payload, 행위자, 시각. 지우지 않는 원장 |

## 상태

| 대상 | 흐름 |
|---|---|
| 실행 | running → finished / failed / cancelled |
| 단계 | planned → running → completed / failed / skipped / cancelled |
| 시도 | running → completed / failed |

실행이 failed·cancelled로 끝나면 진행 중이던 단계도 같이 닫힌다. 실패로 끝나면 running 단계는 failed, 나머지는 cancelled가 된다.

## 규칙

| # | 규칙 | 위반 응답 |
|---|---|---|
| F1 | 시작에는 발행(published) revision이 필요하다([워크플로 발행 revision](workflow-revision.md) V5·V7) | 404 / 409 |
| F2 | 실행 종류는 넷 중 하나다. 종류에 따른 재고 영향은 생산 실행 쪽이 정한다([실행 모델](../architecture/execution-model.md) §7) | 400 `Unknown flow run type.` |
| F3 | 그래프 실행은 입력이 JSON 객체여야 하고, 진입 연결이 없는 노드마다 planned 단계를 만든다. 순환·잘못된 참조가 있는 revision은 거절한다 | 400 / 409 |
| F4 | 단계 결과는 외부가 보고한다. 단계를 스스로 실행하지 않는다 | |
| F5 | planned 단계만 예정 시각을 바꿀 수 있고, 예정 시각 전에는 시작하지 않는다 | 409 |
| F6 | 그래프 단계 완료의 라우팅(조건·용량·포트 검증식·스키마·실패 정책)은 [그래프 실행 계약](process-port-connection-contract.md#2026-09-30-그래프-실행-계약-v39) GR-01~GR-12를 따른다 | |
| F7 | 실행 마감은 모든 단계가 completed나 skipped일 때만 된다 | 409 `Every recorded step must complete or be skipped before the flow run can finish.` |
| F8 | 생산 실행과 연결된 Flow Run은 이 API로 마감·취소·실패 처리할 수 없다. 생산 실행 API가 `FlowRunCommand`로 다룬다([실행 모델](../architecture/execution-model.md) §6) | 409 `Linked production runs must be managed through the production run API.` |
| F9 | 끝난 실행은 다시 바꾸지 않는다 | 409 `Flow run has already ended.` |

## API

| 요청 | 설명 |
|---|---|
| `POST /flow-runs` | 수동 실행 시작 |
| `POST /flow-runs/graph` | 그래프 실행 시작(F3) |
| `GET /flow-runs?workflowId=`, `GET /flow-runs/{flowRunId}` | 조회 |
| `POST /flow-runs/{flowRunId}/finish`·`/cancel`·`/fail` | 마감(F7)·취소(사유 필수)·실패 |
| `POST /flow-runs/{flowRunId}/steps`, `GET …/steps` | 수동 단계 추가, 목록 |
| `PUT …/steps/{stepId}/schedule` | 예정 시각(F5) |
| `POST …/steps/{stepId}/start`·`/complete`·`/fail`·`/retry` | 단계 결과 보고 |
| `POST …/steps/{stepId}/preview` | 완료 전 연결별 라우팅 미리보기(GR-10) |
| `GET …/steps/{stepId}/lineage`, `GET …/steps/{stepId}/attempts` | 출처 단계 체인, 시도 목록 |
| `GET /flow-runs/{flowRunId}/events` | 이벤트 원장 |

## 이벤트

- 실행: `run_started`, `run_finished`, `run_cancelled`, `run_failed`
- 단계: `step_created`, `step_scheduled`, `step_started`, `step_completed`, `step_failed`, `step_skipped`, `step_retried`, `step_cancelled`
- 연결: `connection_filtered`(조건이 거짓이라 지나가지 않은 연결)

## 화면

Runs 화면의 Flow Runs 탭(`FlowRunsPanel`)

## 검증

- 통합 테스트: `FlowRunIntegrationTest`(생산 실행 연결 포함), `FlowRunStepIntegrationTest`, `FlowRunGraphIntegrationTest`, `FlowRunExecutionPolicyIntegrationTest`(2cp)
- 단위 테스트: `FlowRunServiceTest`, `FlowRunGraphTest`, `FlowRunGraphPolicyTest`(2cp), `LinkedFlowRunServiceTest`
- 비제조 흐름: `DataFlowRunIntegrationTest`(2026-10-03). 새 프로젝트에서 Item 없는 포트로 File → Transform → Data를 `actual`로 끝까지 돌리고, 제조 행(품목·재고·LOT·BOM·작업지시·생산 실행)이 생기지 않음을 확인한다

## 아직 없는 것

시간 제한·재시도 횟수와 간격·동시 실행 제한은 [ADR-004](../architecture/adr/ADR-004-flow-run-execution-policy.md)(Accepted 2026-10-05)대로 [노드 실행 정책](flow-run-execution-policy.md)에 구현했다(2026-10-10, §2 2cp, V67, 로컬 검증만). 다음은 아직 없다.

- 노드 자동 실행기(서버는 단계를 시작하지 않는다)
- 정책 편집 화면, 수동 실행·생산 연결 실행의 정책, 제한 초과 대기열
- 여러 진입 연결의 합류
- 수량 분할
