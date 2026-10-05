# FlowMat GitHub 전수 비교 조사 및 기능 도입안

> **참고 문서(동결)** · 갱신하지 않는다. 쓴 날 기준의 근거·조사이며, 현행 문서와 다르면 현행 문서가 우선한다. 지금 기준은 [docs/README.md](../../README.md), 이 폴더 안내는 [reference/README.md](../README.md).

> 2026-10-02: `docs/` 맨 위에서 `docs/reference/benchmarks/`으로 옮겼다. 이 문서의 FM-* 항목별 구현 현황은 [CURRENT_CAPABILITIES](../../status/CURRENT_CAPABILITIES.md)의 "원래 백로그 대비 현황"이 기준이고, 아키텍처 방향은 [결정 인계](../../architecture/decision-handoff.md)를 따른다.

> 조사 기준일: 2026-09-24  
> 기준 프로젝트: `SeolJhin/FlowMat` (`main`)  
> 조사 범위: FlowMat 현재 코드/문서 + 후보 GitHub 50개 저장소(MES 10, BPM/Workflow 10, SCM 10, ERP 10, WMS 10)  
> 목적: 다른 프로젝트를 복제하는 것이 아니라 **FlowMat에 필요한 도메인 모델, 실행 모델, 상태 전이, 자원 흐름, 편집기 구조, 계획/최적화 패턴을 선별**한다.

---

# 0. 결론부터

FlowMat이 지금부터 가장 먼저 가져와야 할 것은 ERP 화면이나 MES 메뉴가 아니다.

핵심은 아래 8개다.

1. **Definition / Revision / Instance 분리** — Flowable + Conductor
2. **Node 실행 정책(retry, timeout, failure policy, concurrency)** — Conductor
3. **Node IO를 강한 Port Contract로 승격** — frePPLe + Flowable/Conductor의 schema 개념
4. **Flow Connection을 단순 선이 아닌 실행 계약으로 승격** — Flowable + frePPLe
5. **Operation type: routing / alternate / split / fixed-time / time-per** — frePPLe
6. **Resource capacity / calendar / efficiency / setup-changeover** — frePPLe
7. **Process Template Snapshot + Batch/Step 실행 이력** — OpenMES
8. **Editor semantic model과 graphic model의 분리** — bpmn-js/diagram-js (단, 현재 FlowMat editor를 교체하지 말 것)

그리고 이미 잘 만든 것은 다시 만들면 안 된다.

- 재고 불변식 + 원자적 차감
- 멱등 inventory transaction
- reversal 방식
- BOM 승인/revision/immutable snapshot
- WorkOrder ↔ BOM
- LOT 격리/종료/계보
- React Flow 기반 공정 노드/연결
- 별도 `flowmat-editor` 그래픽 엔진
- STOMP 실시간 동기화 기반
- Java 21 + Spring Boot + PostgreSQL + Redis + Flyway + Testcontainers
- Vitest/Playwright + JaCoCo

즉 다음 단계는 **MES CRUD 확장**보다 **범용 Flow Runtime + Planning semantics**가 맞다.

---

# 1. 조사 방법과 판정 기준

각 저장소는 다음 순서로 확인했다.

1. 저장소 실재 여부와 현재 기본 브랜치
2. README 및 프로젝트 목적
3. 루트 디렉터리/모듈 구조
4. 기술 스택
5. FlowMat과 직접 대응되는 도메인
6. 가능할 경우 실제 모델/서비스/스키마 파일 검색
7. FlowMat에 가져올 개념
8. 가져오지 말아야 할 부분
9. 적용 시점

판정은 다음 네 단계다.

| 등급 | 의미 |
|---|---|
| **A** | FlowMat 핵심 설계에 적극 반영 |
| **B** | 특정 모듈/패턴을 선택 반영 |
| **C** | 설계 참고용. 당장 구현하지 않음 |
| **D** | 현재 FlowMat에는 도입 가치 낮음 / 중복 / 과도함 |

**주의:** “가져온다”는 기본적으로 **아이디어와 설계 패턴을 재구현**한다는 뜻이다. AGPL/GPL/FSL 등 저장소의 코드를 직접 복사할 경우 라이선스 검토가 별도로 필요하다.

---

# 2. FlowMat 현재 상태 — 비교의 기준점

## 2.1 현재 정식 애플리케이션 구조

현재 정식 애플리케이션은 다음 두 디렉터리다.

```text
flowmat_backend
flowmat_frontend
```

`legacy`와 루트 Gradle 구성은 역사적 호환/스켈레톤 성격이며 현재 검증 경로가 아니다.

### Backend

- Java 21
- Spring Boot 3.5.x
- Spring Data JPA
- PostgreSQL
- Redis
- Flyway
- Spring Security
- OAuth2
- JWT
- WebSocket/STOMP
- OpenAPI/springdoc
- Actuator/Prometheus
- Testcontainers
- JaCoCo
- OWASP dependency-check

### Frontend

- React 19
- TypeScript 6
- Vite 8
- `@xyflow/react`
- Dagre
- STOMP
- TanStack Query
- Zustand
- Zod
- Vitest
- Playwright

## 2.2 이미 구현된 중요한 도메인

### Inventory

이미 단순 CRUD를 넘어섰다.

```text
quantity >= 0
reserved_quantity >= 0
available = quantity - reserved_quantity >= 0
reserved_quantity <= quantity
```

그리고 `receipt / issue / production_input / production_output / reserve / release / adjustment / reversal / quarantine / unquarantine`를 명령으로 관리하며 멱등성 키도 가진다.

따라서 Odoo/OpenBoxes/WMS의 단순 stock CRUD를 새로 모방할 필요는 없다.

### BOM

현재:

```text
draft
  -> pending_approval
  -> approved
  -> retired
```

- revision
- 승인본 immutable
- 단위 환산
- 생산 시작 시 snapshot
- WorkOrder 연결
- 기존 실행이 새 BOM revision에 영향받지 않음

까지 이미 들어가 있다.

### LOT

현재:

- available / reserved / quarantined / consumed / closed
- item + location + lot 기준 재고
- 전체 LOT quarantine
- 생산 input/output 기반 genealogy
- forward/backward trace
- closed LOT 불변

이 구현도 상당히 진행되어 있다.

### Editor

현재 편집기는 이미 좋은 방향이다.

```text
Process Node / Domain Edge
        = React Flow

Graphic Shape / Text / Line / Freehand
        = flowmat-editor + SVG layer
```

이 분리는 유지한다.

## 2.3 현재 구조에서 가장 큰 빈 공간

FlowMat의 다음 빈 공간은 다음이다.

```text
설계(Definition)
    ↓
발행된 Revision
    ↓
실행 Instance
    ↓
Node Step Instance
    ↓
Attempt / Retry / Event / Snapshot
```

즉 **실행 엔진의 명시적 런타임 모델**이다.

그리고 두 번째 빈 공간은:

```text
Resource Capacity
Calendar
Setup / Changeover
Routing
Alternate
Split
Constraint
Planning
```

이다.

---

# 3. 가장 중요한 구조 변경안

## 3.1 Workflow Definition과 Run을 더 명확히 분리한다

FlowMat의 현재 `workflow`는 정의 객체에 가깝고 `production_run`은 실행 객체에 가깝다. 방향은 맞다.

다만 Definition의 revision과 실행 시점 snapshot을 더 명시적으로 만드는 것을 권장한다.

### 제안

```text
workflow
workflow_revision

process / flow_node_definition
process_io / flow_port_definition
process_connection / flow_connection_definition

flow_run
flow_run_step
flow_run_step_attempt
flow_run_event
```

### 핵심 원칙

