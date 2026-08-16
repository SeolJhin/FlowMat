# FlowMat 프로젝트 테이블 개선 기획안

## 0. 문서 목적

이 문서는 현재 프로젝트 관련 테이블 기술서를 바탕으로, FlowMat의 구조를 단순한 생산/제조 ERP가 아니라 **범용 Flow Engine**으로 확장하기 위한 기획 방향을 정리한 문서이다.

현재 테이블은 제조/생산 MVP를 기준으로는 충분히 많은 기능을 포함하고 있다.  
그러나 최종 목표가 생산라인뿐 아니라 물류센터, 식당 주방 동선, 소프트웨어 파이프라인, 데이터 전처리, 사무 프로세스 등 다양한 흐름 설계까지 포함하는 것이라면, 테이블의 중심 개념을 더 넓게 잡아야 한다.

핵심 관점은 다음과 같다.

> FlowMat은 특정 산업의 생산관리 툴이 아니라,  
> **자원과 데이터가 노드를 따라 이동하며 처리되는 모든 흐름을 설계·실행·분석하는 범용 Flow Engine**이다.

---

## 1. 현재 상황 요약

현재 프로젝트 테이블에는 대략 다음과 같은 기능이 포함되어 있다.

```text
project
project_member
project_permission
project_invite

workflow
process
process_io
process_connection

item
unit_master
inventory
inventory_transaction

bom_header
bom_line

equipment
work_order
work_order_item
production_run
production_run_item

stock_alert
defect_log
quality_inspection
lot_master
lot_trace

project_file
project_export
cad_import_job
simulation_run
simulation_step
project_activity_log
project_version
project_comment
```

이 구조는 제조 MVP 기준으로 보면 기능이 꽤 잘 잡혀 있다.

현재 가능한 흐름은 다음과 같다.

```text
프로젝트 생성
→ 공정도 설계
→ 공정 블록 배치
→ 공정 입출력 정의
→ 공정 간 연결
→ 품목/자원 등록
→ 재고 관리
→ BOM 구성
→ 작업지시
→ 생산 실행
→ 재고 차감/증가
→ 불량/품질 기록
→ 시뮬레이션
→ 파일 import/export
```

하지만 이 구조는 아직 **제조/생산 도메인에 강하게 묶여 있는 상태**이다.

---

## 2. 현재 구조의 핵심 문제

현재 테이블의 문제는 테이블 수가 부족한 것이 아니다.  
오히려 테이블은 많다.

문제는 **기획 중심축이 제조 ERP에 고정되어 있다는 점**이다.

| 현재 개념 | 제조에서는 자연스러움 | 범용화 시 문제 |
|---|---|---|
| production_run | 생산 실행 | 소프트웨어/식당/물류에서는 어색함 |
| bom_header | BOM | 레시피, 의존성, 구성 규칙으로 더 넓게 봐야 함 |
| inventory | 재고 | 데이터 저장소, 대기열, 버퍼, 공간 상태까지 포괄하기 어려움 |
| equipment | 설비 | 셰프, API, 함수, GPU, 지게차 등을 포괄하기 어려움 |
| defect_log | 불량 기록 | 오류, 예외, 지연, 검증 실패 등으로 넓혀야 함 |
| item | 품목 | JSON, API 응답, 사람 시간, 공간, 이벤트를 담기엔 좁음 |

따라서 개선 방향은 테이블을 무작정 더 추가하는 것이 아니라,  
현재 테이블을 **Core / Domain / Extension** 구조로 재분류하는 것이다.

---

## 3. 최종 지향점

기존 관점은 다음과 같았다.

```text
생산라인 설계
→ BOM 연결
→ 생산 실행
→ 재고 자동 차감
→ 완제품 생성
→ 재고 부족 감지
→ 발주 또는 알림
```

하지만 최종 목표 관점에서는 다음처럼 바뀌어야 한다.

```text
Flow 설계
→ Node 정의
→ Resource 입출력 정의
→ Connection 이동 규칙 정의
→ Run 실행/시뮬레이션
→ Resource State 변화 기록
→ Result / Issue / Insight 도출
```

즉, 중심축은 **생산**이 아니라 **흐름과 변환**이다.

---

## 4. 핵심 아키텍처 원칙

FlowMat의 Core Engine은 다음 원칙을 가져야 한다.

