# FlowMat Architecture Decision & Agent Handoff

> **참고 문서(동결)** · 갱신하지 않는다. 쓴 날 기준의 근거·조사이며, 현행 문서와 다르면 현행 문서가 우선한다. 지금 기준은 [docs/README.md](../../README.md), 이 폴더 안내는 [reference/README.md](../README.md).

> **먼저 읽을 것 (2026-10-02 갱신):** 확정된 결정, 아직 결정하면 안 되는 것, 다음 작업 순서는 [decision-handoff.md](../../architecture/decision-handoff.md)에 짧게 정리했다. 이 문서는 그 결정의 **논의 원문과 상세 근거**다. 2026-10-02에 사용자 수정 두 문장(Organization/Project 관계, FlowRun의 범용성)과 코드 대조 보완 다섯 가지를 아래 해당 절에 `> 2026-10-02 수정/보완` 표시로 반영했다. 두 문서가 다르면 decision-handoff.md를 따른다.

> 목적: 이 문서는 ChatGPT와 사용자 사이에서 진행된 FlowMat 아키텍처 논의를 다른 개발/설계 Agent가 그대로 이어서 읽고 판단·구현할 수 있도록 정리한 인수인계 문서다.
>
> 문서 성격:
> - 단순 요약이 아니라 **의사결정 맥락 + 현재 레포 상태 + 채택안 + 보류안 + 구현 순서 + 재검토 조건**을 포함한다.
> - 현재 기준으로 대규모 리팩토링을 지시하는 문서가 아니다.
> - 핵심은 **나중에 바꾸기 비싼 구조 결정을 지금 확정하고, 구현은 점진적으로 진행하는 것**이다.

---

# 1. 프로젝트의 최종 지향점

FlowMat은 특정 업종, 특정 제조 세그먼트, 특정 소프트웨어 세그먼트에 고정되지 않는 범용 플랫폼을 지향한다.

초기 기획은 제조 ERP/MES 성격이 강했다.

예:

```text
생산라인 설계
  ↓
BOM 연결
  ↓
생산 실행
  ↓
재고 자동 차감
  ↓
완제품 생성
  ↓
재고 부족 감지
  ↓
발주 / 알림
```

그러나 장기 지향점은 이보다 넓다.

FlowMat은 다음과 같은 서로 다른 사용 사례를 모두 지원할 수 있어야 한다.

## 제조

```text
원재료
  ↓
혼합
  ↓
가공
  ↓
검사
  ↓
완제품
  ↓
재고 / LOT / 출고
```

## 데이터 파이프라인

```text
CSV / API / Dataset
        ↓
    Transform
        ↓
    Validation
        ↓
     Dataset
```

## 소프트웨어 파이프라인

```text
Git Push
   ↓
 Test
   ↓
 Build
   ↓
 Security Scan
   ↓
 Deploy
```

## 업무 프로세스

```text
Lead
  ↓
Qualification
  ↓
Approval
  ↓
Order
  ↓
Fulfillment
```

따라서 FlowMat은 다음처럼 정의한다.

> **FlowMat은 업종을 모델링하는 제품이 아니라, 흐름을 모델링하고 실행하는 플랫폼이다.**

그리고 보다 기술적으로는:

> **FlowMat Core는 자원 또는 데이터가 그래프의 Port를 통해 Node를 이동하고, 각 Node의 실행 결과와 이력을 추적하는 범용 Workflow Execution Platform이다.**

---

# 2. 제품 정체성

FlowMat을 아래처럼 정의하지 않는다.

```text
ERP with a diagram editor
```

또는:

```text
MES with a pretty canvas
```

최종 정체성은 다음에 가깝다.

```text
Visual Workflow Modeling
        +
Generic Execution Engine
        +
Resource / Data Flow
        +
Pluggable Domain Capabilities
```

한국어로는:

> **도메인 독립형 시각적 흐름 설계·실행 플랫폼**

---

# 3. 현재 GitHub 레포 기준 확인 사항

검토 대상:

```text
Repository: SeolJhin/FlowMat
Branch: main
검토 당시 HEAD: 6c383d4a464ba128d8cac9a86168cba00ed9fdd5
```

Canonical application:

```text
flowmat_backend
flowmat_frontend
```

`legacy`는 신규 구현 기준이 아니다.

현재 backend 주요 bounded context:

```text
bom
catalog
flowrun
inventory
payment
production
project
quality
rule
user
workflow
```

중요한 사실은 `flowrun` 공통 실행 도메인이 이미 존재한다는 것이다.

현재 확인된 범용 실행 구조:

```text
Workflow
 ├─ WorkflowRevision
 ├─ Process
 ├─ ProcessIo
 └─ ProcessConnection

             ↓ execute

FlowRun
 ├─ FlowRunStep
 ├─ FlowRunStepAttempt
 └─ FlowRunEvent
```

또 제조 실행은 현재 `ProductionRun`과 연결된다.

```text
ProductionRun
 ├─ ProductionRunItem
 ├─ InventoryTransaction
 └─ LotTrace
```

따라서 **새로운 범용 실행 엔진을 별도로 만들지 않는다.**

이미 존재하는:

```text
workflow = Definition Core
flowrun  = Execution Core
```

를 범용 Core로 성장시키는 방향을 채택한다.

---

# 4. 기존 아키텍처 문서에서 이미 확인된 방향

현재 레포에는 다음 문서가 존재한다.

```text
docs/architecture/README.md
docs/archive/2026-09-architecture/domain-roadmap.md
docs/archive/2026-09-architecture/enterprise-domain-map.md
docs/archive/2026-09-architecture/execution-model.md
docs/domain/inventory-bom-lot-contract.md
docs/archive/2026-09-handoff/flowmat-audit-2026-09-24.md
```

