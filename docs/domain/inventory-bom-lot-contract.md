# 재고 · BOM · LOT 1차 계약서

전문가 설계 결정(2026-09-23)을 구현 기준으로 옮긴 문서입니다. 설계가 열어 둔 부분은 **[구현 결정]**으로 표시했습니다. 검토 후 바꿀 부분이 있으면 이 문서를 먼저 고치고 코드를 맞춥니다.

---

## 1. 재고 불변식

모든 정상 거래 후 다음이 항상 참이어야 합니다.

```
quantity           >= 0
reserved_quantity  >= 0
available_quantity  = quantity - reserved_quantity   (>= 0)
reserved_quantity  <= quantity
```

- 서버는 조건부 UPDATE 한 번으로 "변경 + 불변식 검사"를 원자적으로 수행합니다. 조건을 만족하지 않으면 0행이 바뀌고 요청은 거절됩니다.
- DB에도 같은 CHECK 제약을 둡니다(V17). **[구현 결정]** 운영 DB의 기존 행을 막지 않도록 `NOT VALID`로 추가합니다. 기존 데이터를 정리한 뒤 `VALIDATE CONSTRAINT`를 실행하는 것은 운영 마이그레이션 담당 몫입니다.
- 마이너스 재고 예외(관리자 강제 조정)는 1차 범위에서 제외합니다. `allowNegativeStock`은 코드상 항상 false입니다.

## 2. 재고 이동 명령 — `POST /inventory-transactions`

이력 등록 API가 아니라 **재고 변경 명령**입니다. 한 요청이 검증 → 재고 변경 → 거래 저장을 하나의 트랜잭션으로 처리합니다.

### 요청

| 필드 | 필수 | 설명 |
|---|---|---|
| `inventoryId` | ✓ | 대상 재고 행 |
| `transactionType` | ✓ | 아래 표의 값만 허용 |
| `quantity` | ✓ (quarantine류 제외) | **양수** 크기. 방향은 유형이 정함 |
| `direction` | adjustment만 | `increase` / `decrease` |
| `requestId` | ✓ | 클라이언트가 만든 멱등 키 (최대 100자) |
| `referenceType`, `referenceId`, `note` | | 참고 정보 |

**[구현 결정]** 설계 예시의 `quantityDelta`(부호 포함) 대신 `quantity`(양수) + 유형으로 방향을 정합니다. 부호 실수로 입고가 출고가 되는 일을 막기 위해서입니다.

서버가 계산하는 값: `reservedDelta`, `availableDelta`, `*After`, `projectId`, `itemId`, `lotId`, `createdBy`(인증 사용자). 요청 본문에 작성자 필드는 없습니다.

### 거래 유형

| 유형 | quantity | reserved | 외부 API | 비고 |
|---|---|---|---|---|
| `receipt` | +q | | ✓ | 입고 |
| `issue` | −q | | ✓ | 출고. 가용량 초과 금지 |
| `production_input` | −q | | 내부 | 생산 투입 |
| `production_output` | +q | | 내부 | 생산 산출 |
| `reserve` | | +q | ✓ | 가용량 초과 금지 |
| `release` | | −q | ✓ | 예약량 초과 금지 |
| `adjustment` | ±q | | ✓ | 결과 음수 금지 |
| `reversal` | 원거래 반대 | 원거래 반대 | 전용 엔드포인트 | §3 |
| `quarantine` | | | ✓ | 재고 행과 LOT를 격리 상태로 |
| `unquarantine` | | | ✓ | 격리 해제 |

- 격리된 재고에서는 `issue`, `production_input`, `reserve`가 거절됩니다.
- 기존 이력의 유형 이름은 V17에서 새 이름으로 바꿉니다: `create→receipt`, `adjust→adjustment`, `run_input→production_input`, `run_output→production_output`, `delete→adjustment`.

### 멱등성

- `(project_id, request_id)` UNIQUE.
- 같은 `requestId` + 같은 내용이면 저장된 결과를 그대로 반환합니다(재고는 다시 바뀌지 않음).
- 같은 `requestId` + 다른 내용이면 409.
- 동시에 같은 키로 두 요청이 들어와 UNIQUE에 걸리면 뒤 요청은 409를 받습니다. 재시도하면 저장된 결과를 받습니다.

### 오류

