# I1. 실행 단계 모델 검토

> **보관 문서(레거시)** · 현재 기준이 아니다. 구현·리팩토링으로 사실과 달라진 내용이 있을 수 있으니 작업 근거로 쓰지 않는다. 지금 기준은 [docs/README.md](../../../README.md), 이 폴더 안내는 [archive/README.md](../../README.md).

**결론:** `flow_run` 아래의 수동 `flow_run_step`, 시도별 `flow_run_step_attempt`, 이벤트 원장을 구현했다. 그래프 자동 실행과 재시도 정책의 범위는 D7 결정 후 구현한다.

## 한 것

- FlowMat의 정의(`workflow_revision` 스냅샷 안의 process, process IO, connection), 공통 실행(`flow_run`), 제조 실적(`production_run_item`)을 대조했다.
- Flowable은 실행 중 상태와 영구 이력을 별도로 관리한다. 근거: [`HistoryService.java`](https://github.com/flowable/flowable-engine/blob/main/modules/flowable-engine/src/main/java/org/flowable/engine/HistoryService.java), [`DefaultHistoryManager.java`](https://github.com/flowable/flowable-engine/blob/main/modules/flowable-engine/src/main/java/org/flowable/engine/impl/history/DefaultHistoryManager.java).
- Conductor는 워크플로 정의의 태스크 설정과 실행 시도 상태를 구분하고, 실패 시 설정에 따라 새 시도를 만든다. 근거: [Task Definition](https://conductor-oss.github.io/conductor/documentation/configuration/taskdef.html), [Task Lifecycle](https://conductor-oss.github.io/conductor/devguide/architecture/tasklifecycle.html), [Task API](https://conductor-oss.github.io/conductor/documentation/api/task.html).
- 단계·시도·이벤트 테이블을 신규 V26 마이그레이션으로 추가하고 수동 단계 API와 Runs 화면의 Flow Runs 탭을 구현했다. Flow Run 단계·기존 실행 통합 테스트와 서비스 단위 테스트가 통과했다.

## FlowMat 초안

| 단위 | 식별·연결 | 상태와 기록 |
|---|---|---|
| `flow_run` | 실행 ID, workflow ID, 고정 revision ID | 전체 상태·입출력·시작/종료 시각 |
| `flow_run_step` | 단계 ID, 실행 ID, revision 안의 process ID | planned/ready/running/completed/failed/skipped, 순서·시간·입출력 스냅샷 |
| `flow_run_step_attempt` | 시도 ID, 단계 ID, 시도 번호 | 시작·종료·오류·재시도 예정 시각; 재시도 때 기존 시도를 수정하지 않음 |
| `flow_run_event` | 이벤트 ID, 실행 ID, 선택적 단계 ID | 상태 변화의 append-only 기록 |
| `production_run_item` | 기존 실적 ID, 생산 실행 ID | 물량·재고·LOT 실적; 단계 연결은 선택적 FK로 확장 가능 |

현재 수동 단계 상태 전이는 `planned → running → completed`이며, `running → failed → running` 재시도 때 새 attempt를 만든다. 모든 기록된 단계가 완료되기 전에는 범용 Run을 종료할 수 없다. `ready`·`skipped`와 자동 정책은 아직 설계 범위다.

## 못 한 것

- 병렬 fork/join, 루프, 조건식 평가, timeout, 자동 재시도, 보상 동작의 정책은 확정하지 않았다.
- 자동 실행 코드는 작성하지 않았다.

## 결정 필요 (D7)

1. 다음 범위에서 그래프 연결을 따라 자동으로 다음 단계를 여는 것까지 포함할지.
2. `production_run_item`을 단일 단계에 연결할지, 단계와 실적의 다대다 관계를 허용할지. 현재 한 실적에는 `processId`가 하나 있다.
3. 병렬·루프·실패 정책을 첫 버전에 포함할지. 포함한다면 상태 전이와 멱등성 계약을 먼저 정해야 한다.

## 넘길 것

D7 범위를 정한 뒤 자동 실행의 상태 전이·멱등성 테스트를 작성한다. 기존 적용 마이그레이션은 수정하지 않는다.