```text
1. 모든 것은 Flow 안에서 일어난다.
2. Flow는 Node와 Connection으로 구성된다.
3. Node는 입력을 받아 처리하고 출력을 만든다.
4. 입력과 출력은 모두 Resource다.
5. Resource는 물리/디지털/인적/시간/공간/에너지/폐기물을 모두 포함한다.
6. Connection은 Resource가 이동하는 경로이자 조건이다.
7. Store는 Resource가 머무는 장소 또는 상태다.
8. Run은 Flow의 실제 실행 또는 시뮬레이션이다.
9. Event는 Run 중 발생한 모든 변화 기록이다.
10. Domain은 Core 구조 위에 올라가는 템플릿이다.
```

이 원칙을 기준으로 테이블을 다시 해석해야 한다.

---

## 5. 핵심 개념 재정의

### 5.1 Project

Project는 하나의 설계 공간이다.

예시:

```text
메론우유 생산라인
JSON 전처리 파이프라인
식당 주방 동선 설계
물류센터 피킹 프로세스
AI 모델 학습 파이프라인
사무 승인 프로세스
```

---

### 5.2 Flow

Flow는 프로젝트 안의 하나의 흐름도, 파이프라인, 공정도, 동선이다.

현재 테이블 기준으로는 `workflow`가 이 역할에 해당한다.

예시:

```text
제조:
원료 입고 → 혼합 → 살균 → 포장

소프트웨어:
JSON 입력 → 정제 → 검증 → 변환 → 저장

식당:
주문 접수 → 조리 → 플레이팅 → 서빙

물류:
입고 → 보관 → 피킹 → 패킹 → 출고
```

---

### 5.3 Node

Node는 흐름 안의 처리 단계다.

현재 테이블 기준으로는 `process`가 이 역할에 해당한다.

```text
Node = 입력을 받아 내부 규칙에 따라 처리하고 결과를 내보내는 단위
```

| 분야 | Node 예시 |
|---|---|
| 제조 | 혼합기, 살균기, 포장기, 검사대 |
| 소프트웨어 | Parser, Validator, Transformer, Model Inference |
| 식당 | 재료 손질대, 조리대, 플레이팅 구역, 서빙 동선 |
| 물류 | 입고 도크, 보관 랙, 피킹 존, 패킹 스테이션 |
| 사무 | 검토, 승인, 반려, 발송 |

---

### 5.4 Resource

Resource는 흐름 안에서 이동, 소비, 생성, 참조, 변환되는 모든 대상이다.

현재 테이블 기준으로는 `item`이 이 역할에 해당한다.

```text
Resource = Flow 안에서 사용, 이동, 소비, 생성, 변환, 참조되는 모든 대상
```

예시:

| 분야 | Resource 예시 |
|---|---|
| 제조 | 원료, 물, 전기, 가스, 반제품, 완제품, 폐기물 |
| 소프트웨어 | JSON, CSV, 이미지, API 응답, 로그, 모델, DB row |
| 식당 | 식재료, 조리도구, 셰프, 주문, 음식, 폐기물 |
| 물류 | 상품, 박스, 팔레트, 작업자, 차량, 컨베이어 |
| 사무업무 | 문서, 승인 요청, 계약서, 담당자, 이메일 |

---

### 5.5 Node IO

Node IO는 노드에 들어오고 나가는 Resource를 정의한다.

현재 테이블 기준으로는 `process_io`가 이 역할에 해당한다.

이 테이블은 FlowMat의 핵심 테이블이다.

```text
어떤 Node에
무엇이 들어오고
무엇이 나가는가
```

예시:

```text
제조:
혼합 공정 input 원유 100L
혼합 공정 input 전기 4kWh
혼합 공정 output 메론우유 90개

소프트웨어:
JSON 정제 input raw.json
JSON 정제 output cleaned.json
JSON 정제 output error.log

식당:
조리 input 양파 2kg
조리 input 셰프 시간 30분
조리 output 완성 음식 10개

물류:
피킹 input 상품 50개
피킹 input 작업자 시간 20분
피킹 output 피킹 완료 상품 50개
```

---

### 5.6 Connection

Connection은 노드와 노드 사이의 이동 경로이자 전달 규칙이다.

현재 테이블 기준으로는 `process_connection`이 이 역할에 해당한다.