| 상황 | 상태 |
|---|---|
| 유형 목록에 없음, quantity ≤ 0, direction 누락 | 400 |
| 가용/예약 부족, 격리 재고 출고 | 409 |
| requestId 충돌 | 409 |
| 쓰기 권한 없음 | 403 |

## 3. 역분개 — `POST /inventory-transactions/{id}/reversal`

요청: `{ "requestId": "...", "reason": "..." }` (둘 다 필수)

- 원거래는 삭제하지 않고 반대 방향 거래를 추가합니다.
- `transaction_type = reversal`, `reference_type = inventory_transaction`, `reference_id = 원거래 ID`, `note = 사유`, `created_by = 역분개한 사용자`. 원거래 작성자는 원거래 행에 남아 있습니다.
- 원거래 하나당 성공한 역분개는 하나(부분 UNIQUE 인덱스).
- 역분개도 현재 재고 정책을 다시 검사합니다. 예: 입고 10을 역분개하려는데 이미 6을 출고했다면 거절됩니다.
- 역분개할 수 없는 유형: `reversal`, `quarantine`, `unquarantine`.

## 4. 재고 행 직접 수정 (`PUT /inventories/{id}`)과 삭제

- 수정은 절대값 조정으로 유지하되 §1 불변식을 검사하고 `adjustment`로 기록합니다. `expectedVersion` 충돌은 409(기존과 동일).
- **[구현 결정]** 삭제는 수량과 예약량이 모두 0일 때만 허용합니다. 남은 재고를 조용히 없애는 경로를 막기 위해서입니다.

---

## 5. BOM

### 상태 전이

```
draft ──submit──▶ pending_approval ──approve──▶ approved ──retire──▶ retired
  ▲                     │
  └──────reject─────────┘
```

| 동작 | 권한 | 조건 |
|---|---|---|
| 생성 / 라인 추가·삭제 | 쓰기 | `draft`일 때만 |
| submit | 쓰기 | `draft`, 라인 1개 이상 |
| approve / reject | 프로젝트 owner | `pending_approval` |
| retire | 프로젝트 owner | `approved` |
| 새 revision | 쓰기 | 원본이 `approved` 또는 `retired`. 라인을 복사한 새 `draft` 생성 |

- **[구현 결정]** revision은 새 `bom_header` 행입니다(새 `bom_id`). 같은 `(project_id, target_item_id)` 안에서 `bom_version`이 1씩 증가하며 UNIQUE입니다.
- 승인된 revision의 header·line은 어떤 API로도 바뀌지 않습니다.

### 승인 검증 (approve 시점)

1. 대상 품목이 존재하고 같은 프로젝트
2. 기준 수량 > 0
3. 모든 라인 수량 > 0
4. 자재 ≠ 대상 품목
5. 자재 단위가 자재 품목의 기준 단위로 환산 가능(`UnitConverter`)
6. **[구현 결정]** 같은 자재 품목 중복 금지. `substitute_group`, `optional_yn = Y`, `scrap_rate ≠ 0`은 1차에서 거절
7. 다단계 금지: 어떤 자재도 현재 `approved` BOM의 대상 품목이면 안 됨

### 소요량

```
필요량(라인 단위) = 생산 수량 / 기준 수량 × 라인 수량
필요량(품목 단위) = 위 값을 UnitConverter로 자재 품목의 단위로 환산
```

예: 기준 100 ea, 라인 20 kg, 생산 250 ea → 50 kg.

`GET /boms/{id}/requirements?quantity=250` 로 미리 계산해 볼 수 있습니다.

### 생산 시작 snapshot

`POST /production-runs/start`에 `bomId`를 주면(또는 작업지시에 `bomId`가 있으면):

- BOM은 `approved`여야 하고 대상 품목이 실행 대상 품목과 같아야 합니다.
- `production_run.bom_id`, `bom_version`, `bom_base_quantity`(V17 신규)를 저장합니다.
- 라인마다 `production_run_item`(direction=input, `quantity_source = bom`)을 만들고 `planned_qty`(품목 단위), `unit`, `conversion_rate`(V17 신규, 라인 단위 → 품목 단위)를 고정합니다.
- 이후 BOM이 retire되거나 새 revision이 생겨도 이 값은 바뀌지 않습니다.
- **[구현 결정]** snapshot으로 만든 계획 행(`quantity_source = bom`)은 계획값입니다. 실제 투입은 지금처럼 `POST /production-runs/{id}/items`로 따로 기록합니다(`quantity_source = manual`). 계획 대비 실적 비교는 두 종류의 행을 품목별로 합쳐서 봅니다.

