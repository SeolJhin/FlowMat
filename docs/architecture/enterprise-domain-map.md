# Enterprise Domain Map

## 1. 결론

FlowMat에 ERP, MES, SCM, WMS, BPM을 각각 별도 제품처럼 구현하지 않습니다.

현재 코드에는 이미 다음 핵심 경계가 존재합니다.

| FlowMat 도메인 | 역할 | 기업 시스템 관점 |
| --- | --- | --- |
| `catalog` | Item, Equipment, Unit | ERP Master Data / MES Resource |
| `workflow` | Workflow, Process, Connection, ProcessIo, Revision | BPM / Process Definition |
| `production` | WorkOrder, ProductionRun, RunItem, Snapshot | MES Execution |
| `inventory` | Inventory, Transaction, LOT, Trace | ERP Inventory / WMS / Traceability |
| `bom` | BOM Header/Line, revision, requirement | ERP/MRP / MES planning input |
| `rule` | FlowRule, evaluation | BPM decision / execution policy |
| `project` | project, membership, permission | Tenant / collaboration boundary |

따라서 신규 개발은 위 도메인의 책임을 명확하게 만들고 빠진 연결부를 채우는 방식으로 진행합니다.

---

## 2. ERP에서 가져올 것

ERP 전체를 만들지 않습니다.

FlowMat에 필요한 ERP 성격은 다음입니다.

- 품목 기준정보
- 단위와 단위 변환
- BOM
- 재고
- 작업지시와 생산계획의 최소 모델
- 자산/설비 기준정보
- 프로젝트 단위 권한과 감사

### 현재 위치

- 품목: `domain/catalog`
- 단위: `domain/catalog`
- BOM: `domain/bom`
- 재고: `domain/inventory`
- 작업지시: `domain/production`
- 설비: `domain/catalog`

### 하지 않을 것

초기 단계에서 회계, 급여, 세금, 총계정원장, 전표 등 전사 ERP 전체 범위를 FlowMat에 넣지 않습니다.

---

## 3. MES에서 가져올 것

MES가 현재 FlowMat과 가장 직접적으로 겹칩니다.

### FlowMat에 필요한 MES 개념

- Work Order
- Run / Execution
- 실제 투입과 산출
- 공정별 상태
- 실행 시작/종료 시각
- 설비 사용
- LOT genealogy
- 계획 대비 실적
- 실행 snapshot
- 품질 결과의 연결

### 현재 구현

`production`에 이미 다음이 존재합니다.

- `WorkOrder`
- `ProductionRun`
- `ProductionRunItem`
- `RunStateSnapshot`

`workflow`에는 설계 단계의 Process가 존재합니다.

중요한 원칙은 **Process 자체가 생산실적이 되어서는 안 된다**는 것입니다.
Process는 정의이며, 실제 실행 상태는 ProductionRun 계열에 기록합니다.

---

## 4. BPM / Workflow에서 가져올 것

FlowMat의 범용성은 이 영역에서 나옵니다.

### Definition

- Workflow
- WorkflowRevision
- Process
- ProcessConnection
- ProcessIo
- FlowRule

### Execution

- WorkOrder
- ProductionRun
- ProductionRunItem
- RunStateSnapshot

즉 다음 관계를 유지합니다.

```
WorkflowDefinition
  └─ Process
      ├─ ProcessIo
      └─ ProcessConnection

          ↓ 실행

WorkOrder
  └─ ProductionRun
      ├─ ProductionRunItem
      └─ RunStateSnapshot
```

향후 제조가 아닌 코드 파이프라인, 파일 처리, 업무 흐름을 지원해도
Definition 모델을 재사용할 수 있어야 합니다.

---

## 5. SCM에서 가져올 것

SCM 전체 최적화 제품을 만들 필요는 없습니다.

FlowMat에서 필요한 SCM 성격은 다음입니다.

- 공급/수요 관계
- BOM 기반 요구량
- 부족량 계산
- 재고 임계값
- 공급 리드타임
- 발주 제안
- 자원의 upstream/downstream 추적

### 현재 강점

- BOM requirement
- Inventory
- LOT trace
- WorkOrder / ProductionRun

### 이후 필요한 최소 모델

향후 별도 설계 후 추가:

- `planning_requirement`
- `supply_plan`
- `procurement_suggestion`

이 이름은 확정 스키마가 아니라 책임 경계 예시입니다.
DB migration은 실제 사용자 시나리오와 API 계약이 확정되기 전 만들지 않습니다.

---

## 6. WMS에서 가져올 것

현재 Inventory는 수량 관리가 중심입니다.
WMS에서 가져와야 할 것은 '창고 제품' 전체가 아니라 **위치와 이동의 명확한 모델**입니다.

필요 개념:

- warehouse / location
- stock location
- movement
- receipt
- issue
- transfer
- reservation
- quarantine
- LOT별 재고

현재 `InventoryTransaction`을 우회하는 별도 이동 이력 체계를 만들지 않습니다.
창고 이동이 필요해지면 기존 transaction 계약을 확장하거나 상위 command를 추가합니다.

---

## 7. FlowMat의 핵심 정체성

```
기업 데이터
   │
   ▼
Catalog / Resource
   │
   ▼
Workflow Definition
   │
   ▼
Execution
   │
   ├─ Input consumption
   ├─ Resource usage
   ├─ State transition
   └─ Output creation
   │
   ▼
Inventory / LOT / History
```

FlowMat의 차별점은 ERP 화면을 많이 만드는 것이 아니라,
**사용자가 그린 공정 그래프가 실제 데이터와 실행 모델에 연결되는 것**입니다.

따라서 모든 신규 도메인은 다음 질문을 통과해야 합니다.

1. 이 데이터는 설계(Definition)인가 실행(Instance)인가?
2. Item/Resource와 어떤 관계인가?
3. 어떤 Process와 연결되는가?
4. 실행 시 어떤 상태 변화가 발생하는가?
5. 어떤 이력을 남겨야 하는가?
6. 제조 외 파이프라인에서도 재사용 가능한가?

이 질문에 답할 수 없으면 바로 구현하지 않습니다.