Connection은 단순 선이 아니다.

```text
Connection = A 노드의 output이 B 노드의 input으로 이동한다는 계약
```

Connection이 표현해야 하는 것:

```text
무엇이 흐르는가
어디서 어디로 흐르는가
얼마나 흐르는가
어떤 조건에서 흐르는가
이동 시간이 있는가
손실이 있는가
우선순위가 있는가
실패하면 어떻게 되는가
```

---

### 5.7 Store

Store는 Resource가 머무는 장소 또는 상태이다.

현재 테이블 기준으로는 `inventory`가 이 역할에 해당한다.

기존의 inventory는 물리 재고 느낌이 강하지만, 범용적으로는 Resource Store 또는 Resource State로 봐야 한다.

| 분야 | Store 예시 |
|---|---|
| 제조 | 창고, 탱크, 재고 위치 |
| 소프트웨어 | DB, 파일 시스템, S3, Queue |
| 식당 | 냉장고, 재료 보관대, 대기 주문 |
| 물류 | 랙, 버퍼존, 출고 대기장 |
| 사무 | 문서함, 승인 대기함 |

---

### 5.8 Run

Run은 Flow의 실제 실행 또는 시뮬레이션이다.

현재 테이블 기준으로는 `production_run`, `simulation_run`이 이 역할에 해당한다.

범용적으로는 둘을 하나의 실행 개념으로 봐야 한다.

```text
run_type
- actual
- simulation
- test
- dry_run
```

실행 중에는 Resource가 소비, 생성, 이동, 변환된다.

예시:

```text
제조:
전기 4kWh 소비
원유 100L 소비
메론우유 90개 생성

소프트웨어:
raw.json 1개 소비
cleaned.json 1개 생성
error_log 3건 생성

식당:
양파 2kg 소비
셰프 작업시간 20분 소비
완성 요리 10개 생성

물류:
상품 50개 이동
박스 50개 소비
출고 패키지 50개 생성
```

---

## 6. 현재 테이블의 아키텍처적 재분류

### 6.1 Core Engine Tables

모든 도메인에 공통으로 필요한 핵심 테이블이다.

```text
project
workflow
process
process_io
process_connection
item
unit_master
inventory
inventory_transaction
project_file
project_activity_log
project_comment
```

아키텍처적 의미는 다음과 같다.

| 현재 테이블 | Core 의미 |
|---|---|
| project | 설계 공간 |
| workflow | Flow |
| process | Node |
| process_io | Node Input/Output |
| process_connection | Flow Connection / Contract |
| item | Resource Master |
| unit_master | Unit System |
| inventory | Resource Store / State |
| inventory_transaction | Resource Event |
| project_file | Project Asset |
| project_activity_log | Activity Log |
| project_comment | Collaboration Comment |

---

### 6.2 Execution Layer Tables

실행, 시뮬레이션, 결과 기록을 담당한다.

```text
work_order
work_order_item
production_run
production_run_item
simulation_run
simulation_step
```

아키텍처적 의미는 다음과 같다.

| 현재 테이블 | Core 의미 |
|---|---|
| work_order | Execution Plan |
| work_order_item | Execution Plan Resource |
| production_run | Flow Run |
| production_run_item | Flow Run Resource |
| simulation_run | Simulation Run |
| simulation_step | Run Step Result |

장기적으로는 다음 구조로 일반화할 수 있다.

```text
flow_run
flow_run_step
flow_run_resource
run_state_snapshot
```

---

### 6.3 Manufacturing Extension Tables

제조 도메인에 가까운 테이블이다.

```text
bom_header
bom_line
equipment
stock_alert
defect_log
quality_inspection
lot_master
lot_trace
```

아키텍처적 의미는 다음과 같다.

| 현재 테이블 | 제조 의미 | 범용 의미 |
|---|---|---|
| bom_header | BOM | Recipe / Composition |
| bom_line | BOM 상세 | Recipe Resource |
| equipment | 설비 | Asset / Tool / Executor |
| stock_alert | 재고 알림 | Resource Alert |
| defect_log | 불량 기록 | Issue Log |
| quality_inspection | 품질 검사 | Validation Check |
| lot_master | Lot | Resource Batch / Instance |
| lot_trace | Lot 추적 | Resource Lineage |

