# Domain Roadmap

> **보관 문서(레거시)** · 현재 기준이 아니다. 구현·리팩토링으로 사실과 달라진 내용이 있을 수 있으니 작업 근거로 쓰지 않는다. 지금 기준은 [docs/README.md](../../README.md), 이 폴더 안내는 [archive/README.md](../README.md).

이 문서는 현재 코드 구조를 유지하면서 기업용 관리 기능을 확장하기 위한 우선순위를 정합니다.

## 2026-10-02 현황

아래 P0–P6은 2026-09-24에 쓴 계획입니다. 그 뒤 대부분 구현됐습니다. 기능별 근거는 [CURRENT_CAPABILITIES](../../status/CURRENT_CAPABILITIES.md)가 기준이고, 다음 아키텍처 작업은 [결정 인계](../../architecture/decision-handoff.md) §6입니다.

| 단계 | 상태 | 구현된 것 / 남은 것 |
|---|---|---|
| P0 안정화 | 대부분 | GitHub Actions 4개(백엔드·프런트·브라우저 E2E·보안)와 Testcontainers 통합 테스트가 돈다. 빈 interface(`ProductionExecutionService` 등)는 그대로 둔다 |
| P1 Definition → Execution | 대부분 | revision 고정(V20·V21), 포트·연결 계약과 발행 검증(V24·V25), 단계 입출력 snapshot(Flow Run), BOM 대비 사용량 차이, simulation·test·dry_run의 재고 무변경. 남음: 노드 자동 실행(별도 ADR) |
| P2 Resource Usage | 방향 변경 | 옛 `resource_types`·`resources`·`resource_usage` 테이블은 계속 쓰지 않는다. 포트의 `resourceType`과 `itemId` 선택적 binding으로 간다(결정 인계 R2·R3·R5) |
| P3 WMS-lite | 완료 | 위치 목록(V28), 위치 간 이동, 입고·출고, 할당(V36), 격리(LOT), Putaway·Pick(V31). 모두 `InventoryTransaction` 위에서 동작 |
| P4 SCM-lite / Planning | 일부 | 다단계 BOM 전개·역전개·원가 누적, 간이 MRP, 만들 수 있는 양, 준비 점검, 재주문 목록. 남음: 구매·발주 제안, 리드타임 |
| P5 Quality | 완료 | 검사·불량, 검사 기준(V29), NCR·CAPA(V30) |
| P6 Maintenance / EAM | 일부 | 설비 정보, 달력·정지 기간(V32), 전환 시간(V33), 휴일(V41), 부하표. 남음: 정비 계획, 고장·부품 이력 |

맨 아래 "첫 코드 변경 후보"의 1·2·3·5는 구현됐고, 4(Resource usage)는 위 P2처럼 방향이 바뀌었으며, 6(SCM planning)은 일부입니다.

## P0 — 현재 구현 안정화

새 도메인을 만들기 전에 현재 기능을 완성합니다.

### 대상

- workflow
- production
- inventory
- bom
- catalog
- rule

### 작업

- 기존 서비스/엔티티/DB migration 불일치 점검
- Docker 가능한 환경에서 integration test 재검증
- 빈 interface는 실제 요구가 생기기 전 구현하지 않음
- legacy를 신규 코드의 참조 기반으로 사용하지 않음
- 최신 audit와 도메인 계약을 기준으로 stale backlog 구분

### 이유

현재 FlowMat에는 이미 MES의 핵심 골격이 있습니다.
기존 모델을 완성하기 전에 SCM/ERP 이름의 새 모듈을 만들면 같은 책임이 중복됩니다.

---

## P1 — Definition → Execution 연결 강화

가장 중요한 단계입니다.

### 목표

사용자가 에디터에서 정의한 Process/IO가
WorkOrder와 ProductionRun에서 실제로 의미를 갖도록 합니다.

### 후보 작업