- 편집 중인 draft와 실행 중인 버전을 분리
- 실행 시작 후 Definition 변경이 Run에 전파되지 않음
- 모든 Run은 정확한 revision을 가리킴
- Node 단위 상태를 따로 추적
- retry는 같은 step의 새 attempt
- 실행 이력은 append-only event로 남김

이것은 Flowable, Conductor, Temporal에서 공통적으로 강하게 나타나는 패턴이다.

---

# 4. MES 저장소 10개

## MES-01. Mes-Open/OpenMes

- GitHub: https://github.com/Mes-Open/OpenMes
- 판정: **A**
- 역할: 실제 중소 제조업용 MES
- 기술: Laravel/Livewire + PostgreSQL, 모바일/데스크톱/OPC-UA gateway 포함
- 특징: ISA-95 지향, Work Order, Batch, Process Template, 품질, downtime, machine/ERP integration

### 실제 코드에서 확인한 핵심 경로

```text
backend/app/Models/ProcessTemplate.php
backend/app/Models/TemplateStep.php
backend/app/Models/TemplateStepOutput.php
backend/app/Models/BomItem.php
backend/app/Models/ProductRevision.php
backend/app/Models/QualityCheckTemplate.php
backend/app/Services/ProcessTemplate/SnapshotService.php

backend/app/Models/Batch.php
backend/app/Models/BatchStep.php
backend/app/Models/SerialUnit.php
backend/app/Models/MaterialAllocation.php
backend/app/Models/ProcessConfirmation.php
```

### 가져올 것

1. **Process Template Snapshot**
   - 템플릿 수정과 이미 시작된 실행을 분리하는 패턴
   - FlowMat `workflow_revision` / `run snapshot` 설계에 직접 반영
2. **Batch → BatchStep 구조**
   - FlowMat `flow_run → flow_run_step`의 제조 도메인 선례
3. **Step Output의 별도 모델링**
   - Node 실행 결과를 단순 JSON 한 덩어리로 두지 말고 결과/자원 이벤트로 분리
4. **품질 검사 Template과 실제 Quality Check 분리**
5. **Material Allocation**
   - 예약/할당과 실제 소비를 분리
6. 생산 스케줄러의 Backlog + line assignment 개념
7. downtime reason / stop event

### 가져오지 말 것

- Laravel/Livewire 구현 자체
- MES 화면 구조 전체
- 제조 도메인을 FlowMat core에 고정하는 방식

### FlowMat 적용

```text
ProcessTemplate Snapshot
        ↓
workflow_revision

Batch
        ↓
flow_run

BatchStep
        ↓
flow_run_step

MaterialAllocation
        ↓
resource_reservation / inventory reservation
```

---

## MES-02. sindohmes/mes4u

- GitHub: https://github.com/sindohmes/mes4u
- 판정: **B**
- 기술: Spring Boot + Java 8 + PostgreSQL + Vue 2
- 장점: 실제 제조 현장 MES 경험에서 나온 공개 프로젝트
- 약점: 기술 버전이 오래됨

### 확인한 코드

```text
src/main/java/com/sindoh/sdmes/service/OperationService.java
src/main/java/com/sindoh/sdmes/controller/OperationApiController.java
frontend/src/views/operation/sol.vue
frontend/src/views/operation/eol.vue
frontend/src/views/operation/packing.vue
frontend/src/views/operation/partscan.vue
frontend/src/views/operation/inspection.vue
frontend/src/views/operation/operationrepair.vue
```

### 가져올 것

- Operation master와 현장 Operation execution의 분리
- SOL/EOL, packing, part scan, inspection, repair처럼 **공정 종류에 따른 작업 UI**
- 제조 현장에서 한 공정에 필요한 최소 데이터가 무엇인지
- Process Node별 operator action 설계 참고

### 가져오지 말 것

- Java 8 기반 프로젝트 구조
- Vue 2 UI 구조
- 제조 Operation 이름을 FlowMat core enum으로 고정

### 사용법

FlowMat의 `domain_template=manufacturing`에서 제공하는 **샘플 Node Type**의 UX 벤치마크로 사용한다.

---

## MES-03. SMEWebify/WebErpMesv2

- GitHub: https://github.com/SMEWebify/WebErpMesv2
- 판정: **B**
- 성격: 판금/정밀기계 특화 ERP + MES

### 강점

- BOM
- machining routing
- machine/work-center planning
- Work Order
- actual production time
- QC/non-conformity
- 원자재 치수 관리
- material certificate/traceability
- 예상원가 vs 실제원가

### 가져올 것

1. `Routing`을 BOM과 별도 개념으로 취급
2. 작업센터/설비별 load
3. 예상 시간/비용 vs 실제 시간/비용 비교
4. Non-conformity 기록
5. 품목 속성에 치수/규격/인증서처럼 확장 가능한 property를 허용하는 방식

### FlowMat에서의 위치

```text
flow_node.operation_type
asset/work_center
flow_run_step planned/actual time
issue_log / validation_check
resource_attribute
```

### 보류

견적/CRM/매출 전체는 FlowMat 핵심과 거리가 있다.

---

## MES-04. kuaigeyun/kuaigeyun-mes

- GitHub: https://github.com/kuaigeyun/kuaigeyun-mes
- 판정: **A**
- 기술: React + TypeScript + FastAPI + Pydantic + PostgreSQL
- 성격: 현대적인 플러그인형 제조 플랫폼

### 실제 코드에서 확인한 핵심 경로

```text
riveredge-backend/src/apps/kuaizhizao/models/work_order.py
riveredge-backend/src/apps/kuaizhizao/models/work_order_operation.py
riveredge-backend/src/apps/kuaizhizao/services/work_order_tree_service.py
riveredge-backend/src/apps/kuaizhizao/services/work_order_readiness_service.py
riveredge-backend/src/apps/kuaizhizao/services/work_order_operation_steps.py
riveredge-backend/src/apps/kuaizhizao/services/work_order_sync_service.py

riveredge-backend/src/apps/kuaizhizao/schemas/bom.py
riveredge-backend/src/apps/kuaizhizao/utils/bom_helper.py
riveredge-backend/src/apps/master_data/models/bom_change.py
riveredge-backend/src/apps/master_data/services/bom_change_service.py
```

### 가져올 것

1. **Demand를 통합 진입점으로 보는 관점**
   - 주문/예측 → 필요량 → 생산/구매
2. **WorkOrder Readiness**
   - 작업지시가 실행 가능한지 자재/공정/BOM/조건을 사전 검증
3. WorkOrder Operation Step
4. BOM change/revision 협업 흐름
5. plugin/application enable 구조
6. custom field / configuration 중심 확장
7. 품질 이상 → 조치 → 재작업으로 이어지는 closed-loop
8. Lot/Serial 전체 추적

### FlowMat 적용 우선순위

특히 `Execution Readiness Check`는 바로 가져올 가치가 크다.

```text
POST /flow-runs/preflight

- revision published?
- required port connected?
- required resource available?
- BOM approved?
- LOT requirement satisfied?
- unit convertible?
- asset/calendar available?
- cyclic dependency?
```

---

## MES-05. iplus-framework/iPlusMES

- GitHub: https://github.com/iplus-framework/iPlusMES
- 판정: **C**
- 성격: 대형 .NET MES + DCS/SCADA 성격

### 참고할 것

- Master Data / Manufacturing / Material / Logistics / Quality / Maintenance의 경계
- MES와 현장 제어 계층을 분리하는 구조
- 설비/PLC/DCS 연결
- process-industry 대응 방식

### 지금 가져오지 않을 것

- 거대한 프레임워크 구조
- SCADA 수준 제어 기능
- .NET/WPF/Avalonia 구조

