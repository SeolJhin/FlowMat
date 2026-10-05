# 품목 상세 (그룹·규격·바코드·SKU·보관 조건·설명)

상태: **구현(2026-09-26).** 새 테이블·마이그레이션 없음. V1 `item` 테이블에 이미 있던 열을 엔티티·API·화면·CSV에 연결했습니다.

## 목적

품목에는 코드·이름·유형·분류·단위만 있어서, 같은 밀가루라도 규격이 무엇인지, 어떤 바코드로 들어오는지, 어떻게 보관해야 하는지 적을 곳이 없었습니다. 테이블에는 처음부터 그 열이 있었습니다.

## 필드

| 필드 | 열 | 형식 |
|---|---|---|
| `itemGroup` | `item_group` varchar(50) | 자유 그룹(예: flour, packaging). 목록에서 이름 옆에 보임 |
| `spec` | `spec` varchar(200) | 규격 |
| `barcode` | `barcode` varchar(100) | 바코드. 프로젝트의 활성 품목 사이에서 하나뿐 |
| `sku` | `sku` varchar(100) | SKU |
| `storageCondition` | `storage_condition` varchar(100) | 보관 조건 |
| `description` | `item_desc` text | 설명(API는 2000자까지) |

같은 테이블의 `allergen_info`·`hazard_info`(jsonb)는 구조가 정해지지 않아 이번에 연결하지 않았습니다.

## API

기존 품목 요청에 `details` 객체가 붙습니다.

| 요청 | `details` |
|---|---|
| `POST /items` | 선택. 없으면 모두 비어 있음 |
| `PUT /items/{id}` | 없으면 그대로. **있으면 여섯 필드를 모두 바꿈** — 빠진 필드·`null`·빈 문자열은 지워짐 |
| `GET /items`, `GET /items/{id}` | 항상 있음. 기록되지 않은 필드는 `null` |
| `POST /items/import` | 열 `group`, `spec`, `barcode`, `sku`, `storage`, `description`. 빈 칸은 그대로([가져오기 I10](item-import.md)) |

## 규칙

| # | 규칙 | 이유 |
|---|---|---|
| D1 | `details`는 통째로 보냄(설비 정보와 같은 방식) | 한 번 넣은 값을 지울 방법이 필요함 |
| D2 | 글자는 앞뒤 공백을 떼고, 비면 `null`. 길이는 열 크기, 넘으면 400과 필드 이름 | 저장 중 DB 오류(500) 대신 |
| D3 | 바코드는 프로젝트의 **활성** 품목 사이에서 하나뿐. 이미 쓰는 품목이 있으면 409 "Barcode … is already used by item <코드>." 자기 바코드를 다시 보내는 것은 괜찮고, 삭제된 품목의 바코드는 다시 쓸 수 있음 | 스캔한 바코드가 한 품목을 가리켜야 함. DB UNIQUE는 새 마이그레이션이 필요해 서비스에서 막음(품목 코드 I9와 같음) |
| D4 | 품목 수정 요청에도 `@Valid`를 걸어 `details` 길이를 검사 | 전에는 수정 요청에 검사할 제약이 없었음 |

## 화면

재고 → Items 탭
- 추가·수정 폼 아래 **More details**(접힘, 값이 있으면 펼쳐지고 개수 표시): Group, Spec, Barcode, SKU, Storage, Description(여러 줄). 수정 때 저장된 값이 채워지고, 칸을 비우고 저장하면 지워집니다. 바코드가 겹치면 폼 아래에 409 메시지가 나옵니다.
- 목록: 이름 옆에 `· <그룹>`.
- 검색 칸: 코드·이름·유형에 더해 **그룹·바코드·SKU**로도 찾습니다(스캐너로 바코드를 넣어도 됨).
- **Details** 패널: 기록된 상세만 이름표와 함께 보여 줌(설명의 줄바꿈 유지).
- CSV 내보내기에 여섯 열이 붙고, 가져오기가 같은 열을 읽습니다.
- 재고 → Movements → Stock on a date의 **Group by: item group**으로 그 시점 재고를 그룹별(행 수·품목 수·금액)로 봅니다([재고 원장](stock-ledger.md)).

