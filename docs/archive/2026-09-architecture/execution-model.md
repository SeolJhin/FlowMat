# FlowMat Execution Model

> **보관 문서(레거시)** · 현재 기준이 아니다. 구현·리팩토링으로 사실과 달라진 내용이 있을 수 있으니 작업 근거로 쓰지 않는다. 지금 기준은 [docs/README.md](../../README.md), 이 폴더 안내는 [archive/README.md](../README.md).

## 1. 목적

FlowMat의 캔버스는 단순 그림 편집기가 아닙니다.
사용자가 만든 그래프를 실제 실행 가능한 공정 정의로 연결하는 것이 목표입니다.

동시에 UI 편집 상태와 비즈니스 실행 상태를 섞지 않습니다.

---

## 2. 4개 레이어

### Layer A — Editor Document

UI 표현 전용입니다.

현재 관련 모델:

- `WorkflowEditorDocument`
- `WorkflowEditorElement`
- Canvas Annotation
- frontend `lib/flowmat-editor`

책임:

- 좌표
- 크기
- 회전
- 스타일
- 선택 상태
- 커넥터 표현
- 에디터 직렬화

비즈니스 재고를 직접 변경하지 않습니다.

### Layer B — Process Definition

공정의 의미를 정의합니다.

현재 관련 모델:

- `Workflow`
- `WorkflowRevision`
- `Process`
- `ProcessConnection`
- `ProcessIo`
- `FlowRule`

예:

```
[원료 투입]
   |
   v
[혼합]
 input: water 10 L
 input: powder 2 kg
 output: mixture 11.8 kg
   |
   v
[충진]
```

여기서 수량은 '설계상 기대값'이며 실제 재고 트랜잭션이 아닙니다.

### Layer C — Planning

무엇을 언제 얼마만큼 실행할지를 정합니다.

현재 관련 모델:

- `BomHeader`
- `BomLine`
- `WorkOrder`

BOM은 자재 요구량을 정의하고,
WorkOrder는 특정 Workflow/BOM/Target Item을 실제 실행 의도로 바꿉니다.

### Layer D — Execution

실제 발생한 사건을 기록합니다.

현재 관련 모델:

- `FlowRun`, `FlowRunStep`, `FlowRunStepAttempt`, `FlowRunEvent` (범용 실행 기록, V23·V26·V27·V39·V40)
- `ProductionRun` (제조 확장)
- `ProductionRunItem`
- `RunStateSnapshot`
- `InventoryTransaction`
- `LotTrace`

실제 투입과 산출은 이 레이어에서만 재고에 반영합니다.

> 2026-10-02 갱신: FlowRun은 장기적으로 도메인 독립적인 실행 Core로 쓰지만, 비제조 vertical slice가 검증될 때까지 범용 실행 능력은 목표로 취급합니다([결정 인계](../../architecture/decision-handoff.md) E1). 지금 FlowRun은 노드를 스스로 실행하지 않고, 외부가 단계 결과를 보고하면 검증·라우팅·이력을 처리합니다.

---

## 3. Definition과 Instance

### Definition

```
Workflow
 ├─ Revision
 ├─ Process A
 │   ├─ INPUT
 │   └─ OUTPUT
 ├─ Process B
 └─ Connections
```

### Instance

```
WorkOrder
 └─ ProductionRun
     ├─ Run Item: material A -10
     ├─ Run Item: material B -5
     ├─ Snapshot: Process A completed
     └─ Run Item: product C +12
```

Definition은 수정될 수 있지만,
이미 시작된 실행은 시작 당시의 중요한 계획값을 snapshot으로 고정해야 합니다.

BOM은 현재 계약대로 run 시작 시 revision과 base quantity를 고정합니다.

향후 Workflow에도 같은 원칙을 적용합니다.

### 권장 확장

실행 중 Workflow definition의 변경 영향을 차단하려면
ProductionRun에 다음 중 하나가 필요합니다.

- `workflow_revision_id`
- 또는 실행 시점의 canonical definition snapshot

어느 방법을 쓸지는 별도 계약에서 확정합니다.

> 2026-10-02 갱신: 구현됐습니다. 발행 revision은 V20(`workflow_revision`)의 스냅샷이고, 생산 실행은 V21(`production_run.workflow_revision_id`)로, Flow Run도 시작 때 revision을 고정합니다.

---

## 4. Process IO

현재 `ProcessIo`는 다음을 갖습니다.