FlowMat이 실제 설비 연결 단계에 들어갈 때 다시 깊게 보는 저장소다.

---

## MES-06. VidetteMakes/MESS

- GitHub: https://github.com/VidetteMakes/MESS
- 판정: **B**
- 기술: .NET + Blazor + PostgreSQL

### 가져올 것

- Work Instruction 작성/표시
- 공정 진행률
- Quality Data 기록
- Part/Subassembly 추적
- ERP/BI 연계

### FlowMat 제안

Process Node에 단순 description이 아니라 향후:

```text
node_instruction
- instruction_version
- rich_text / markdown
- attachment
- required_confirmation
- checklist
```

을 둘 수 있다.

---

## MES-07. factorysemantics/factorysemantics-mes

- GitHub: https://github.com/factorysemantics/factorysemantics-mes
- 판정: **A- (설계 참고), C (운영 신뢰도 참고)**
- 상태: 2026-09 기준 pre-alpha, simulated plant 중심
- 성격: agent-native modular MES

### 매우 좋은 아이디어

- API/agent tool first, UI second
- append-only audit
- 데이터 provenance
- permissioned write
- ERP connector를 모듈로 분리
- Shadow Mode
- plant pack
- OPC-UA / MQTT / file / read-only SQL ingestion
- genealogy
- finite-capacity scheduling

### FlowMat에 가져올 것

1. **AI 권한 단계**

```text
READ
SUGGEST
REQUEST_APPROVAL
EXECUTE
```

AI가 DB를 바로 쓰는 구조를 금지한다.

2. **Shadow/Dry-run**
   - 실제 생산을 변경하지 않고 FlowMat 계산 결과만 비교
3. **Connector module**
4. 모든 계산 결과에 `source / generated_at / rule_version` 기록

### 주의

실제 공장 운영 검증의 근거로 사용하면 안 된다. 설계 아이디어 저장소로 본다.

---

## MES-08. xianshi3/virtual-path-mes

- GitHub: https://github.com/xianshi3/virtual-path-mes
- 판정: **B/C**
- 기술: Spring Cloud + Vue + Kafka + MQTT + InfluxDB + FastAPI + AI

### 가져올 것

- `device-gateway`를 별도 경계로 두는 것
- MQTT ingestion
- time-series telemetry
- process/workorder/quality/device service 분리 관점
- SPC Nelson rule
- AI Agent의 function/tool call 구조

### 지금 보류

- 3D Digital Twin
- Kafka 중심 마이크로서비스화
- 별도 InfluxDB
- 대규모 device concurrency를 전제로 한 인프라

FlowMat 규모에서는 먼저 모놀리스 모듈 구조로 유지한다.

---

## MES-09. baryonlabs/open-mes-korea

- GitHub: https://github.com/baryonlabs/open-mes-korea
- 판정: **B+**
- 상태: 설계/초기 구현

### 좋은 점

- 작은 Core
- LOT genealogy
- 중복 방지
- 정정 이력
- audit
- 바코드/태블릿 중심 현장 입력
- 안전한 AI
- 온프레미스/데이터 주권
- 데이터 수집을 AI보다 먼저 본다는 관점

### FlowMat 적용

특히 다음을 채택한다.

```text
원본 Event 삭제 금지
잘못된 데이터 = Correction/Reversal Event 추가
AI write = 승인 정책 통과 후 Command로만 수행
```

현재 FlowMat의 inventory reversal 철학과도 잘 맞는다.

---

## MES-10. OCA/manufacture

- GitHub: https://github.com/OCA/manufacture
- 판정: **A (기능 패턴 저장소)**
- 성격: Odoo 제조 확장 모듈 묶음

### 특히 볼 모듈

```text
mrp_bom_version
mrp_bom_hierarchy
mrp_bom_line_formula_quantity
mrp_bom_line_uom_rounding
mrp_bom_location
mrp_bom_tracking
mrp_byproduct_auto_create_lot
mrp_lot_number_propagation
mrp_multi_level
mrp_production_check_bom_alignment
mrp_production_back_to_draft
```

### FlowMat에 가져올 것

- 현재 1단계에서 금지한 **Multi-level BOM**의 2단계 설계
- BOM formula quantity
- BOM UoM rounding policy
- by-product
- LOT propagation
- BOM alignment 검증
- 승인 이후 수정 대신 새 revision

### 가장 중요한 판단

OCA를 통째로 포팅하지 않는다. **각 Add-on을 하나의 요구사항/테스트 케이스 카탈로그처럼 사용**한다.

---

# 5. BPM / Workflow 저장소 10개

## BPM-01. flowable/flowable-engine

- GitHub: https://github.com/flowable/flowable-engine
- 판정: **A+**
- 기술: Java, Spring 친화, Apache-2.0

### 실제 코드에서 확인한 구조

`ProcessDefinitionEntity`에는:

```text
key
name
description
deploymentId
version
resourceName
tenantId
historyLevel
category
diagramResourceName
suspensionState
```

등이 있고,

`ExecutionEntity`에는:

```text
processDefinitionId/key/name/version
processInstance
parent / child execution
super execution / subprocess
rootProcessInstance
startTime
end state
lock owner/time
current activity
variables
```

등이 분리되어 있다.

### FlowMat이 반드시 가져올 것

**Definition ≠ Execution**

현재 FlowMat의 방향은 맞지만 이것을 더 강하게 만든다.

```text
workflow_revision = ProcessDefinition
flow_run          = ProcessInstance
flow_run_step     = Execution/Activity Instance
```

### 추가로 참고

- suspend/resume
- subprocess
- history level
- variables
- timers/events
- deployment/version

### 하지 말 것

FlowMat을 BPMN 엔진으로 바꾸지 않는다.
Flowable 엔진 자체를 지금 embed하는 것도 권하지 않는다.

FlowMat은 물질/에너지/파일/사람/설비 Resource Flow가 핵심이라 BPMN보다 더 넓은 semantic model이 필요하다.

---

## BPM-02. camunda/camunda

- GitHub: https://github.com/camunda/camunda
- 판정: **B**

### 가져올 것

- Modeler / Runtime / Operate(Monitoring) 분리
- Incident 개념
- retry와 운영자 intervention
- 실행 로그를 검색/관찰하는 운영 UI
- message/event 기반 trigger

### 하지 말 것

- Zeebe와 같은 분산 로그 기반 실행 엔진을 직접 만들기
- Kubernetes 전제 구조

FlowMat에서는 처음에 PostgreSQL 기반 durable execution으로 충분하다.

---

## BPM-03. operaton/operaton

- GitHub: https://github.com/operaton/operaton
- 판정: **A-/B+**
- Java + Spring Boot + REST + PostgreSQL 지원
- Camunda 7 계보

### FlowMat에 유용한 점

Flowable과 마찬가지로 **Java/Spring에서 임베드 가능한 전통 BPM runtime 구조**를 읽기 좋다.

참고 대상:

- definition deployment
- execution
- task
- history
- job
- incident
- REST boundary

Conductor보다 비즈니스 프로세스 쪽, Flowable과 비슷한 비교군으로 둔다.

---

## BPM-04. Activiti/Activiti

- GitHub: https://github.com/Activiti/Activiti
- 판정: **C+**

가볍고 전통적인 Java BPM 엔진 구조 참고에는 좋다.
다만 Flowable/Operaton과 중복이 많아 **독립적으로 가져올 기능은 적다.**

---

## BPM-05. bonitasoft/bonita-engine

- GitHub: https://github.com/bonitasoft/bonita-engine
- 판정: **C**

### 참고

- 프로세스 배포/실행/관리 서비스 경계
- human task/application runtime
- engine standalone embedding