이미 확인된 핵심 원칙:

1. `erp/`, `mes/`, `scm/`, `wms/` 같은 거대한 신규 패키지를 만들지 않는다.
2. Definition과 Execution을 분리한다.
3. Resource Flow를 명시한다.
4. 제조 특화 기능이 범용 그래프/실행 코어를 오염시키지 않게 한다.
5. 계약 우선으로 설계한다.
6. 기존 Inventory/BOM/LOT 계약을 존중한다.
7. Process는 설계이며 실제 실행 상태는 별도 Run 모델에 저장한다.
8. Simulation과 actual execution은 같은 Definition을 사용할 수 있으나 side effect는 달라야 한다.

이 대화의 결론은 이 기존 방향을 뒤집는 것이 아니라, **더 명확하게 일반화하고 확정하는 것**이다.

---

# 5. 현재 가장 중요한 결정

지금 전면 구현할 것보다 먼저 정해야 할 구조적 결정은 세 가지다.

| 결정 | 지금 확정 | 지금 전면 구현 |
|---|---:|---:|
| Organization / Project 소속 구조 | O | 일부 |
| 모듈 간 의존 규칙 | O | 점진 적용 |
| 범용 Port / Resource 계약 | O | 최소 변경 |
| Outbox / Event Bus | X | X |
| Microservice | X | X |
| ERP 전체 기능 | X | X |

---

# 6. 의사결정 시나리오 정리

사용자가 제시한 확장 시나리오는 다음과 같았다.

## 시나리오 1 — Project만 유지

현재처럼 모든 데이터의 중심을 Project로 두고 기능을 확장한다.

장점:
- MVP 빠름
- 현재 구조 그대로 유지 가능

위험:
- 여러 회사/사업장/부서/고객사가 들어오면 데이터 소유권과 접근 권한을 다시 나눠야 함
- 나중에 다수 테이블 migration 가능성 큼

채택 조건:
- 단일 회사
- 단일 사업장
- 소수 사용자
- 멀티테넌시 계획 없음

### 현재 판단

장기안으로는 채택하지 않는다.

---

## 시나리오 2 — 회사·사업장·프로젝트를 먼저 확정

조직과 소유권 경계를 먼저 정하고 기존 기능은 단계적으로 연결한다.

장점:
- ERP/CRM 확장 시 소유권 기준이 명확해짐
- 권한 모델 확장 가능

위험:
- 조직 계층을 너무 제조 중심으로 만들 수 있음
- `회사 → 사업장 → 프로젝트`를 강제하면 개발/데이터 프로젝트에 부자연스러움

### 현재 판단

**의도는 채택하되, 구조는 변형한다.**

고정 구조:

```text
Company
  ↓
Factory
  ↓
Project
```

는 사용하지 않는다.

대신:

```text
Organization
      │
      ├─ Project
      ├─ Site
      └─ BusinessPartner
```

를 채택한다.

---

## 시나리오 3 — 모든 것을 하나의 Resource 모델로 통합

예:

```text
Resource
 ├─ Item
 ├─ File
 ├─ Dataset
 ├─ API
 ├─ Energy
 └─ Water
```

장점:
- 단일 추상화
- 공통 엔진과 계약을 넓게 공유 가능

위험:
- 제조의 재고/LOT/수량/단위 규칙과 데이터의 스키마/API/File 규칙이 충돌
- nullable field가 많은 거대한 슈퍼테이블이 되기 쉬움
- 이미 잘 구현된 제조 Item/Inventory/LOT/BOM을 흔들 가능성 큼

### 현재 판단

**지금은 채택하지 않는다.**

단, 나중에 실제 중복이 확인되면 일부 공통 계약은 흡수할 수 있다.

---

## 시나리오 4 — 공통 Workflow Engine 유지 + 도메인 자원 모델 분리

공통 부분:

```text
Workflow
Revision
Node
Port
Connection
Rule
FlowRun
Step
Attempt
Event
History
```

도메인별 분리:

```text
Manufacturing:
Item
LOT
Inventory
BOM
Equipment
Quality

Data:
Dataset
File
API
Schema
Artifact

Software:
Repository
Build
Deployment
Environment

Business:
Customer
Supplier
Lead
Order
Ticket
```

장점:
- 범용 Core 유지
- 한 도메인의 특수 규칙이 다른 도메인을 오염시키지 않음
- 현재 FlowMat 구조와 잘 맞음

### 현재 판단

**핵심 아키텍처 방향으로 채택한다.**

---

# 7. 최종 선택

현재 FlowMat의 방향은 다음 조합이다.

```text
조직/소유권 측면
    → 시나리오 2의 변형

Workflow / Execution 측면
    → 시나리오 4

Resource 통합
    → 시나리오 3은 보류
```

요약:

> **2 + 4로 시작하고, 실제 중복이 확인될 때만 3의 일부를 흡수한다.**

---

# 8. ADR-001 — Organization / Project / Site / Partner

## 현재 문제

현재 Project가 동시에 너무 많은 의미를 가진다.

```text
Project =
협업 공간
+
권한 경계
+
Tenant 유사 역할
+
업무 데이터 소속
```

현재 Project 엔티티는 사실상 다음과 같다.

```text
Project
- projectId
- projectName
- ownerId
- projectDesc
- projectStatus
- visibility
- currentWorkflowId
```

대부분 도메인 데이터가 `projectId`로 격리된다.

이 구조는 지금은 유효하지만, 다음 상황에서 부족해진다.