재고 → Stock 탭 **Add Stock**, LOTs 탭 **Register LOT**, BOMs 탭 초안 BOM의 **자재 추가**
- **Scan barcode** 칸: 바코드·SKU·코드를 스캔하거나 적고 Enter를 누르면 그 품목이 Item에 골라집니다("Picked …"). Enter로 폼이 제출되지는 않습니다. 찾는 순서는 바코드 → SKU → 코드(코드만 대소문자 무시)이고, 값 전체가 같아야 합니다(비슷한 품목을 고르지 않게). 없으면 "No item here has barcode, SKU or code …". LOT 폼은 LOT 관리 품목 안에서만, BOM 자재 폼은 그 BOM의 제품을 뺀 품목에서 찾고 단위도 자재의 재고 단위로 맞춥니다. 실행 상세의 **Record Item**(투입·산출), 보정 요청의 추가 줄, **New Work Order**의 Target item에도 같은 칸이 있습니다(2026-09-26). 실행에서는 고르면 단위가 품목 단위로 바뀌고 LOT 선택이 비워지며, 작업지시에서는 그 품목의 승인된 BOM이 함께 골라집니다.
- 바코드나 SKU가 있는 품목이 하나도 없으면 칸을 보이지 않습니다(바코드를 쓰지 않는 프로젝트의 폼은 그대로).

같이 고친 것: 품목 폼의 Safety stock·Lead time 두 칸 줄이 입력칸 기본 폭 때문에 340px 칸을 넘쳐, 폼 전체가 오른쪽 테두리 밖으로 밀려 있었습니다. 두 칸이 줄어들 수 있게(`minWidth: 0`) 해 폼이 칸 안에 들어옵니다.

## 구매 단위

품목을 포대·상자처럼 재고 단위와 다른 단위로 살 때, V1 `item.purchase_unit`(varchar(20))과 `conversion_rate`(numeric(18,8), 기본 1)를 씁니다. 뜻은 **구매 단위 하나 = 재고 단위 `conversion_rate`개**(예: bag = 25 kg)로 정했습니다. 이 열을 쓰는 코드는 없었고(단위 환산의 `conversionRate`는 `unit_master`의 것), 기존 품목은 모두 `purchase_unit` 없음·1입니다.

| 요청 | 필드 |
|---|---|
| `POST /items` | `purchaseUnit`(선택, 20자), `purchaseUnitQty`(선택, 0 초과, 기본 1) |
| `PUT /items/{id}` | `purchaseUnit`: 없으면 그대로, **빈 문자열이면 재고 단위로 되돌림**(수량도 1). `purchaseUnitQty`: 없으면 그대로, 0 초과, 정수 10자리·소수 8자리까지. 수량만 보내면 지금 구매 단위의 크기를 바꿈(구매 단위가 없으면 400 "Give the purchase unit with its quantity.") |
| 응답 | `purchaseUnit`, `purchaseUnitQty`(구매 단위가 없으면 둘 다 null) |

- 새 품목은 `conversion_rate`를 1로 넣습니다(열을 매핑했으므로 null이 기본값을 덮지 않게).
- 화면: 품목 폼 **Bought in**(비우면 재고 단위) · **Units per <단위>**, Details 패널 `bought in bag of 25 kg`.
- 재주문 목록은 제안 주문량을 **구매 단위로 올림**해 보여 줍니다(`40 kg → 2 bag (50 kg)`), Order value와 CSV(`purchase_unit,packs,order_quantity`)도 올린 양 기준([재고 경보](stock-alert.md)).
- 입고: Stock 탭 재고 행의 History에서 움직임이 **Receipt**이고 품목에 구매 단위가 있으면 수량 아래 "or [N] bag × 25" 칸이 생겨, 포대 수를 적으면 수량이 재고 단위로 채워집니다(`fromPacks`, 2 → 50). 수량을 직접 고치면 포대 칸은 비워집니다. 브라우저: 5 kg 행에 2 bag 입고 → 수량 50 → 기록 후 55, Issue로 바꾸면 칸 사라짐
- 재고 일괄 입고 CSV에 `packs`(`bags`) 열을 쓰면 포대 수로 입고합니다(2.5 bag × 25 = 62.5 kg, [재고 일괄 입고](stock-import.md)). `StockImportPacksIntegrationTest`: quantity와 packs를 함께 쓴 줄, 구매 단위 없는 품목, packs 0은 줄 오류, 2.5 → 62.5
- 열린 작업지시 자재 소요(Stock 탭)의 부족량 아래에도 올림한 구매 단위 수가 나옵니다([자재 소요](material-requirements.md)).
- 품목 CSV: 열 `purchase_unit`(`pack_unit`), `purchase_unit_qty`(`units_per_pack`, `pack_size`). 빈 칸은 그대로(가져오기로는 지울 수 없고 품목 폼에서 지움). 수량만 있고 구매 단위가 파일에도 품목에도 없으면 줄 오류, 0·소수 9자리 이상도 줄 오류.
- 검증: `ItemPurchaseUnitIntegrationTest` — bag 25로 생성(trim), 이름만 바꾸면 유지, 수량만 12.5로 바꾸면 bag 유지, 0은 400, 빈 문자열로 둘 다 null, 구매 단위 없이 수량만 400, 단위만 주면 크기 1. `stockAlertModel.test.ts`의 `packsFor`(44/25 → 2, 50/25 → 2, 0.3×3/0.3 → 3, 0 → 0)·`orderQuantity`. `ItemPurchaseUnitIntegrationTest.theImportSetsAndResizesThePurchaseUnit`: sack 20으로 새 품목(단위 없이 수량만 있는 줄 때문에 전체 거절 → 그 줄 빼고 저장), 수량만 25로 바꾸면 "purchase unit quantity", 같은 값은 unchanged. 브라우저: 10 kg·안전재고 50·bag 25·단가 2 → 재주문 `40 kg → 2 bag (50 kg)`, Order value 100, CSV `…,40,bag,2,50,2,100`, Details `bought in bag of 25 kg`, 폼에서 Bought in을 비우고 저장하면 둘 다 null. 콘솔 오류 없음