- processId
- itemId
- ioName
- direction
- ioType
- role
- resourceType
- quantity
- unit
- formula
- schemaJson
- validationRule
- colorScheme
- requiredYn
- allowShortageYn

> 2026-10-02 갱신: `role`·`resourceType`·`schemaJson`·`validationRule`은 V24 포트 계약으로 추가됐습니다([포트·연결 계약](../../domain/process-port-connection-contract.md)). `ProcessIo`는 공정의 **Port Contract**이고, `itemId`는 Catalog Item과 연결될 때만 쓰는 선택적 binding이며, `schemaJson`은 정의 시점 계약입니다([결정 인계](../../architecture/decision-handoff.md) R1–R4).

이 모델은 FlowMat의 핵심 중 하나입니다.

ProcessIo는 "이 공정이 무엇을 기대하는가"를 정의합니다.

예:

```
Process: Pasteurization

INPUT
- raw_milk: 100 L
- electricity: formula

OUTPUT
- pasteurized_milk: 98 L
- waste_water: 2 L
```

### Item과 Resource

모든 IO를 재고 품목으로 강제하지 않습니다.

- MATERIAL: 실제 재고 추적 가능
- PRODUCT: 실제 재고 추적 가능
- ENERGY: 소비량 기록 중심
- WATER: 재고 또는 계측량
- FILE: 논리적 artifact
- DATA: 논리적 artifact
- WASTE: 산출 자원

현재 `Item.resourceCategory`, `resourceType`을 이 방향의 기준정보로 사용할 수 있습니다.

별도 `Resource` 엔티티를 만들기 전에
기존 Item 모델로 표현할 수 없는 요구가 실제로 발생하는지 검증합니다.

> 2026-10-02 갱신: 포트로 흐르는 대상의 의미는 포트의 `ProcessIo.resourceType`이 정합니다(allow-list, 목록 밖 값은 경고 — 아직 미구현). FILE·DATA 같은 논리 자원은 Item으로 만들지 않고 `itemId` 없이 `schemaJson`으로 계약합니다. Resource 슈퍼테이블은 만들지 않습니다([결정 인계](../../architecture/decision-handoff.md) R2·R3·R5).

---

## 5. Resource Flow

### 설계 흐름

```
Process A OUTPUT
      |
      | ProcessConnection
      v
Process B INPUT
```

### 실행 흐름

```
ProductionRunItem
      |
      v
InventoryTransaction / usage record
      |
      v
LOT genealogy / history
```

Connection 자체가 재고 이동을 의미하지 않습니다.
Connection은 의미적/논리적 경로이고,
실제 수량 변화는 실행 이벤트로 발생해야 합니다.

---

## 6. 상태

공정 시스템에서 가장 피해야 하는 것은 상태를 문자열 여러 곳에서 임의로 바꾸는 것입니다.

### 설계 상태

- WorkflowStatus
- ProcessStatus

### 계획 상태

- WorkOrderStatus
- BomStatus
- ApprovalStatus

### 실행 상태

- RunStatus
- InventoryStatus
- LotStatus

서로 다른 상태 머신을 하나의 범용 `status` enum으로 합치지 않습니다.

향후 상태 전이는 service/application layer에서만 수행하고
controller나 frontend가 다음 상태를 임의 계산하지 않는 방향을 유지합니다.

---

## 7. 시뮬레이션과 실제 실행

FlowMat에는 시뮬레이션과 실제 생산이 모두 존재할 수 있습니다.

두 경우 모두 동일 Definition을 사용할 수 있지만 side effect가 다릅니다.

### Simulation

- 실제 Inventory 변경 없음
- 예상 시간 계산
- 예상 소비량
- 병목/부족 확인
- 결과 snapshot 저장 가능

### Execution

- 실제 InventoryTransaction 발생
- LOT trace 발생
- 감사 이력 필수
- 멱등성 필수

따라서 향후 실행 API에는 실행 모드가 명확해야 합니다.
기존 `RunType`을 우선 검토하고, 중복 모델을 만들지 않습니다.

---

## 8. 구현 전 체크리스트

신규 기능은 다음을 먼저 정의합니다.

- [ ] Definition인가 Execution인가
- [ ] project boundary가 있는가
- [ ] immutable snapshot이 필요한가
- [ ] inventory side effect가 있는가
- [ ] idempotency가 필요한가
- [ ] LOT genealogy에 영향을 주는가
- [ ] ProcessIo와 연결되는가
- [ ] simulation에서도 사용할 수 있는가
- [ ] audit/history가 필요한가
- [ ] 기존 domain service로 처리할 수 없는 이유가 있는가