```text
ABC전자

수원공장
화성공장

고객
 ├─ 삼성전자
 └─ LG전자

공급사
 ├─ A화학
 └─ B물류

프로젝트
 ├─ PCB Line 개선
 ├─ 품질 개선
 └─ 데이터 분석
```

---

# 9. 고정 계층을 피하는 이유

다음 구조는 채택하지 않는다.

```text
Company
  ↓
Factory
  ↓
Project
```

이유:

FlowMat은 제조 전용이 아니기 때문이다.

예:

```text
게임 개발사
 └─ Backend CI Pipeline
```

또는:

```text
대학교 연구실
 └─ 유전체 분석 Workflow
```

이 경우 Factory가 필요 없다.

---

# 10. 채택 구조

```text
User
 │
 ▼
Organization
 │
 ├──────────────┐
 │              │
 ▼              ▼
Project        Site
 │
 │              ├─ Factory
 │              ├─ Warehouse
 │              ├─ Office
 │              ├─ Lab
 │              └─ Data Center
 │
 └──── Project ↔ Site
```

그리고 별도:

```text
Organization
      │
      ▼
BusinessPartner
 ├─ customer
 ├─ supplier
 ├─ logistics
 ├─ outsourcing
 └─ mixed
```

---

# 11. Organization 의미

> 2026-10-02 수정 (사용자): **Organization은 상위 소유 및 계정 그룹 경계이고, Project는 현재의 데이터 격리 및 접근권한 집행 경계다. Organization membership은 별도 정책이 도입되기 전까지 Project 접근권한을 암묵적으로 부여하지 않는다.**
>
> (이전 문장 "Organization은 최상위 소유/Tenant 경계다"를 대체한다. Tenant 격리 정책은 아직 정하지 않았다.)

반드시 법인일 필요는 없다.

예:

```text
설진웅 개인 Workspace
ABC전자
FlowMat Inc.
서울대학교 연구실
```

예상 모델:

```text
organization
-------------
organization_id
organization_name
organization_type
status
created_at
updated_at
```

---

# 12. OrganizationMember

예상 모델:

```text
organization_member
-------------------
organization_member_id
organization_id
user_id
role
status
joined_at
```

권한 예:

```text
OWNER
ADMIN
MEMBER
VIEWER
```

> 2026-10-02 보완: 지금 Project 접근은 `ProjectAccessService`의 프로젝트 멤버십(viewer/editor/owner)과 시스템 역할로만 판정한다. 위 조직 역할은 Phase 1~3에서 **프로젝트 접근에 영향을 주지 않는다**(조직 ADMIN이라도 그 조직의 프로젝트를 자동으로 볼 수 없다). 이렇게 해야 backfill 때 권한이 바뀌지 않는다. 상속 여부는 별도 ADR로 정한다.

---

# 13. Project의 의미

Project는 제거하지 않는다.

중요:

> **Project는 계속 실질적인 작업 공간 및 데이터 격리 경계로 사용한다.**

추가:

```text
project.organization_id
```

관계:

```text
Organization
     │
     ├─ Project A
     ├─ Project B
     └─ Project C
```

---

# 14. 절대 하지 말 것 — 모든 project_id 교체

현재:

```text
Inventory → project_id
Item      → project_id
Workflow  → project_id
Run       → project_id
```

를 그대로 유지한다.

당장 전부:

```text
organization_id
```

로 바꾸지 않는다.

Organization은 다음처럼 추적한다.

```text
Inventory
  ↓
Project
  ↓
Organization
```

핵심:

> **Organization은 상위 소유 및 계정 그룹 경계이고, Project는 현재의 데이터 격리 및 접근권한 집행 경계다. Organization membership은 별도 정책이 도입되기 전까지 Project 접근권한을 암묵적으로 부여하지 않는다.** (2026-10-02 사용자 수정)

---

# 15. Site

Site는 물리적 장소다.

예:

```text
site
----
site_id
organization_id
site_name
site_type
```

site_type 예:

```text
FACTORY
WAREHOUSE
OFFICE
LAB
DATA_CENTER
ETC
```

Project 아래에 강제로 두지 않는다.

대신 optional 관계:

```text
project_site
------------
project_id
site_id
```

예:

제조:

```text
ABC전자
 └─ 프로젝트: 생산라인 개선
       ├─ 수원공장
       └─ 화성공장
```

개발:

```text
ABC전자
 └─ AI 데이터 파이프라인
       └─ Site 없음
```

---

# 16. BusinessPartner

Customer와 Supplier를 처음부터 별도 상위 모델로 분리하지 않는다.

공통:

```text
business_partner
----------------
partner_id
organization_id
partner_name
partner_type
business_no
contact_name
email
phone
status
```

partner_type:

```text
CUSTOMER
SUPPLIER
LOGISTICS
OUTSOURCING
MIXED
OTHER
```

필요 시:

```text
project_partner
---------------
project_id
partner_id
role
```

---

# 17. Organization Migration 전략

전면 migration이 아니라 단계적으로 한다.

## Phase 1

새 테이블만 추가.

```text
organization
organization_member
```

그리고:

```text
project.organization_id NULL
```

추가.

---

## Phase 2

기존 사용자에게 Personal Organization 자동 생성.

예:

```text
User: jinung

→

Organization:
  "Jinung's Workspace"
```

기존 Project를 해당 Organization에 연결.

---

## Phase 3

backfill 완료 후:

```text
project.organization_id NOT NULL
```

검토.

---

## Phase 4

실제 요구가 생겼을 때만:

```text
site
business_partner
project_site
project_partner
```

도입.

---

# 18. ADR-002 — 모듈 경계

현재 주요 기술 부채:

> 다른 bounded context의 Repository를 직접 import하는 코드가 존재한다.

실제 확인 예:

```text
production
 → catalog.repository

inventory
 → catalog.repository
```