## 검증

- `ItemDetailsIntegrationTest` 3건(실제 Postgres)
  - 상세와 함께 생성(그룹 trim) → 다시 읽기. 이름만 바꾸면 SKU 유지. 바코드·그룹만 보내면 규격·설명이 지워짐
  - 바코드: 다른 품목이 쓰면 생성·수정 모두 409(메시지에 그 품목 코드), 자기 바코드는 괜찮음, 품목을 지우면 다른 품목이 쓸 수 있음. 규격 201자 400(`spec takes at most 200`)
  - 가져오기: 규격만 적은 줄은 규격만 바뀜(그룹·바코드 유지), 새 품목의 그룹, 다른 품목의 바코드·파일 안 중복 바코드는 줄 오류, 다시 올리면 unchanged
- `itemInfoModel.test.ts`(폼 ↔ `details`, 표시 줄), `listFilterModel.test.ts`(그룹·바코드·SKU 검색), `itemCsvModel.test.ts`(상세 열 내보내기 → 다시 읽기), `itemScanModel.test.ts`(바코드 → SKU → 코드 순서, 값 전체 일치, 칸 표시 조건)
- 브라우저(그룹·BOM 스캔): 그룹 있는 자재 4 kg(단가 2) → Stock on a date, Group by item group에 그 그룹 `1 · 1 · 8`, 맨 끝 `no group`. 초안 BOM 자재 폼에서 바코드 + Enter → Material에 그 자재
- 브라우저(스캔): 바코드가 있는 LOT 관리 품목을 API로 만든 뒤 Stock 탭에서 바코드 + Enter → Item에 그 품목, "Picked …", `/inventories` POST 0건. 없는 값 → 경고. LOTs 탭에서 SKU + Enter → 그 품목. 콘솔 오류 없음
- 브라우저(세션 DB): 상세와 함께 추가 → 목록 `info … · flour` → 같은 바코드로 두 번째 품목 추가는 `Barcode … is already used by item II-A-…` → 바코드·SKU로 검색하면 그 품목 하나 → Details 패널에 여섯 줄(설명 두 줄) → 수정 폼에 값이 채워지고 Spec을 비워 저장하면 패널에서 빠짐 → 삭제. 콘솔에는 일부러 낸 409 하나뿐. 폼 폭: 칸 938–1278px, 입력칸 957–1259px

## 남은 범위

- 알레르기·위험물 정보(jsonb) 구조 결정과 연결
- 스캔 칸: Add Stock·Register LOT·BOM 자재·실행 Record Item·보정 요청 추가 줄·작업지시 Target item에 있음. 재고 이동은 품목이 이미 정해진 행에서 하므로 칸이 필요 없음
- DB UNIQUE(새 마이그레이션 필요)

### 입고 환산 입력 동기화 (2026-10-05, §2 2bb)

- 포장 수를 비우거나 유효하지 않은 음수로 바꾸면 환산한 Quantity도 비웁니다. 이전 2 bag → 50 kg 값이 남아 잘못 입고되는 것을 막습니다. 직접 Quantity를 입력하면 기존처럼 포장 칸을 비웁니다.
- `e2e/stock-pack-input.spec.ts` 가짜 API 3건: 비우기·음수의 이전 50 유지 2건을 수정 전 재현, 재입력 1.5 bag → 37.5와 직접 3 kg 입고를 검증. 기존 입고·이동 재시도 4건과 합계 7건 통과. 환산 모델·서버 계약·마이그레이션 변경 없음.