FlowMat 핵심 참고 우선도는 Flowable/Conductor보다 낮다.

---

## BPM-06. ProcessMaker/processmaker

- GitHub: https://github.com/ProcessMaker/processmaker
- 판정: **B-/C+**

### 가져올 것

- Form schema
- 사용자/역할 기반 Task
- approval/routing rule
- 문서 생성
- Human-in-the-loop workflow

FlowMat이 제조/데이터 파이프라인뿐 아니라 승인 프로세스를 다룰 때 필요하다.

---

## BPM-07. conductor-oss/conductor

- GitHub: https://github.com/conductor-oss/conductor
- 판정: **A+**
- Java 21
- durable workflow graph

### 실제 `WorkflowDef`에서 확인한 것

```text
name
version
tasks
inputParameters
outputParameters
failureWorkflow
schemaVersion
restartable
timeoutPolicy
timeoutSeconds
variables
inputTemplate
inputSchema
outputSchema
enforceSchema
rateLimitConfig
metadata
maskedFields
```

### 실제 `TaskDef`에서 확인한 것

```text
retryCount
timeoutSeconds
inputKeys
outputKeys
timeoutPolicy
retryLogic
retryDelaySeconds
responseTimeoutSeconds
concurrentExecLimit
inputTemplate
```

RetryLogic:

```text
FIXED
EXPONENTIAL_BACKOFF
LINEAR_BACKOFF
```

TimeoutPolicy:

```text
RETRY
TIME_OUT_WF
ALERT_ONLY
```

### FlowMat에 거의 그대로 개념 반영할 것

```text
node_retry_count
node_retry_strategy
node_retry_delay
node_timeout_seconds
node_timeout_policy
node_concurrency_limit
node_input_schema
node_output_schema
failure_policy
```

### 추가 기능

- fork/join
- loop
- subworkflow
- switch/branch
- restart/rerun
- inspectable execution

### 중요

FlowMat은 Conductor를 복제할 필요는 없지만, **Run Engine의 기본 문법은 Conductor가 가장 좋은 비교 대상**이다.

---

## BPM-08. temporalio/temporal

- GitHub: https://github.com/temporalio/temporal
- 판정: **B (런타임 철학)**

### 가져올 것

- durable execution
- retry를 application 코드에 흩뿌리지 않는 방식
- deterministic/event history 관점
- activity idempotency
- long-running execution
- resume/recovery

### 보류

Temporal 서버 같은 분산 런타임을 직접 구현하거나 의존시키지 않는다.

FlowMat에서는 우선:

```text
flow_run_event
flow_run_step_attempt
idempotency_key
retry_at
```

정도로 철학을 가져오면 된다.

---

## BPM-09. cadence-workflow/cadence

- GitHub: https://github.com/cadence-workflow/cadence
- 판정: **C**

Temporal과 유사한 durable workflow 선례.
독립 기능 도입 후보라기보다는 Temporal 설계의 비교군이다.

---

## BPM-10. bpmn-io/bpmn-js

- GitHub: https://github.com/bpmn-io/bpmn-js
- 판정: **A (Editor architecture)**

### 핵심

bpmn-js는 BPMN 모델 자체보다 `diagram-js` 기반 편집 구조가 더 중요하다.

- Modeling service
- Command Stack
- Element Factory
- Rules
- Palette
- Context Pad
- Importer
- semantic object와 graphical DI 분리

### FlowMat에 가져올 것

현재 `flowmat-editor` 설계를 유지하면서 다음 패턴만 도입한다.

```text
EditorCommand
CommandStack
ElementFactory
ToolRegistry
RuleRegistry
SelectionService
SnapService
Serializer
```

### 하지 말 것

- bpmn-js로 현재 editor를 갈아엎기
- 공정 연결을 BPMN SequenceFlow로 강제하기
- BPMN XML을 FlowMat의 canonical persistence로 사용하기

---

# 6. SCM 저장소 10개

## SCM-01. frePPLe/frepple

- GitHub: https://github.com/frePPLe/frepple
- 판정: **A+**
- Community Edition: MIT
- 성격: 수요예측 + APS(Advanced Planning & Scheduling)

### 실제 Operation 모델에서 확인한 것

Operation type:

```text
fixed_time
time_per
routing
alternate
split
```

주요 속성:

```text
item
location
owner
priority
effective_start / effective_end
posttime
size_minimum / multiple / maximum
cost
duration
duration_per
search mode
available calendar
batch window
```

### OperationMaterial

- operation
- item
- location
- quantity per piece
- fixed quantity
- timing type

### 실제 Resource 모델

```text
type
constrained
maximum
maximum_calendar
available calendar
location
cost/hour
maxearly
setupmatrix
setup
efficiency
efficiency_calendar
skills
```

### SetupRule

```text
from_setup
to_setup
duration
cost
priority
resource
```

### FlowMat에 반드시 가져올 것

이 저장소는 **FlowMat Simulation/Optimization의 핵심 교과서**다.

1. Operation type
2. Capacity Resource
3. Calendar
4. Setup/Changeover Matrix
5. Efficiency
6. Batch Window
7. Alternate Resource/Operation
8. Split Operation
9. Bottleneck/constraint
10. Planned vs released execution

### 제안 테이블

```text
resource_capacity
resource_calendar
resource_skill
setup_matrix
setup_rule
node_resource_requirement
```

---

## SCM-02. fleetbase/fleetbase

- GitHub: https://github.com/fleetbase/fleetbase
- 판정: **B-**

### 참고

- modular logistics OS
- API/webhook first
- extension system
- dispatch
- waypoint/route
- activity timeline

FlowMat의 Logistics Domain Template을 만들 때 참고한다.

---

## SCM-03. openboxes/openboxes

- GitHub: https://github.com/openboxes/openboxes
- 판정: **B**

### 가져올 것

- Location/Bin hierarchy
- Receipt / Putaway / Picking / Shipment
- Lot/expiry
- 재고 이동 workflow
- 낮은 사양 환경에서도 작동하는 현장 중심 UX

FlowMat의 물리 Resource Store를 확장할 때 좋다.

---

## SCM-04. OCA/purchase-workflow

- GitHub: https://github.com/OCA/purchase-workflow
- 판정: **B**

### 가져올 것

- Purchase requisition/order 상태 전이
- supplier information
- exception rule
- blanket order
- approval/cancel reason
- procurement grouping

재고 임계값 → 구매요청 → 승인 → 발주를 만들 때 참고한다.

---

## SCM-05. OCA/stock-logistics-workflow

- GitHub: https://github.com/OCA/stock-logistics-workflow
- 판정: **B**

### 유용 모듈

- dynamic routing
- auto assign/release
- move actual date
- scrap reason
- procurement routing

FlowMat의 `resource_event`와 `flow_connection` 실행 정책을 물류에 적용할 때 유용하다.

---

## SCM-06. OCA/delivery-carrier

- GitHub: https://github.com/OCA/delivery-carrier
- 판정: **C**

배송사, 운임, 중량, 라벨, 창고-배송 연결.
현재 FlowMat Core에는 필요 없다.
Fulfillment/Shipping 확장 단계에서 사용한다.

---

## SCM-07. SE214-Semicolon/Warehouse-and-Supply-Chain-Management-System

- GitHub: https://github.com/SE214-Semicolon/Warehouse-and-Supply-Chain-Management-System
- 판정: **C**
- 기술: NestJS + Prisma + React + PostgreSQL

작고 읽기 쉬운 통합 예제로는 가치가 있다.
다만 엔터프라이즈 설계 기준으로 채택할 정도의 우선도는 낮다.

---

## SCM-08. samirsaci/supply-chain-optimization