이 테이블들은 버릴 필요는 없다.  
다만 Core가 아니라 Manufacturing Template 또는 Domain Extension으로 보는 것이 좋다.

---

### 6.4 Integration / Asset Tables

외부 파일, 도면, import/export와 관련된 테이블이다.

```text
project_file
project_export
cad_import_job
```

아키텍처적으로는 다음과 같다.

| 현재 테이블 | 의미 |
|---|---|
| project_file | 프로젝트 파일 자산 |
| project_export | 내보내기 작업 |
| cad_import_job | 외부 도면/데이터 import 작업 |

장기적으로는 `import_job`, `export_job`처럼 더 범용적으로 확장할 수 있다.

---

## 7. 개선 방향 1: item을 Resource Master로 재정의

현재 `item`은 품목 중심이다.  
그러나 범용 Flow Engine에서는 Resource Master가 되어야 한다.

### 기존 방향

```text
item_type
- raw
- sub
- semi
- finished
- energy
- water
- waste
```

### 개선 방향

```text
resource_category
- material
- energy
- fluid
- data
- document
- human
- equipment
- space
- time
- signal
- waste
```

그리고 세부 타입은 `resource_type`으로 관리한다.

```text
resource_type
- raw_material
- finished_product
- electricity
- water
- json
- csv
- worker
- chef
- conveyor
- forklift
- error_log
- wastewater
```

### 예시

| 대상 | resource_category | resource_type | stock_managed_yn | metered_yn |
|---|---|---|---|---|
| 전기 | energy | electricity | N | Y |
| 물 | fluid | water | Y/N | Y |
| JSON | data | json | N | N |
| 셰프 | human | chef | N | N |
| 지게차 | equipment | forklift | N | N |
| 폐수 | waste | wastewater | Y/N | Y |

---

## 8. 개선 방향 2: process를 Node로 재정의

현재 `process`는 제조 공정, 도형, 설비, 시간, 비용, 환경값을 모두 담고 있다.

범용 구조에서는 다음과 같이 정의하는 것이 좋다.

```text
process = Flow 안의 처리 Node
```

Node는 세 가지 성격으로 나누어 생각한다.

```text
1. Node Display
   - 좌표
   - 크기
   - 회전
   - 색상
   - 아이콘
   - 레이어

2. Node Operation
   - 어떤 작업을 하는지
   - 어떤 입력을 어떤 출력으로 바꾸는지
   - 계산식
   - 검증 조건
   - 처리 정책

3. Node Runtime
   - 실행 시간
   - 처리량
   - 비용
   - 대기시간
   - 결과
```

MVP에서는 하나의 `process` 테이블에 둘 수 있지만, 장기적으로는 다음 분리를 고려한다.

```text
process
process_operation
process_config
```

또는 범용 명칭으로는:

```text
flow_node
node_operation
node_config
```

---

## 9. 개선 방향 3: process_io를 핵심 테이블로 강화

`process_io`는 이 시스템의 핵심이다.

이 테이블은 특정 노드에서 어떤 Resource가 입력되고 출력되는지를 정의한다.

### 필요한 핵심 속성

```text
direction
- input
- output

io_role
- material
- energy
- fluid
- data
- document
- human
- equipment
- space
- time
- signal
- waste

quantity
unit
formula
timing
required_yn
allow_shortage_yn
```

### 예시

```text
제조:
혼합 노드 input 원유 100L
혼합 노드 input 전기 4kWh
혼합 노드 output 제품 90ea

소프트웨어:
검증 노드 input raw_json 1file
검증 노드 output clean_json 1file
검증 노드 output error_log 3rows

식당:
조리 노드 input 재료 2kg
조리 노드 input 셰프 시간 30min
조리 노드 output 완성 요리 10ea
```

---

## 10. 개선 방향 4: process_connection을 Flow Contract로 강화

`process_connection`은 단순한 선이 아니라 이동 규칙이다.

### Connection Type 예시

```text
material_flow
energy_flow
fluid_flow
data_flow
document_flow
human_flow
equipment_flow
event_flow
control_flow
```

### Connection이 가져야 하는 정보

```text
from_node
to_node
from_io
to_io
resource
flow_type
flow_condition
delay_time
capacity
loss_rate
priority
failure_policy
```