### 작업지시와 BOM

- 작업지시는 `bomId`를 가질 수 있습니다(생성·수정 모두, draft일 때만). BOM은 같은 프로젝트여야 하고, 대상 품목이 있으면 그 품목의 BOM이어야 합니다. 대상 품목이 비어 있으면 BOM의 품목으로 채웁니다. `retired` revision은 고를 수 없습니다.
- **작업지시 승인 시 BOM도 `approved`여야 합니다.** 승인된 작업지시는 곧바로 실행을 시작할 수 있어야 하기 때문입니다.
- 작업지시로 실행을 시작하면 요청에 `bomId`가 없어도 작업지시의 BOM으로 계획을 고정합니다(§5 생산 시작 snapshot).

### 기타 구현 결정

- **[구현 결정]** 한 품목에는 승인된 revision이 하나만 있습니다. v(n)을 승인하면 기존 approved revision은 자동으로 `retired`가 되고 note에 사유가 남습니다.
- **[구현 결정]** 새 revision은 같은 품목에 `draft`/`pending_approval` revision이 없을 때만 만들 수 있습니다.
- **[구현 결정]** 소요량은 12자리 비율로 계산하고, 품목 단위 수량은 소수 4자리에서 반올림(HALF_UP)합니다. 자재를 넉넉히 잡으려면 올림(UP)으로 바꿀 수 있습니다. 결정이 필요합니다.
- 승인 검증은 submit 때 한 번, approve 때 다시 한 번 합니다(그 사이 품목·단위가 바뀔 수 있으므로). 문제는 한 메시지에 모두 나열합니다.

---

## 6. LOT

### 상태

| 상태 | 투입·출고 | 예약 | 비고 |
|---|---|---|---|
| `available` | ✓ | ✓ | |
| `reserved` | ✓ | ✓ | 예약량 > 0이면 표시용 |
| `quarantined` | ✗ | ✗ | `quarantine` 거래로 진입 |
| `consumed` | ✗ | ✗ | 수량 0이 되면 자동 |
| `closed` | ✗ | ✗ | 수동 종료. 되돌릴 수 없음 |

### 규칙

- `(project_id, lot_no)` UNIQUE.
- 품목의 `lot_manage_yn = Y`이면 재고 생성·생산 투입/산출에 LOT가 필수입니다. `N`이면 `lot_id = null`만 허용합니다.
- 재고 행 = item + location + lot. 한 재고 행에는 한 LOT만 있고, LOT를 바꾸는 수정은 금지합니다(역분개 후 새 거래).
- 다른 프로젝트·다른 품목의 LOT는 참조할 수 없습니다.

### API

| 엔드포인트 | 설명 |
|---|---|
| `POST /lots` | LOT 생성 (`projectId`, `itemId`, `lotNo`, 선택: `receivedAt`, `expiryDate`) |
| `GET /lots?projectId=&itemId=` | 목록 |
| `GET /lots/{id}` | 단건 |
| `POST /lots/{id}/close` | 종료 |
| `GET /lots/{id}/trace?direction=backward\|forward` | 역추적(원재료 쪽) / 정추적(완제품 쪽), 전 단계 재귀 |

### 계보

생산 실행에서 LOT 있는 산출을 기록하면, 그 실행에서 이미 기록된 LOT 투입마다 `lot_trace(parent = 투입 LOT, child = 산출 LOT)`를 만듭니다. 산출 뒤에 투입이 추가되면 그때도 이어 붙입니다.

### 구현 결정

- **[구현 결정]** 계보는 **실행 단위**로 연결합니다. 한 실행의 모든 투입 LOT가 모든 산출 LOT의 부모가 됩니다. 공정(process) 단위로 나눠 연결하지는 않습니다(1차에서는 과하게 넓은 쪽이 추적 누락보다 안전).
- **[구현 결정]** LOT가 있는 재고 행 하나를 격리하면 **그 LOT의 모든 재고 행과 LOT 자체**가 격리됩니다. 해제도 LOT 전체에 적용되고, 해제 후 LOT 상태는 재고량으로 다시 계산합니다(available / reserved / consumed).
- **[구현 결정]** 새로 등록한 LOT는 재고가 0이어도 `available`로 시작합니다. 이후 거래 때마다 전체 재고 행 합계로 상태를 다시 계산합니다.
- **[구현 결정]** `closed` LOT는 모든 재고 이동과 직접 수정이 거절됩니다. 종료는 보유량이 0일 때만, 프로젝트 owner만 할 수 있습니다.
- **[구현 결정]** 품목의 `lot_manage_yn`은 그 품목의 재고 행이 하나도 없을 때만 바꿀 수 있습니다.
- LOT 관리 품목을 생산 투입·산출로 기록할 때는 재고 행(= LOT)을 반드시 선택해야 합니다. 실행 항목에는 그 LOT가 `lot_id`로 남습니다.
- 계보 조회는 최대 50단계까지 따라갑니다(순환 데이터 방어).