- GitHub: https://github.com/samirsaci/supply-chain-optimization
- 판정: **B (알고리즘 PoC)**

PuLP 기반 선형계획으로:

- 생산시설 고정비
- 단위 생산비
- 운송비
- 고객 수요

을 최적화한다.

### FlowMat 활용

나중에 AI/Optimization Service를 만들 때:

```text
FlowMat State Snapshot
    ↓
Optimization Input DTO
    ↓
Python Solver
    ↓
Recommendation
    ↓
사용자 승인
```

형태의 첫 PoC로 적당하다.

---

## SCM-09. emoss08/Trenova

- GitHub: https://github.com/emoss08/Trenova
- 판정: **C+**
- 기술: Go + PostgreSQL + GraphQL + React
- 라이선스: source-available 계열(FSL)

### 참고

- shipment lifecycle
- stop sequencing
- driver/equipment assignment
- exception
- rating/billing readiness

물류 실행 템플릿에서 참고하되 코드 복사는 특히 피한다.

---

## SCM-10. microsoft/Recurring-Integrations-Scheduler

- GitHub: https://github.com/microsoft/Recurring-Integrations-Scheduler
- 판정: **B**

### 예상 밖으로 FlowMat에 유용한 점

SCM 기능보다 **Integration Job** 패턴이 좋다.

```text
import
export
upload
download
execution monitor
processing monitor
schedule
recurrence
```

FlowMat에서 CAD/Excel/ERP/MES 외부 연동을 할 때:

```text
integration_job
integration_run
integration_schedule
integration_run_log
```

형태로 참고할 수 있다.

---

# 7. ERP 저장소 10개

## ERP-01. frappe/erpnext

- GitHub: https://github.com/frappe/erpnext
- 판정: **A-/B+**

### 가져올 것

- BOM / Routing / Workstation / Work Order / Job Card 관계
- Stock Ledger라는 이벤트성 재고 이력 관점
- capacity planning
- subcontracting
- document lifecycle
- metadata/custom field 중심 확장

### 특히 중요한 점

FlowMat의 domain_template/custom property 구조를 만들 때 Frappe의 metadata-driven 철학을 참고할 가치가 크다.

### 하지 말 것

ERPNext 전체 기능을 FlowMat에 넣는 것.

---

## ERP-02. odoo/odoo

- GitHub: https://github.com/odoo/odoo
- 판정: **A (도메인 참고), C (직접 구조 이식)**

### 가져올 것

- Add-on/module architecture
- stock move / quant / reservation
- route/rule
- manufacturing order / work order
- module 간 느슨한 확장

실제 학습은 거대한 core보다 OCA의 세부 저장소가 더 효율적이다.

---

## ERP-03. Dolibarr/dolibarr

- GitHub: https://github.com/Dolibarr/dolibarr
- 판정: **C**

### 참고

- 소규모 기업 대상 module activation
- 단순하고 범용적인 ERP UX
- 제조를 포함하되 기능을 필요할 때 켜는 구조

FlowMat의 Domain Extension 활성화 UX에 참고한다.

---

## ERP-04. metasfresh/metasfresh

- GitHub: https://github.com/metasfresh/metasfresh
- 판정: **B+**
- Java + REST + React 계열

### 가치

FlowMat과 언어/웹 구조가 비교적 가까운 대형 ERP다.

참고할 것:

- material planning
- order → material → shipment 흐름
- enterprise package/module boundary
- REST API boundary
- 대형 Java 도메인 서비스 구성

### 주의

오래 축적된 ERP 복잡성을 그대로 따라가면 FlowMat이 무거워진다.

---

## ERP-05. idempiere/idempiere

- GitHub: https://github.com/idempiere/idempiere
- 판정: **B-/C+**

### 참고

- OSGi plugin
- metadata-driven business objects
- Java + PostgreSQL
- ERP/CRM/SCM 통합 데이터 모델

FlowMat의 plugin/domain extension 장기 구조에 참고.

---

## ERP-06. apache/ofbiz-framework

- GitHub: https://github.com/apache/ofbiz-framework
- 판정: **B**
- Apache-2.0, Java

### 가져올 것

- Entity Engine / Service Engine 철학
- 업무 Entity와 업무 Service를 명확히 분리
- 서비스 오케스트레이션
- 데이터 모델을 모듈별로 관리

FlowMat의 범용 command/service layer를 정리할 때 참고하기 좋다.

---

## ERP-07. axelor/axelor-open-suite

- GitHub: https://github.com/axelor/axelor-open-suite
- 판정: **C+**

### 참고

- production
- stock
- supply chain
- purchase
- quality

등을 별도 module로 나누는 방식.

---

## ERP-08. etendosoftware/etendo_core

- GitHub: https://github.com/etendosoftware/etendo_core
- 판정: **C+**

### 참고

- composable ERP
- 모듈 추가 구조
- business flow 확장
- Java/PostgreSQL 계열

FlowMat Marketplace/Extension 단계에서 다시 본다.

---

## ERP-09. inoerp/inoERP

- GitHub: https://github.com/inoerp/inoERP
- 판정: **C**

범용 ERP 데이터 범위를 보는 참고 자료.
FlowMat 핵심 실행 엔진에는 직접 가져올 요소가 상대적으로 적다.

---

## ERP-10. tryton/tryton

- GitHub: https://github.com/tryton/tryton
- 판정: **C+**

강한 모듈화가 특징.
FlowMat이 domain package를 외부 extension 수준으로 분리할 때 참고한다.

---

# 8. WMS 저장소 10개

## WMS-01. openwms/org.openwms

- GitHub: https://github.com/openwms/org.openwms
- 판정: **A**
- Java 기반
- WMS + Material Flow Control

### 핵심 구조

OpenWMS는 기술 layer보다 **Business Component**를 중심으로 나누고, 각 component가 별도 lifecycle/data store를 갖는 구조를 지향한다.

상위 ERP가 high-level task를 주고:

```text
ERP Task
   ↓
WMS Orchestration
   ↓
Inventory / Transport / MFC
   ↓
PLC / Device
```

로 내려간다.

### FlowMat에 가져올 것

1. FlowMat Core와 Device Adapter의 분리
2. high-level execution plan과 low-level task의 분리
3. Material Flow Control 관점
4. Inventory와 Transport 책임 분리

### 하지 말 것

현재부터 마이크로서비스별 DB를 만드는 것.
논리적 모듈 분리만 먼저 한다.

---

## WMS-02. GreaterWMS/GreaterWMS

- GitHub: https://github.com/GreaterWMS/GreaterWMS
- 판정: **B-/C+**

현재 3.x는 별도 Bomiot/Rust plugin 아키텍처로 이동한 흔적이 크다.
기존 저장소 코드와 최신 방향이 섞여 있다.

### 참고

- inbound/outbound
- inventory
- PDA scan
- customization/plugin marketplace

코드 구조보다는 warehouse operator flow를 참고한다.

---

## WMS-03. fjykTec/ModernWMS

- GitHub: https://github.com/fjykTec/ModernWMS
- 판정: **B-/C+**
- .NET + Vue

### 가져올 것

단순하고 명시적인:

- warehouse
- location
- stock
- inbound
- outbound

모델/UI를 FlowMat WMS extension UX의 비교군으로 사용한다.

---

## WMS-04. jingsewu/open-wes

- GitHub: https://github.com/jingsewu/open-wes
- 판정: **A-/B+**

WMS보다 **Warehouse Execution System**이라는 점이 중요하다.

### 가져올 것

- Task queue
- priority
- task allocation rule
- sorting/routing rule
- real-time execution state
- WebSocket
- equipment/automation adapter