그리고 현재 `ProductionFlowRunAdapter`도:

```text
production
 → FlowRunRepository
```

를 직접 사용한다.

현재 monolith에서는 동작하지만 장기적으로:

```text
A → B
A → C
B → C
C → A
D → A
D → B
```

같은 결합으로 갈 수 있다.

---

# 19. 최종 모듈 규칙

## Rule 1

> **Repository는 자기 bounded context 내부에서만 사용한다.**

금지:

```java
package production;

import catalog.repository.ItemRepository;
```

허용:

```java
package production;

import catalog.application.publicapi.CatalogQuery;
```

---

# 20. 권장 모듈 구조

장기적으로:

```text
catalog
 ├─ api
 ├─ application
 │    ├─ publicapi
 │    └─ internal
 ├─ domain
 └─ repository
```

외부 도메인은:

```text
application.publicapi
```

를 통해서만 접근한다.

---

# 21. Production → Catalog 예

현재:

```text
Production
    ↓
ItemRepository
    ↓
Item Entity
```

목표:

```text
Production
    ↓
CatalogQuery
    ↓
Catalog Application
    ↓
ItemRepository
```

외부에 Entity를 직접 넘기기보다 immutable DTO/View 사용.

예:

```text
CatalogItemView

itemId
itemName
unitId
resourceType
lotManaged
status
```

---

# 22. Production → FlowRun 예

현재:

```text
ProductionFlowRunAdapter
       ↓
FlowRunRepository
```

목표:

```text
Production
    ↓
FlowRunCommand
    ↓
FlowRun Application
    ↓
FlowRunRepository
```

예:

```text
startLinkedRun(...)
finishLinkedRun(...)
failLinkedRun(...)
```

Production은 FlowRun 저장 구현을 몰라야 한다.

---

# 23. 동기 호출 vs Event

모든 걸 Event로 바꾸지 않는다.

즉시 결과가 필요하면:

```text
Production
   ↓ synchronous
CatalogQuery
```

사건을 알리는 목적이면:

```text
ProductionRunFinished
```

같은 Domain Event 사용.

정리:

```text
Query / Command = 지금 결과 필요
Event           = 사건 전달
```

---

# 24. Outbox 도입 시점

지금 만들지 않는다.

다음이 실제 발생하면 도입 검토:

```text
Kafka
RabbitMQ
외부 ERP
외부 CRM
외부 Webhook
별도 서비스 프로세스
```

그 전에는 modular monolith + transaction + application service로 충분하다.

---

# 25. ArchUnit 전략

기존 위반을 한 번에 전부 수정하지 않는다.

## Stage A

신규 코드부터:

```text
other-domain.repository import 금지
```

기존 위반은 baseline/freeze.

---

## Stage B

기존 코드 수정 시:

```text
Repository 직접 접근
        ↓
Public Application API
```

로 교체.

---

## Stage C

충분히 정리된 뒤:

```text
다른 domain의 Entity 직접 import 금지
```

까지 확대.

최종:

```text
Domain A

→ Domain B application.publicapi  O

→ Domain B repository             X

→ Domain B internal entity        X
```

---

# 26. ADR-003 — Resource / ProcessIo / Port Contract

초기 직관:

```text
Resource
 ├─ Item
 ├─ File
 ├─ Dataset
 ├─ API
 ├─ Energy
 └─ Water
```

를 하나로 합치는 구조.

현재는 채택하지 않는다.

---

# 27. 하나의 Resource 슈퍼모델을 만들지 않는 이유

1. Item/Inventory/LOT/BOM이 이미 깊게 구현됨
2. File과 Milk는 lifecycle이 다름
3. Dataset과 Inventory는 검증 규칙이 다름
4. Resource 테이블이 nullable column 덩어리가 되기 쉬움
5. 도메인 의미가 오히려 사라질 수 있음

핵심:

> **공통화는 실제 의미가 같은 곳에서만 한다. 이름이 비슷하다는 이유로 데이터를 합치지 않는다.**

---

# 28. 현재 ProcessIo

현재 확인된 ProcessIo 필드:

```text
processId
itemId
ioName
direction
ioType
role
resourceType
quantity
unit
formula
schemaJson
validationRule
colorScheme
requiredYn
allowShortageYn
```

이미 범용 Port Contract로 발전시킬 수 있는 형태다.

---

# 29. ProcessIo의 공식 의미

`ProcessIo`는 다음으로 정의한다.

> **Process가 받아들이거나 만들어내는 Port Contract**

즉:

```text
Process
   │
   ├── INPUT Port
   ├── INPUT Port
   └── OUTPUT Port
```

각 Port의 definition이 ProcessIo다.

---

# 30. resourceType

`resourceType`은 Port를 통해 흐르는 대상의 의미다.

초기 표준 후보:

```text
material
product
energy
water
waste

file
data
api
parameter
signal

generic
```

DB enum으로 강하게 고정하는 것은 피하고, Java enum 또는 validation allow-list를 우선 검토한다.

> 2026-10-02 보완 (기존 값 호환): 지금 `resourceType`은 자유 문자열이고, 비우면 `ioType`(기본 `material`)이 들어간다. 2026-10-02 세션 DB의 포트 14개는 모두 `material`이었다. allow-list를 넣을 때 목록 밖 값은 **거절하지 않고 경고**로 처리한다(포트 검증의 `UNIT_UNKNOWN` 경고와 같은 방식). 그래야 저장된 그래프와 발행 revision이 깨지지 않는다.

---

# 31. itemId의 공식 의미

매우 중요.

`itemId`는 범용 Resource ID가 아니다.

다음으로 정의한다.