1. Workflow revision을 production run에 고정하는 계약
2. ProcessIo를 BOM/실행 계획과 연결하는 validation
3. Process 단위 실행 snapshot
4. run 결과의 계획 대비 실적 조회
5. simulation과 execution의 side-effect 분리

### 완료 기준

공정도를 수정한 뒤에도 과거 실행 이력이 재현 가능해야 합니다.

---

## P2 — Resource Usage

물/전기/폐기물/파일처럼 단순 재고 품목과 다른 자원을 다룹니다.

DB에는 이미 과거 설계의 `resource_types`, `resources`, `resource_usage` 테이블이 존재하지만,
현재 canonical Java 도메인에는 구현되어 있지 않습니다.

따라서 이 테이블을 바로 활성화하지 않습니다.

### 먼저 검증할 질문

- Item으로 표현할 수 없는 자원은 무엇인가?
- 수량이 재고인가, 계측값인가?
- 누적 사용량인가, 순간값인가?
- 단위 변환은 UnitMaster로 충분한가?
- ProcessIo에서 직접 참조해야 하는가?
- 생산 실행과 시뮬레이션 모두에서 필요한가?

답이 확정된 후 기존 스키마를 유지/변경/폐기합니다.

---

## P3 — WMS-lite

전체 WMS를 만들지 않고 FlowMat에 필요한 위치 추적만 도입합니다.

### 범위

- warehouse
- location
- stock transfer
- receipt / issue
- reservation
- quarantine

### 원칙

기존 `InventoryTransaction`이 이력의 중심입니다.

별도 movement ledger를 만들기 전에
InventoryTransaction 확장으로 해결 가능한지 먼저 검토합니다.

---

## P4 — SCM-lite / Planning

실제 수요와 공급의 부족을 계산할 시점에 추가합니다.

### 기능 후보

- BOM explosion
- 재고 가용량
- shortage
- planned requirement
- lead time
- reorder point
- procurement suggestion

자동 발주는 최종 단계입니다.
처음부터 외부 공급자에게 주문을 전송하지 않습니다.

권장 단계:

```
부족 감지
→ 발주 제안
→ 관리자 승인
→ 외부 연동
→ 필요 시 자동 발주
```

---

## P5 — Quality

DB에 `quality_inspection`, `defect_log`이 이미 존재합니다.

그러나 품질 판정 기준과 사용자 시나리오가 먼저 필요합니다.

최소 모델:

- inspection target
- specification / criterion
- measured value
- pass/fail
- defect type
- affected LOT
- affected production run

품질 결과는 재고 상태와 LOT trace에 영향을 줄 수 있으므로
독립 CRUD로 끝내면 안 됩니다.

---

## P6 — Maintenance / EAM

Equipment가 실사용되기 시작한 뒤 고려합니다.

후보:

- equipment status
- maintenance schedule
- failure
- part replacement
- downtime

MES 실행과 연결되어야 의미가 있으므로 초기 우선순위는 낮습니다.

---

## 지금 만들지 않는 것

다음 이름의 대형 패키지는 만들지 않습니다.

```
domain/erp
domain/mes
domain/scm
domain/wms
```

그 이유는 현재 존재하는 도메인과 책임이 중복되기 때문입니다.

대신 필요한 기능을 기존 bounded context에 넣거나,
기존 어디에도 속하지 않는 책임이 명확해졌을 때만 새 도메인을 만듭니다.

---

## 첫 코드 변경 후보

문서 단계 다음에 실제 코드로 진행할 경우 추천 순서는 다음과 같습니다.

1. WorkflowRevision ↔ ProductionRun snapshot 계약
2. Process 실행 snapshot 모델 검토
3. ProcessIo ↔ 실행 투입/산출 validation
4. Resource usage 요구사항 확정
5. WMS location 모델
6. SCM planning 모델

한 번에 하나씩 구현하고 migration/API/test를 같은 변경 단위로 묶습니다.