---

## 7. 실시간 협업 (점검 기준)

DB가 진실의 원천. 저장 흐름은 `행 잠금 → version 비교 → 409 또는 저장 → version 증가 → commit → commit 이후 STOMP 발행`. Yjs는 본 코드에 넣지 않습니다. 점검 결과는 §8에 기록합니다.

## 8. 구현 현황

| 항목 | 상태 | 검증 |
|---|---|---|
| §1 불변식 (조건부 UPDATE + V17 CHECK `NOT VALID`) | 구현 | `InventoryConcurrencyIntegrationTest` (30개 스레드 초과 차감 → 20건만 성공, 음수 없음) |
| §2 명령 API · 유형 enum · 멱등성 · 작성자=인증 사용자 | 구현 | `InventoryCommandIntegrationTest` 10건 |
| §3 역분개 (1회 제한, 현재 정책 재검사) | 구현 | 같은 테스트 |
| §4 PUT 불변식 · 품목 변경 금지 · 잔량 있는 행 삭제 금지 | 구현 | `InventoryServiceImplTest` |
| 생산 투입·산출 → 명령 서비스 경유 | 구현 | `ProductionRunServiceImplTest` |
| §5 BOM 상태 전이 · 승인 검증 · 소요량 · 생산 시작 snapshot | 구현 | `BomIntegrationTest` 7건 (설계 예시 250/100×20=50 kg, g→kg 환산, 승인 전 사용 거부, 승인본 수정 거부, 새 revision 승인 후에도 기존 실행 계획값 유지, 문제 일괄 보고, 다단계 거부, 반려 사유 필수) |
| §6 LOT 생성 · 필수 선택 · 격리 · 종료 · 계보 정/역추적 | 구현 | `LotIntegrationTest` 6건 (LOT 필수/금지, 다른 품목 LOT 거부, 한 행 격리 → LOT 전체 격리 → 생산 투입 거부 → 해제 후 투입, LOT 없이 생산 기록 거부, 2단계 실행 정·역추적, 빈 LOT만 종료 후 이동 거부) |
| 권한 (외부인 403) | 구현 | `ProjectAccessIntegrationTest` 73건 (`/boms`, `/lots` 추가) |
| 작업지시 ↔ BOM (선택, 승인 조건, 실행 시 자동 적용) | 구현 | `BomIntegrationTest.aWorkOrderCarriesItsBomIntoTheRuns` |
| 화면: Stock 탭 이동 입력(입고·출고·예약·해제·조정)과 역분개(사유 필수, 1회) | 구현 | `stockModel.test.ts` 3건, E2E에서 출고 30 → 가용 70, 초과 출고 거부, 역분개 후 100 복귀 |
| 실 API E2E `e2e/bom-lot-flow.spec.ts` (`REAL_API_E2E=1`) | 구현 | 품목·LOT·격리·이동·역분개·BOM 승인·소요량·BOM 실행·작업지시 BOM 전 과정, 로컬 반복 통과 |
| 화면: 품목 LOT 추적 설정, BOMs 탭(작성·승인·폐기·새 revision·소요량), LOTs 탭(등록·종료·정/역추적), Stock 탭(LOT 선택·격리/해제), 생산 시작 시 BOM 선택, 실행 상세의 BOM 계획 행·LOT 선택 | 구현 | 브라우저 확인(2026-09-24): 품목 → LOT 등록 → LOT 재고 100 kg → 격리·해제 → BOM 20,000 g/100 ea 승인 → 250 ea 소요량 50 kg → BOM으로 실행 시작(계획 행 50 kg) → LOT 지정 투입. 콘솔 오류 0. `bomModel.test.ts` 4건 |
| §7 협업 점검 | 미착수 | |