> **이 Port가 Catalog Item과 연결되어 있을 경우 사용하는 optional binding**

예:

## 제조

```text
resourceType = material
itemId       = RAW_MILK_001
quantity     = 100
unit         = L
```

## 데이터

```text
resourceType = data
itemId       = null
schemaJson   = {...}
```

## File

```text
resourceType = file
itemId       = null
schemaJson   = {...}
```

## API

```text
resourceType = api
itemId       = null
schemaJson   = {...}
```

---

# 32. schemaJson 의미

`schemaJson`은 실행 데이터 저장 공간이 아니다.

정의 시점 계약이다.

예:

```json
{
  "type": "object",
  "properties": {
    "userId": {"type":"string"},
    "score": {"type":"number"}
  }
}
```

실제 실행값은:

```text
FlowRunStep.inputSnapshot
FlowRunStep.outputSnapshot
```

에 저장한다.

---

# 33. 3-Layer 모델

```text
ProcessIo
Definition
"무엇이 들어와야 하는가?"
           │
           ▼
FlowRunStep
Execution
"실제로 무엇이 들어왔는가?"
           │
           ▼
Domain Adapter
Side Effect
"이 실행이 현실 세계에서 무엇을 바꾸는가?"
```

---

# 34. 제조 실행 예

Definition:

```text
[혼합 Process]

INPUT
- 원유 100 L
- 파우더 2 kg
- 전기

OUTPUT
- 혼합유 101 kg
- 폐수 1 L
```

Port 예:

```text
원유:
resourceType = material
itemId = RAW_MILK

파우더:
resourceType = material
itemId = POWDER

전기:
resourceType = energy
itemId = null

혼합유:
resourceType = product
itemId = MIXED_MILK
```

Execution:

```text
FlowRun

Step: Mixing

InputSnapshot
- milk = 98.2 L
- powder = 2.1 kg
- energy = 12.8 kWh
```

actual run이면 제조 adapter가:

```text
milk inventory -98.2
powder inventory -2.1
mixed milk inventory +99.5
LOT trace 생성
```

simulation이면:

```text
Inventory 변경 X
LOT 변경 X
예상 소비량 저장
예상 산출량 저장
병목 분석
```

---

# 35. 데이터 파이프라인 예

```text
CSV
 ↓
Filter
 ↓
Transform
 ↓
ML Model
 ↓
Dataset
```

이 경우:

```text
Item 없음
Inventory 없음
LOT 없음
BOM 없음
ProductionRun 없음
```

그러나:

```text
WorkflowRevision
ProcessIo
ProcessConnection
FlowRun
FlowRunStep
FlowRunStepAttempt
FlowRunEvent
```

만으로 실행 가능해야 한다.

이것이 범용 Core의 중요한 검증 조건이다.

---

# 36. 소프트웨어 파이프라인 예

```text
Git Push
    ↓
Test
    ↓
Build
    ↓
Security Scan
    ↓
Deploy
```

각 Node가 사용하는 domain capability는 다를 수 있다.

예:

```text
Repository
Build Artifact
Deployment
Environment
```

하지만 Core는 동일하게:

```text
Workflow
Node
Port
Connection
Rule
FlowRun
Step
Attempt
Event
Snapshot
```

을 사용한다.

---

# 37. CRM / SCM / Manufacturing 통합 Flow 예

예:

```text
[고객 주문]
      ↓
[생산계획]
      ↓
[BOM 계산]
      ↓
[생산]
      ↓
[품질검사]
      ↓
[재고]
      ↓
[출고]
```

이는 실제로:

```text
CRM
 ↓
SCM
 ↓
Manufacturing
 ↓
Quality
 ↓
Inventory
```

여러 도메인을 관통하는 하나의 Workflow다.

FlowMat의 강점은 바로 이 **도메인 간 Flow 실행**에 있다.

---

# 38. Core와 Domain의 구분

## FlowMat Core

```text
Organization / Workspace
Project
Workflow
WorkflowRevision
Node / Process
Port / ProcessIo
Connection
Rule
FlowRun
FlowRunStep
Attempt
Event
Snapshot
History
```

## Manufacturing Domain

```text
Item
Inventory
LOT
BOM
Equipment
QualityInspection
WorkOrder
ProductionRun
```

## Data Domain

```text
Dataset
File
Schema
API
Transformation
Artifact
Model
```

## Software Domain

```text
Repository
Build
Artifact
Deployment
Environment
```

## Business Domain

```text
Customer
Supplier
Lead
Opportunity
Order
Ticket
Partner
```

---

# 39. Domain Package 원칙

다음 대형 패키지는 만들지 않는다.

```text
domain/erp
domain/mes
domain/scm
domain/wms
```

대신 기능 책임 단위로 둔다.

현재 구조:

```text
domain/
├─ workflow/
├─ flowrun/
├─ catalog/
├─ bom/
├─ production/
├─ inventory/
├─ quality/
├─ project/
├─ user/
├─ rule/
└─ payment/
```

를 존중한다.

향후 새로운 기능도 책임 경계가 명확할 때만 새 bounded context를 만든다.

---

# 40. FlowRun의 의미

중요한 결정:

> **FlowRun은 Manufacturing Run이 아니다.**

> 2026-10-02 수정 (사용자): **FlowRun을 장기적으로 도메인 독립적인 실행 Core로 사용한다. 현재 구조는 이를 지원할 기반을 갖추고 있으나, 비제조 vertical slice가 검증될 때까지 범용 실행 능력은 아키텍처 목표로 취급한다.**
>
> 즉 아래 "Generic Execution Runtime"은 방향이며, 아직 증명된 사실이 아니다. 검증 방법은 §45의 2026-10-02 보완을 따른다.