이 구조가 있어야 다음 분야를 모두 표현할 수 있다.

| 분야 | Connection 의미 |
|---|---|
| 제조 | 컨베이어, 배관, 전력선 |
| 소프트웨어 | 데이터 스트림, API 호출, 이벤트 큐 |
| 식당 | 셰프 동선, 재료 이동 |
| 물류 | 상품 이동 경로, 컨베이어, 차량 이동 |

---

## 11. 개선 방향 5: inventory를 Resource Store/State로 확장

`inventory`를 단순 재고로만 보면 범용성이 떨어진다.

개선 정의:

```text
inventory = Resource Store / Resource State
```

추가로 고려할 개념:

```text
store_type
- warehouse
- tank
- queue
- database
- file_storage
- buffer
- station
- rack
- room
- virtual_state
```

예시:

| 분야 | Store |
|---|---|
| 제조 | 원자재 창고, 탱크 |
| 소프트웨어 | DB, S3, Queue |
| 식당 | 냉장고, 조리대, 대기 주문 |
| 물류 | 랙, 버퍼존, 출고 대기장 |

---

## 12. 개선 방향 6: production_run과 simulation_run을 Run 개념으로 일반화

현재 `production_run`과 `simulation_run`은 나뉘어 있다.

하지만 아키텍처적으로는 실행이라는 하나의 개념으로 보는 것이 좋다.

```text
flow_run
- run_type: actual, simulation, test, dry_run
```

### 권장 구조

```text
flow_run
flow_run_step
flow_run_resource
run_state_snapshot
```

### 각 역할

| 테이블 | 역할 |
|---|---|
| flow_run | Flow 실행 단위 |
| flow_run_step | 노드별 실행 결과 |
| flow_run_resource | 실행 중 소비/생성된 Resource |
| run_state_snapshot | 특정 시점의 전체 상태 |

---

## 13. 개선 방향 7: domain_template 계층 추가

범용 서비스를 위해 가장 중요한 추가 계층이다.

현재는 도메인별 기본값을 담을 구조가 부족하다.

### 필요한 테이블

```text
domain_template
domain_resource_type
domain_node_type
domain_connection_type
domain_operation_type
domain_unit
domain_sample_flow
```

### Domain Template 예시

#### Manufacturing Template

```text
resource:
- raw_material
- electricity
- water
- waste

node:
- process
- equipment
- storage
- inspection

connection:
- material_flow
- energy_flow
- fluid_flow

operation:
- mixing
- heating
- packaging
- inspection
```

#### Software Pipeline Template

```text
resource:
- json
- csv
- image
- api_response
- log

node:
- parser
- validator
- transformer
- storage

connection:
- data_flow
- error_flow

operation:
- parse
- validate
- normalize
- save
```

#### Restaurant Template

```text
resource:
- ingredient
- chef
- tool
- dish
- waste

node:
- prep_station
- cooking_station
- plating_station
- serving_area

connection:
- material_flow
- human_flow

operation:
- prep
- cook
- plate
- serve
```

#### Logistics Template

```text
resource:
- item
- package
- pallet
- worker
- vehicle

node:
- dock
- rack
- picking_zone
- packing_station

connection:
- material_flow
- human_flow
- vehicle_flow

operation:
- receive
- store
- pick
- pack
- ship
```

---

## 14. 개선 방향 8: Rule 개념 추가

범용 Flow Engine에서는 Rule이 매우 중요하다.

Rule 예시:

```text
재고 부족하면 실행 불가
JSON schema 검증 실패하면 error output으로 이동
온도가 80도 이상이면 다음 노드로 이동
셰프가 2명 미만이면 처리량 감소
피킹존이 가득 차면 대기
```

추천 테이블:

```text
flow_rule
```

### 역할

```text
어떤 대상에 어떤 조건과 동작을 부여하는가
```

### 적용 대상

```text
project
workflow
process
process_io
process_connection
item
inventory
run
```

---

## 15. 개선 방향 9: 상태 스냅샷 추가

실행이나 시뮬레이션을 하려면 특정 시점의 상태를 저장해야 한다.

예시:

```text
10분 시점:
- 원유 50L 남음
- 혼합 노드 대기열 3개
- 포장 노드 가동률 80%
- error_log 2건 생성
```

추천 테이블:

```text
run_state_snapshot
```