FlowMat의 generic `flow_run_step`을 실제 현장 task로 변환하는 패턴에 적합하다.

---

## WMS-05. OCA/wms

- GitHub: https://github.com/OCA/wms
- 판정: **B (카탈로그)**

이 저장소 자체는 구현보다 WMS 관련 OCA 저장소의 디렉터리/카탈로그 역할이 강하다.

특히:

```text
stock-logistics-reservation
stock-logistics-putaway
stock-logistics-release-channel
stock-logistics-shopfloor
stock-logistics-tracking
stock-logistics-transport
stock-logistics-warehouse
```

를 후속 요구사항 사전으로 사용한다.

---

## WMS-06. OCA/stock-logistics-warehouse

- GitHub: https://github.com/OCA/stock-logistics-warehouse
- 판정: **A-/B+**

### 가져올 것

- warehouse/location hierarchy
- location zone
- location position
- cycle count
- inventory discrepancy
- location lockdown
- lot catalog

FlowMat `Resource Store`를 실제 물리 저장공간까지 확장할 때 매우 유용하다.

---

## WMS-07. OCA/stock-logistics-shopfloor

- GitHub: https://github.com/OCA/stock-logistics-shopfloor
- 판정: **B**

### 가져올 것

- barcode-first command UX
- reception
- batch
- cluster picking
- measurement device
- single product transfer

관리자용 ERP 화면과 현장 작업자용 화면을 분리해야 한다는 좋은 선례다.

---

## WMS-08. myTinyWMS/myTinyWMS

- GitHub: https://github.com/myTinyWMS/myTinyWMS
- 판정: **D/C**
- 현재 archived

작은 WMS의 구조를 이해하는 교육용 외에는 우선도가 낮다.

---

## WMS-09. shuxiang/MT-WMS

- GitHub: https://github.com/shuxiang/MT-WMS
- 판정: **C+**

### 특징

- multi warehouse
- multi owner
- inbound/outbound
- wave picking

### 가져올 것

FlowMat이 여러 조직/소유자의 자원을 한 warehouse에서 관리하게 된다면:

```text
warehouse_id
owner_id
custody_owner_id
```

분리 개념을 참고할 수 있다.

---

## WMS-10. openshiporg/openship

- GitHub: https://github.com/openshiporg/openship
- 판정: **B-**

엄밀히 말해 WMS 자체보다 Order Router에 가깝다.

### 매우 깔끔한 개념

```text
Shop
Channel
Link
Match
```

FlowMat식으로 번역하면:

```text
External Source
External Target
Connector Link
Resource Mapping
```

향후 ERP/MES/API/Google Sheet/외부 시스템 연결을 만들 때 좋은 Integration Router 패턴이다.

---

# 9. 50개 저장소 요약 매트릭스

| # | Repository | 영역 | 판정 | FlowMat에서 가져올 핵심 |
|---:|---|---|---|---|
| 1 | Mes-Open/OpenMes | MES | A | Template snapshot, Batch/Step, allocation, QC/downtime |
| 2 | sindohmes/mes4u | MES | B | Operation execution UX, 제조 master/operation |
| 3 | SMEWebify/WebErpMesv2 | MES | B | Routing, machine load, planned-vs-actual cost/time |
| 4 | kuaigeyun/kuaigeyun-mes | MES | A | Demand, readiness check, WO steps, BOM change, plugin |
| 5 | iplus-framework/iPlusMES | MES | C | MES/SCADA boundary, maintenance, industrial integration |
| 6 | VidetteMakes/MESS | MES | B | Work instruction, QC data, part/subassembly trace |
| 7 | factorysemantics/factorysemantics-mes | MES | A-/C | Agent safety, audit/provenance, shadow mode, connector module |
| 8 | xianshi3/virtual-path-mes | MES | B/C | Device gateway, MQTT, telemetry, SPC, AI tool calls |
| 9 | baryonlabs/open-mes-korea | MES | B+ | Correction history, genealogy, safe AI, data capture |
| 10 | OCA/manufacture | MES | A | BOM version/multilevel/formula/UoM, byproduct, lot propagation |
| 11 | flowable/flowable-engine | BPM | A+ | Definition/Instance/Execution, history, subprocess |
| 12 | camunda/camunda | BPM | B | Runtime/Operate separation, incident, retry operations |
| 13 | operaton/operaton | BPM | A-/B+ | Java/Spring BPM runtime patterns |
| 14 | Activiti/Activiti | BPM | C+ | Lightweight BPM baseline |
| 15 | bonitasoft/bonita-engine | BPM | C | Engine service boundaries, human task |
| 16 | ProcessMaker/processmaker | BPM | B-/C+ | Forms, roles, approval/routing |
| 17 | conductor-oss/conductor | BPM | A+ | Retry/timeout/schema/fork/join/loop/subflow |
| 18 | temporalio/temporal | BPM | B | Durable execution, event history, recovery |
| 19 | cadence-workflow/cadence | BPM | C | Durable workflow comparison |
| 20 | bpmn-io/bpmn-js | BPM/UI | A | Command stack, factory, rule registry, semantic/graphic split |
| 21 | frePPLe/frepple | SCM/APS | A+ | Capacity, calendar, setup, alternate/split/routing |
| 22 | fleetbase/fleetbase | SCM | B- | Extension/webhook, route/activity timeline |
| 23 | openboxes/openboxes | SCM/WMS | B | Putaway/pick/location/expiry/stock flow |
| 24 | OCA/purchase-workflow | SCM | B | Procurement state/exception/supplier/approval |
| 25 | OCA/stock-logistics-workflow | SCM | B | Dynamic routing, move event, scrap reason |
| 26 | OCA/delivery-carrier | SCM | C | Shipping carrier extension |
| 27 | SE214...Warehouse... | SCM | C | Simple Nest/Prisma domain example |
| 28 | samirsaci/supply-chain-optimization | SCM/OPT | B | LP optimizer PoC boundary |
| 29 | emoss08/Trenova | TMS | C+ | Dispatch/assignment/exception; license caution |
| 30 | microsoft/Recurring-Integrations-Scheduler | Integration | B | Scheduled import/export job model |
| 31 | frappe/erpnext | ERP | A-/B+ | BOM/routing/workstation/job card, metadata, ledger |
| 32 | odoo/odoo | ERP | A/C | Add-on model, stock move/quant/route |
| 33 | Dolibarr/dolibarr | ERP | C | Simple module activation UX |
| 34 | metasfresh/metasfresh | ERP | B+ | Java ERP module/service/API patterns |
| 35 | idempiere/idempiere | ERP | B-/C+ | OSGi plugin, metadata-driven model |
| 36 | apache/ofbiz-framework | ERP | B | Entity/Service engine separation |
| 37 | axelor/axelor-open-suite | ERP | C+ | production/stock/supplychain module boundary |
| 38 | etendosoftware/etendo_core | ERP | C+ | composable extension architecture |
| 39 | inoerp/inoERP | ERP | C | broad ERP data model reference |
| 40 | tryton/tryton | ERP | C+ | clean modular business software pattern |
| 41 | openwms/org.openwms | WMS | A | high-level task→MFC/device, business components |
| 42 | GreaterWMS/GreaterWMS | WMS | B-/C+ | inbound/outbound/PDA, plugin direction |
| 43 | fjykTec/ModernWMS | WMS | B-/C+ | straightforward warehouse UI/domain |
| 44 | jingsewu/open-wes | WES | A-/B+ | execution task queue, allocation/routing rules |
| 45 | OCA/wms | WMS | B | WMS requirement repository catalog |
| 46 | OCA/stock-logistics-warehouse | WMS | A-/B+ | location hierarchy/zone/cycle count |
| 47 | OCA/stock-logistics-shopfloor | WMS | B | barcode/operator workflow |
| 48 | myTinyWMS/myTinyWMS | WMS | D/C | archived; conceptual only |
| 49 | shuxiang/MT-WMS | WMS | C+ | multi-warehouse/multi-owner/wave pick |
| 50 | openshiporg/openship | Integration | B- | Source→Channel→Link→Mapping router |