FlowRun은:

```text
Generic Execution Runtime
```

이다.

`ProductionRun`은 제조 확장이다.

개념적으로:

```text
FlowRun = Generic Execution

ProductionRun = Manufacturing Extension
```

현재 `FlowRun.productionRunId` 같은 연결 필드는 호환/연결 용도로 볼 수 있다.

당장 DB 관계를 뒤집지 않는다.

의미를 지금 확정하고 구현은 점진적으로 맞춘다.

---

# 41. 목표 Domain Map

```text
                         FlowMat

              Visual Flow Modeling Platform
                          │
          ┌───────────────┴────────────────┐
          │                                │
   Definition Engine                Execution Engine
          │                                │
     Workflow                         FlowRun
     Revision                         Step
     Node                             Attempt
     Port                             Event
     Connection                       Snapshot
     Rule                             Lineage
          │                                │
          └───────────────┬────────────────┘
                          │
                    Domain Binding
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
 Manufacturing          Data             Business
        │                 │                 │
 Item                  Dataset           CRM
 BOM                   File              SCM
 Inventory             API               Order
 LOT                   Model             Partner
 Equipment             Code              Ticket
 Quality               Artifact          ...
```

---

# 42. Port + Binding 철학

범용성을 얻기 위해 거대한 Resource Entity를 만들기보다, 핵심 추상화를:

```text
Port + Binding
```

으로 본다.

Core 관점:

```text
PORT
   │
   ▼
BINDING
   │
   ▼
DOMAIN OBJECT
```

예:

```text
bindingType = ITEM
bindingId   = ITEM_001
```

또는:

```text
bindingType = DATASET
bindingId   = DATASET_001
```

또는:

```text
bindingType = API
bindingId   = API_001
```

주의:

- 지금 바로 polymorphic `binding_id` 테이블을 만들라는 뜻이 아니다.
- 개념적 방향을 이렇게 잡는다는 뜻이다.
- 실제 DB 설계는 실사용 검증 후 결정한다.

---

# 43. 지금 당장 Resource 슈퍼테이블을 만들지 않는 이유

범용 시스템의 목표와 “모든 데이터를 한 테이블에 합치는 것”은 다르다.

범용성을 얻는 방식:

```text
공통 실행 의미
공통 Port Contract
공통 History
공통 Graph
```

도메인별로 유지할 것:

```text
제조 수량 규칙
LOT
재고
BOM
데이터 스키마
API 계약
파일 메타데이터
Git Repository
CRM Lead 상태
```

---

# 44. 현재 레포에서 이미 좋은 기반

현재 `ProcessIo`에 이미:

```text
resourceType
schemaJson
validationRule
itemId
```

가 있다.

현재 `FlowRunStep`에 이미:

```text
inputSnapshot
outputSnapshot
sourceConnectionId
sourceStepId
status
sequenceNo
```

등이 있다.

즉 지금 필요한 것은 거대한 새 Core가 아니라:

1. 의미 확정
2. 모듈 경계 강화
3. 실제 비제조 Flow 검증

이다.

---

# 45. 첫 번째 비제조 수직 기능 검증

추천 PoC/Vertical Slice:

```text
[Sample JSON / CSV]
        ↓
[Transform]
        ↓
[Schema Validation]
        ↓
[Result Preview]
```

성공 조건:

```text
Item 없음
Inventory 없음
LOT 없음
BOM 없음
ProductionRun 없음
```

그러나:

```text
WorkflowRevision
ProcessIo
ProcessConnection
FlowRun
FlowRunStep
Attempt
Event
```

만으로 정상 실행되어야 한다.

이 테스트가 성공하면:

> `workflow + flowrun`이 실제로 제조 독립적인 Core라는 것이 증명된다.

> 2026-10-02 보완 (범위 정정): 지금 Flow Run은 **노드를 스스로 실행하지 않는다.** 외부(API 호출자)가 단계를 `start`/`complete`하며 결과를 보고해야 진행되고, Transform을 수행할 실행기가 없다. 결과값을 포트 스키마·검증식으로 검사하고 연결 조건으로 다음 단계를 고르는 것은 이미 된다. 그래서 둘로 나눈다.
>
> - **(a) 외부 실행자 보고 방식의 통합 테스트** — 지금 가능하다. 테스트가 Transform 결과를 단계 출력으로 보고하고, Core가 Item·Inventory·LOT·BOM·ProductionRun 없이 검증·라우팅·이력을 처리하는지 확인한다. "Core가 제조 독립적인가"는 이것으로 증명한다.
> - **(b) 노드 종류별 실제 실행기** — 별도 ADR이 필요한 큰 작업이다. FM-RUN-005(실행 정책: 시간 제한·재시도 간격·동시 실행 제한)와 함께 정한다.

---

# 46. 테스트 시나리오 3개

## Test A — Manufacturing Actual

```text
Material → Process → Product
```

expected:

```text
Inventory 변경 O
LOT Trace O
Production domain 사용 O
```

---

## Test B — Manufacturing Simulation

동일 Workflow.

expected:

```text
Inventory 변경 X
LOT 변경 X
FlowRun/Step 기록 O
```

---

## Test C — Data Flow

```text
File → Transform → Data
```

expected:

```text
Item 없음
Inventory 없음
LOT 없음
ProductionRun 없음

FlowRun 성공
Step/Attempt/Event 성공
Schema validation 가능
```

---

# 47. 구현 우선순위

## Phase 0 — Architecture Freeze

먼저 ADR 작성.

추천:

```text
ADR-Organization-Boundary
ADR-Module-Dependency
ADR-Resource-Port-Contract
```

---

## Phase 1 — Module Boundary Reference Implementation