역할:

```text
특정 실행 시점의 전체 상태를 JSON 또는 구조화된 형태로 저장
```

---

## 16. 권장 개선 순서

### 1단계: 기존 테이블 유지 + 의미 재정의

테이블명을 바로 바꾸지 않고, 먼저 정의를 바꾼다.

```text
item = Resource
process = Node
process_io = Node IO
process_connection = Flow Contract
inventory = Resource Store
inventory_transaction = Resource Event
production_run = Flow Run
bom = Recipe
defect_log = Issue
quality_inspection = Validation
```

---

### 2단계: 컬럼 범용화

특히 아래 컬럼을 개선한다.

| 테이블 | 개선 포인트 |
|---|---|
| item | resource_category, resource_type 추가 |
| process | node_type, operation_type 강화 |
| process_io | io_type을 범용 분류로 확장 |
| process_connection | connection_type을 범용 흐름 타입으로 확장 |
| inventory | store_type, state_type 추가 |
| production_run | run_type, run_mode, input_snapshot, result_summary 강화 |

---

### 3단계: 빠진 Core 테이블 추가

가장 먼저 추가할 테이블:

```text
domain_template
domain_resource_type
domain_node_type
domain_connection_type
domain_operation_type
flow_rule
run_state_snapshot
```

---

### 4단계: 제조 특화 테이블을 Domain Extension으로 분리

다음 테이블은 Core가 아니라 Manufacturing Extension으로 분류한다.

```text
bom_header
bom_line
equipment
defect_log
quality_inspection
lot_master
lot_trace
stock_alert
```

---

## 17. 개선 후 권장 아키텍처

```text
[Project Layer]
project
project_member
project_permission
project_invite
project_activity_log
project_comment
project_file
project_export

[Domain Template Layer]
domain_template
domain_resource_type
domain_node_type
domain_connection_type
domain_operation_type
domain_unit
domain_sample_flow

[Flow Model Layer]
workflow
process
process_io
process_connection
flow_rule

[Resource Layer]
item
unit_master
inventory
inventory_transaction
lot_master
lot_trace
stock_alert

[Execution Layer]
work_order
work_order_item
production_run
production_run_item
simulation_run
simulation_step
run_state_snapshot

[Validation / Issue Layer]
quality_inspection
defect_log

[Integration Layer]
cad_import_job
import_job
export_job
```

---

## 18. 장기적으로 권장하는 범용 명칭

당장 바꾸지 않아도 되지만, 장기적으로는 다음 명칭이 더 범용적이다.

| 현재 명칭 | 범용 명칭 후보 |
|---|---|
| workflow | flow |
| process | flow_node |
| process_io | node_io |
| process_connection | flow_connection |
| item | resource |
| inventory | resource_store |
| inventory_transaction | resource_event |
| bom_header | recipe |
| bom_line | recipe_resource |
| production_run | flow_run |
| production_run_item | flow_run_resource |
| work_order | execution_plan |
| work_order_item | execution_plan_resource |
| equipment | asset / executor |
| defect_log | issue_log |
| quality_inspection | validation_check |
| stock_alert | resource_alert |

---

## 19. 최종 결론

현재 테이블은 제조 MVP로는 충분히 좋은 출발점이다.

하지만 FlowMat의 목표가 생산라인뿐 아니라 소프트웨어 파이프라인, 식당 동선, 물류센터, 사무 프로세스까지 포함하는 범용 시스템이라면, 지금 단계에서 가장 중요한 것은 다음이다.

```text
1. Core와 Domain을 분리한다.
2. item을 Resource로 재정의한다.
3. process를 Node로 재정의한다.
4. process_io를 Node IO로 강화한다.
5. process_connection을 Flow Contract로 본다.
6. inventory를 Resource Store/State로 확장한다.
7. production_run을 Flow Run으로 일반화한다.
8. domain_template 계층을 추가한다.
9. flow_rule과 run_state_snapshot을 추가한다.
10. 제조 기능은 Core가 아니라 Manufacturing Template으로 분리한다.
```

핵심 문장:

> 우리는 생산라인을 만드는 것이 아니라,  
> **흐름을 설계하는 엔진**을 만든다.  
> 생산라인은 그 엔진 위에 올라가는 첫 번째 도메인 템플릿이다.