---

# 10. 최종적으로 “가져올 기능” 백로그

## P0 — FlowMat Core Runtime

### FM-RUN-001 — Workflow Revision

추가 후보:

```text
workflow_revision
- workflow_revision_id
- workflow_id
- revision_no
- status: draft/published/retired
- schema_version
- canvas_snapshot
- published_by
- published_at
```

기존 `workflow`를 당장 제거하지 않는다.

### FM-RUN-002 — Flow Run 일반화

현재 `production_run`을 즉시 rename하지 말고, 공통 실행 abstraction을 먼저 만든다.

```text
flow_run
- flow_run_id
- workflow_id
- workflow_revision_id
- run_type: actual/simulation/test/dry_run
- status
- input_payload
- output_payload
- started_at
- ended_at
- requested_by
```

제조 extension은 `production_run`과 1:1 또는 adapter로 연결 가능하다.

### FM-RUN-003 — Node Step

```text
flow_run_step
- step_id
- flow_run_id
- node_id
- status
- sequence
- scheduled_at
- started_at
- ended_at
- input_snapshot
- output_snapshot
- error_code
- error_message
```

### FM-RUN-004 — Attempt

```text
flow_run_step_attempt
- attempt_id
- step_id
- attempt_no
- status
- started_at
- ended_at
- retry_at
- error
```

### FM-RUN-005 — Node Execution Policy

Conductor에서 가져온다.

```text
retry_count
retry_strategy
retry_delay_seconds
timeout_seconds
timeout_policy
concurrency_limit
failure_policy
```

### FM-RUN-006 — Event Ledger

```text
flow_run_event
- event_id
- run_id
- step_id nullable
- event_type
- payload_json
- request_id
- occurred_at
- actor_type
- actor_id
```

삭제보다 correction/reversal event를 원칙으로 한다.

---

# 11. P0 — Flow Contract 강화

## FM-FLOW-001 — Process IO → Port Contract

현재 `process_io`를 다음 의미로 강화한다.

```text
direction
role
resource_type
quantity
unit
schema_json
formula
required_yn
allow_shortage_yn
validation_rule
```

`schema_json`은 data/file/document/API resource에 특히 유용하다.

## FM-FLOW-002 — Connection Contract

```text
source_node
source_port
target_node
target_port
flow_type
condition_expr
delay
capacity
loss_rate
priority
failure_policy
```

Connection은 “화면의 선”이 아니다.
**Resource/Event가 이동하는 계약**이다.

---

# 12. P1 — Simulation / Planning

## FM-PLAN-001 — Operation Type

frePPLe에서 가져온다.

```text
fixed_time
time_per
routing
alternate
split
```

FlowMat에서는 범용화를 위해 다음처럼 표현할 수 있다.

```text
ATOMIC
ROUTING
ALTERNATE
SPLIT
JOIN
SUBFLOW
```

시간 정책은 별도:

```text
FIXED_TIME
TIME_PER_UNIT
FORMULA
```

## FM-PLAN-002 — Capacity Resource

```text
resource_capacity
- resource_id
- capacity_type
- maximum
- constrained_yn
- efficiency
- calendar_id
```

## FM-PLAN-003 — Calendar

```text
resource_calendar
calendar_interval
```

표현 대상:

- 설비 가동시간
- 작업자 교대
- 휴일
- API 이용 가능 시간
- 서버 maintenance window

## FM-PLAN-004 — Setup / Changeover Matrix

```text
setup_matrix
setup_rule
- from_setup
- to_setup
- duration
- cost
```

사용 예:

- 메론우유 → 딸기우유 라인 세척
- 빨간 도료 → 흰 도료
- 금형 A → B
- 모델 A 데이터 파이프라인 → B 환경 전환

---

# 13. P1 — Manufacturing Extension 강화

## FM-MFG-001 — Multi-level BOM

현재는 안전하게 다단계 BOM을 거절한다.
2단계에서는 OCA/ERPNext를 참고하여:

- cycle detection
- recursive explosion
- revision consistency
- effective date
- phantom/subassembly
- alternative/substitute

을 추가한다.

## FM-MFG-002 — By-product / Waste

BOM output을 완제품 하나로 제한하지 않는다.

```text
main_output
by_product
waste
emission
```

모두 Resource로 취급한다.

## FM-MFG-003 — Work Instruction

MESS/OpenMES 참고.

Node/Operation별:

- instruction revision
- rich text
- image/file
- checklist
- operator confirmation

## FM-MFG-004 — Quality/Issue

```text
validation_plan
validation_check
issue_log
nonconformity
corrective_action
```

제조에서는 QC, 소프트웨어에서는 validation/test, 데이터 파이프라인에서는 data quality로 재사용한다.

---

# 14. P1 — WMS / Physical Resource Extension

## FM-WMS-001 — Location hierarchy

```text
site
warehouse
zone
location
bin
```

다만 Core에서는 generic `resource_store`로 추상화할 수 있다.

## FM-WMS-002 — Putaway / Pick / Transfer

기존 inventory transaction 위에 command workflow를 올린다.

```text
putaway_task
pick_task
transfer_task
```

재고 수량 변경은 계속 현재 Inventory Command를 통해서만 수행한다.

## FM-WMS-003 — Reservation/Allocation

OpenMES/OCA 참고.

```text
reservation
allocation
consumption
```

을 구분한다.

---

# 15. P2 — Integration Platform

## FM-INT-001 — Connector

```text
connector_definition
connector_instance
credential_reference
```

credentials 자체를 DB 평문에 두지 않는다.

## FM-INT-002 — Integration Job

Microsoft RIS에서 가져온다.

```text
integration_job
integration_schedule
integration_run
integration_run_log
```

종류:

- import
- export
- push
- pull
- sync
- monitor

## FM-INT-003 — Mapping

Openship의 Match 개념을 일반화한다.

```text
external_resource_mapping
- connector_id
- local_resource_id
- external_type
- external_id
```

---

# 16. P2 — AI / Optimization

## FM-AI-001 — AI Action Permission

```text
READ
SUGGEST
REQUEST_APPROVAL
EXECUTE
```

AI 결과와 실제 Command를 분리한다.

## FM-AI-002 — Recommendation

```text
recommendation
- recommendation_type
- input_snapshot
- model/version
- result
- confidence/evidence
- status
- approved_by
```

## FM-AI-003 — Optimization service

첫 대상:

- 생산 순서
- changeover 최소화
- 자원 capacity
- 납기 지연 최소화
- 재고 부족 최소화

Python solver는 별도 service로 두되 FlowMat DB를 직접 수정하지 않는다.

---

# 17. Editor 관련 최종 결정

## 유지

```text
React Flow
= Process Node / semantic connection

flowmat-editor
= graphic shape / line / text / freehand / group
```

## 추가

bpmn-js/diagram-js에서 다음만 벤치마킹한다.

- CommandStack
- Modeling service
- Rule registry
- Element factory
- Tool registry
- serializer
- undo/redo transaction

## 하지 않는다

- bpmn-js로 갈아타기
- tldraw로 갈아타기
- 모든 도형을 React Flow Node로 표현하기
- semantic edge와 drawing line을 하나의 타입으로 합치기

현재 FlowMat의 **semantic canvas + graphic editor 이중 계층**이 오히려 맞다.