첫 코드 리팩토링 후보:

```text
ProductionFlowRunAdapter
```

현재:

```text
Production
→ FlowRunRepository
```

변경:

```text
Production
→ FlowRunCommand
→ FlowRun Application
→ FlowRunRepository
```

이 변경을 앞으로 cross-domain 호출의 표준 예제로 사용한다.

---

## Phase 2 — ArchUnit

새 cross-domain Repository import를 막는다.

기존 위반은 baseline 처리.

목표:

```text
신규 Repository 침범 0
```

---

## Phase 3 — Organization 최소 도입

추가:

```text
organization
organization_member
project.organization_id
```

기존 Project를 자동 backfill.

---

## Phase 4 — Resource/Port 계약 정리

대규모 DB 변경 없이:

```text
resourceType 표준화
itemId optional binding 규칙
schemaJson 의미 확정
validationRule 역할 확정
```

---

## Phase 5 — Data Vertical Slice

비제조 Flow를 실제 기존 `workflow + flowrun` 위에서 실행.

---

## Phase 6 — 필요 시 Site / Partner

실제 ERP/CRM/SCM 기능이 들어올 때:

```text
site
business_partner
project_site
project_partner
```

도입.

---

## Phase 7 — 첫 외부 연동

첫 실제 비동기 외부 시스템 연동 시:

```text
integration
connector
mapping
job
```

검토.

그 시점에:

```text
Domain Event
+
Transactional Outbox
+
Retry / Idempotency
```

도입.

---

# 48. 지금 하지 말 것

## 1. 전면 리팩토링

하지 않는다.

---

## 2. 모든 project_id → organization_id 변경

하지 않는다.

---

## 3. Resource 슈퍼테이블

지금 만들지 않는다.

---

## 4. Microservice

하지 않는다.

---

## 5. Kafka / RabbitMQ

필요 전까지 만들지 않는다.

---

## 6. 모든 cross-domain Repository 참조 일괄 수정

하지 않는다.

신규부터 막고 기존은 건드릴 때 정리.

---

## 7. ERP 전체

다음과 같은 전사 기능을 지금부터 전부 구현하지 않는다.

```text
GL
AR
AP
Payroll
Tax
Accounting
```

필요한 capability부터 추가한다.

---

## 8. Editor 전체 교체

현재의 공정 캔버스 + 도형 엔진 이중 구조를 무조건 갈아엎지 않는다.

에디터는 Core Definition을 시각화하는 계층으로 유지한다.

---

# 49. 제품 모듈/프로필 철학

새 프로젝트 생성 시 업종을 서버 구조에 박지 않는다.

예:

```text
What are you building?

○ Blank Workflow
○ Manufacturing
○ Warehouse / Logistics
○ Data Pipeline
○ Software Pipeline
○ Business Process
```

이 선택은 별도 제품을 만드는 것이 아니다.

활성화되는 것:

```text
Node Template
Domain Module
Validation Rule
UI Preset
```

사용자는 나중에 여러 capability를 함께 사용할 수 있어야 한다.

예:

```text
Manufacturing
+
Data
+
CRM
```

---

# 50. 핵심 Architecture Invariant

앞으로 PR/설계 리뷰 시 아래를 기준으로 삼는다.

## Invariant 1

> **Organization은 상위 소유 및 계정 그룹 경계이고, Project는 현재의 데이터 격리 및 접근권한 집행 경계다. Organization membership은 별도 정책이 도입되기 전까지 Project 접근권한을 암묵적으로 부여하지 않는다.** (2026-10-02 사용자 수정)

## Invariant 2

> **다른 bounded context의 Repository에 직접 접근하지 않는다.**

## Invariant 3

> **ProcessIo는 Port Contract이고, FlowRunStep은 실제 실행값이다.**

## Invariant 4

> **Item은 범용 Resource 그 자체가 아니라 제조/Catalog Domain binding 중 하나다.**

## Invariant 5

> **FlowRun은 범용 실행이고 ProductionRun은 제조 확장이다.** 단, 범용 실행 능력은 비제조 vertical slice가 검증될 때까지 아키텍처 목표로 취급한다(2026-10-02 사용자 수정, §40).

## Invariant 6

> **Core에는 업종 개념을 넣지 않는다. 업종 개념은 Domain Extension으로 둔다.**

## Invariant 7

> **공통화는 의미가 실제로 같은 곳에서만 한다.**

---

# 51. 재검토 조건

다음 조건이 발생하면 설계를 다시 검토한다.

## Organization

여러 회사/조직/사업장에서 쓰기로 확정되면:

```text
Organization / Tenant 정책
권한 상속
Site 관계
Partner 관계
```

를 구현 수준으로 확정.

---

## Resource

두 종류 이상의 비제조 데이터 흐름에서:

```text
동일 Resource validation
동일 lifecycle
동일 실행 의미
```

가 반복되면 공통 Resource contract를 재검토.

---

## Module Boundary

새 기능에서도 cross-domain Repository 참조가 계속 생기면:

```text
ArchUnit 강화
public application API 확대
Entity 직접 참조 금지
```

를 진행.

---

## Outbox

외부 시스템과 비동기 동기화가 시작되면:

```text
Outbox
Retry
Dead-letter
Idempotency
Replay
```

를 함께 도입.

---

## Microservice

다음이 실제 병목이 될 때만 검토:

```text
독립 배포 필요
독립 확장 필요
팀 소유권 분리
장애 격리 필요
릴리즈 주기 충돌
```

---

# 52. Agent가 구현 전 반드시 확인할 것

다음 작업을 시작하기 전에 항상 최신 main 확인.

특히 migration 번호는 절대 문서 기준으로 고정하지 않는다.

검토 당시 migration은 V40까지 존재했다.

예상 후보로:

```text
V41__organization_boundary.sql
```

같은 이름을 생각할 수 있으나, 실제 구현 시작 전에:

```text
git pull
latest migration 확인
```

후 번호를 배정한다.

> 2026-10-02 보완: V41은 이미 `V41__project_holiday.sql`(프로젝트 휴일)이 쓰고 있다. 조직 마이그레이션은 V42 이후의 그때 빈 번호를 쓴다. 적용된 마이그레이션은 주석·공백까지 수정하지 않는다.

---

# 53. Agent 작업 규칙

새 기능 또는 리팩토링을 수행하는 Agent는 먼저 아래 질문에 답해야 한다.

```text
1. 이 기능은 Core인가 Domain인가?
2. Definition인가 Execution인가?
3. Project boundary가 필요한가?
4. Organization ownership과 관련 있는가?
5. immutable snapshot이 필요한가?
6. inventory side effect가 있는가?
7. idempotency가 필요한가?
8. ProcessIo와 연결되는가?
9. FlowRun과 연결되는가?
10. simulation에서도 사용할 수 있는가?
11. audit/history가 필요한가?
12. 다른 bounded context의 Repository를 직접 참조하는가?
13. 이 기능은 제조 외 도메인에서도 동일 의미인가?
14. 공통화가 실제 의미를 공유해서 필요한가, 아니면 이름만 비슷한가?
```

---

# 54. Agent용 금지 규칙

Agent는 다음을 임의로 수행하지 않는다.

```text
- domain/erp 패키지 신설
- domain/mes 패키지 신설
- domain/scm 패키지 신설
- domain/wms 패키지 신설
- 모든 도메인을 Resource 슈퍼테이블로 통합
- 모든 project_id를 organization_id로 치환
- microservice 분리
- Kafka/RabbitMQ 도입
- 기존 cross-domain 참조 전수 리팩토링
- editor 전면 교체
- 제조 기능을 Core로 끌어올리기
```

위 작업은 별도 ADR과 실사용 근거가 있어야 한다.

---

# 55. 핵심 철학 3문장

ADR 첫 페이지에 두어도 되는 문장.

> **FlowMat은 업종을 모델링하지 않는다. FlowMat은 흐름을 모델링한다.**

> **업종의 개념은 Core가 아니라 Domain Extension으로 표현한다.**

> **공통화는 의미가 실제로 같은 곳에서만 한다. 이름이 비슷하다는 이유로 데이터를 합치지 않는다.**

---

# 56. 최종 판단

지금 당장 대규모 리팩토링을 승인하지 않는다.

대신 지금 확정할 것:

```text
1. Organization / Project 소유권 경계
2. Workflow/FlowRun을 범용 Core로 보는 의미
3. ProcessIo를 Port Contract로 보는 의미
4. Item을 optional domain binding으로 보는 의미
5. cross-domain Repository 금지 원칙
6. 제조 자원과 데이터 자원의 Domain Model 분리
```

그다음 신규 기능부터 이 원칙을 적용한다.

---

# 57. 당장 권장하는 첫 작업

가장 먼저 실행할 PR 후보:

```text
[1] ADR 3개 추가
[2] ArchUnit baseline 구성
[3] ProductionFlowRunAdapter의 FlowRunRepository 직접 참조 제거
[4] FlowRun application public API 추가
[5] resourceType 계약/allow-list 정리
[6] File/Data Flow 최소 integration test 추가
```

첫 PR의 목적은 기능 추가보다:

> **앞으로의 코드가 따라야 할 경계의 reference implementation을 만드는 것**

이다.

> 2026-10-02 보완 (순서 조정): 위 목록을 코드와 대조해 다음 순서로 바꿨다. 상세와 완료 기준은 [decision-handoff.md](../../architecture/decision-handoff.md) "다음 작업 순서".
>
> 1. ADR 3개 작성. 조직 ADR에 "조직 역할은 프로젝트 접근을 부여하지 않음"을 포함한다.
> 2. 공개 API 기준 구현. catalog `CatalogQuery`로 bom의 catalog repository 직접 사용 4곳(2026-10-02 추가된 다단계 역전개·원가 누적 서비스)을, flowrun `FlowRunCommand`로 `ProductionFlowRunAdapter`를 바꾼다.
> 3. ArchUnit 기준선. 새 코드의 다른 도메인 repository 사용을 막고 기존 위반은 동결한다. ArchUnit은 아직 의존성에 없다.
> 4. resourceType allow-list. 목록 밖 값은 경고.
> 5. 데이터 흐름 통합 테스트(§45 보완의 (a) 방식).
> 6. 조직 Phase 1~3(V42 이후).

---

# 58. 장기 최종 구조

```text
                         FlowMat
                            │
                 ┌──────────┴──────────┐
                 │                     │
            Definition Core       Execution Core
                 │                     │
              Workflow               FlowRun
              Revision               Step
              Process                Attempt
              Port                   Event
              Connection             Snapshot
              Rule                   Lineage
                 │                     │
                 └──────────┬──────────┘
                            │
                       Domain Binding
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
 Manufacturing            Data               Business
       │                    │                    │
 Catalog                 Dataset               CRM
 BOM                     File                  SCM
 Inventory               API                   Order
 LOT                     Schema                Partner
 Equipment               Artifact              Ticket
 Quality                 Model                 ...
 Production              Repository            ...
```

---

# 59. 한 문장 결론

> **FlowMat은 범용 Workflow/Resource Execution Core 위에 제조·재고·BOM·품질·데이터·업무 기능을 확장 모듈로 얹는 도메인 독립형 플랫폼으로 간다.**