---

# 18. 지금 가져오지 말아야 할 기능

## 1. 전체 ERP 회계/급여/CRM

FlowMat이 ERPNext/Odoo를 복제하는 순간 프로젝트 정체성이 사라진다.

## 2. 마이크로서비스 전면 전환

OpenWMS/Virtual Path/Camunda의 규모를 지금 따라갈 이유가 없다.

## 3. 3D Digital Twin

2D semantic model과 실행 엔진이 먼저다.

## 4. 블록체인 LOT 추적

현재 relational genealogy + audit로 충분하다.
블록체인은 문제 해결에 필수 조건이 아니다.

## 5. 자체 분산 Workflow Engine

Temporal/Camunda 수준의 runtime을 직접 구현하면 본 프로젝트 범위를 압도한다.

## 6. BPMN 완전 호환

BPMN import/export는 나중에 adapter로 고려할 수 있지만 FlowMat canonical model이 되어서는 안 된다.

---

# 19. 추천 구현 순서

## Sprint 1 — Runtime Definition

- workflow revision
- publish/retire
- run은 revision 참조
- document drift 정리

## Sprint 2 — Step Runtime

- flow_run_step
- state machine
- event ledger
- run detail UI

## Sprint 3 — Retry/Timeout/Failure

- attempt
- retry policy
- timeout
- failure policy
- manual retry/cancel

## Sprint 4 — Port/Connection Contract

- typed ports
- input/output schema
- validation
- connection compatibility

## Sprint 5 — Simulation semantics

- duration modes
- capacity
- calendar
- setup/changeover

## Sprint 6 — Routing / Alternate / Split

- routing
- alternate
- split/join
- subflow

## Sprint 7 — Planning

- planned demand
- capacity check
- bottleneck report
- setup-aware schedule

## Sprint 8 — Manufacturing extension

- multilevel BOM
- byproduct/waste
- work instruction
- quality/nonconformity

## Sprint 9 — Physical logistics

- location hierarchy
- putaway/pick/transfer
- barcode/operator UX

## Sprint 10 — Connector/Optimization

- connector
- import/export job
- external mapping
- optimization recommendation

---

# 20. 현재 FlowMat 문서 드리프트 정리 필요

조사 중 중요한 내부 문제를 발견했다.

과거 `flowmat_implementation_backlog.md` 계열 문서는 BOM, LOT, WorkOrder 등이 비어 있거나 미착수라고 기록한 부분이 있지만, 최신 `inventory-bom-lot-contract.md`와 실제 코드/테스트에서는 상당 부분 구현이 완료됐다.

따라서 다음 작업을 권장한다.

```text
docs/status/CURRENT_CAPABILITIES.md
```

를 하나 만들고 이것을 유일한 현재 상태 문서로 둔다.

예:

```text
IMPLEMENTED
PARTIAL
PLANNED
DEPRECATED
EXPERIMENTAL
```

각 기능에:

```text
backend path
frontend path
migration
API
unit test
integration test
E2E
last verified commit
```

을 연결한다.

이것만 해도 AI/개발자가 과거 문서를 보고 이미 만든 기능을 다시 만드는 문제가 크게 줄어든다.

---

# 21. 최종 아키텍처 그림

```text
┌──────────────────────────────┐
│          Project             │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Workflow / Flow        │
│  identity + ownership        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      Workflow Revision       │
│ published immutable version  │
└───────┬──────────────┬───────┘
        │              │
        ▼              ▼
┌─────────────┐   ┌───────────────┐
│ Flow Node   │   │ Flow Contract │
│ Operation   │◄─►│ Port / Edge   │
└─────┬───────┘   └───────────────┘
      │
      ├──────── Resource Requirement
      │
      ├──────── Capacity / Calendar / Setup
      │
      ▼
┌──────────────────────────────┐
│          Flow Run            │
│ actual/simulation/test/dry   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        Flow Run Step         │
└──────────────┬───────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌──────────────┐ ┌──────────────┐
│ Step Attempt │ │  Run Event   │
│ retry/time   │ │ append-only  │
└──────────────┘ └──────────────┘

Resource Layer
──────────────
Resource / Item
Resource Store / Inventory
Resource Event / Inventory Transaction
LOT / Genealogy
Capacity Resource

Domain Extension
────────────────
Manufacturing: BOM, WorkOrder, QC, Equipment
Logistics: Warehouse, Putaway, Pick, Transfer
Software: File, API, Queue, Validation
Restaurant: Ingredient, Station, Human
```

---

# 22. 내가 FlowMat 팀 리드라면 내리는 결정

## 지금 유지

- Spring Boot monolith modular architecture
- PostgreSQL
- React
- React Flow
- 자체 `flowmat-editor`
- 현재 Inventory/BOM/LOT 구현

## 즉시 설계 시작

1. `workflow_revision`
2. `flow_run`
3. `flow_run_step`
4. `flow_run_step_attempt`
5. `flow_run_event`
6. Port schema/contract
7. retry/timeout/failure policy

## 그 다음

8. operation routing/alternate/split
9. capacity/calendar/setup matrix
10. readiness/preflight
11. planning
12. quality/work instruction
13. WMS task layer

## 후순위

- ERP 전체
- CAD 완전 편집
- 3D Twin
- Blockchain
- Microservices
- Kubernetes
- 실시간 PLC write
- AI 자동 실행

---

# 23. 저장소 우선 독서 순서

코드를 다시 읽는다면 아래 순서가 가장 효율적이다.

```text
1. SeolJhin/FlowMat
2. conductor-oss/conductor
3. flowable/flowable-engine
4. frePPLe/frepple
5. Mes-Open/OpenMes
6. OCA/manufacture
7. bpmn-io/bpmn-js
8. kuaigeyun/kuaigeyun-mes
9. openwms/org.openwms
10. frappe/erpnext
11. OCA/stock-logistics-warehouse
12. jingsewu/open-wes
13. factorysemantics/factorysemantics-mes
14. metasfresh/metasfresh
```

이 14개만 깊게 파면 나머지 36개에서 얻을 수 있는 핵심 패턴 대부분을 커버한다.

---

# 24. 라이선스/벤치마킹 원칙

기능 아이디어와 데이터 모델 개념은 적극 참고하되, 코드를 직접 가져올 때는 반드시 저장소별 라이선스를 확인한다.

특히:

- AGPL/GPL 계열: 코드 직접 복사/파생 시 배포 의무 검토 필요
- LGPL: 링크/수정 방식에 따른 조건 검토
- Apache-2.0/MIT: 상대적으로 사용이 자유롭지만 notice/attribution 조건 확인
- FSL/source-available: 오픈소스와 동일하게 취급하면 안 됨

FlowMat에는 가장 안전하게:

```text
외부 Repo 분석
→ 요구사항/테스트 케이스로 재작성
→ FlowMat 데이터 모델에 맞춰 독립 구현
```

하는 방식을 권장한다.

---

# 25. 최종 한 문장

FlowMat이 가져와야 하는 것은 다른 MES의 메뉴가 아니라,

> **Conductor/Flowable의 실행 모델 + frePPLe의 계획/자원 모델 + OpenMES의 제조 실행 패턴 + bpmn-js의 편집기 아키텍처 + OCA의 세밀한 제조/WMS 업무 규칙**

이다.

이 조합이면 FlowMat은 단순한 “2D 생산라인 ERP”가 아니라,

> **시각적으로 Flow를 정의하고, Resource를 연결하고, 실제/가상 실행을 기록하며, 용량·시간·규칙·실패까지 계산할 수 있는 범용 Process & Resource Flow Platform**

으로 갈 수 있다.
