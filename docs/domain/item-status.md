# 품목 상태 (active · inactive · discontinued)

상태: **구현(2026-09-26).** 새 테이블·마이그레이션 없음. V1 `item.item_status` 열을 그대로 씁니다.

## 목적

품목 폼에는 상태(active, inactive, discontinued)를 고르는 칸이 있었지만, 서버는 아무 값이나 받았고 어떤 상태든 똑같이 다뤘습니다. 이제 상태에 뜻을 둡니다. **쓰지 않거나 단종하는 품목은 남은 재고를 다 쓸 수는 있지만, 새로 들어오거나 새로 계획되지 않습니다.**

## 상태

| 값 | 뜻 |
|---|---|
| `active` | 평소대로 씀(기본) |
| `inactive` | 당분간 쓰지 않음 |
| `discontinued` | 단종 중. 남은 재고를 쓰고 끝냄 |

- 저장은 소문자. 대소문자·앞뒤 공백은 받아서 고칩니다(`" Active "` → `active`).
- 그 밖의 값은 400 "Status '…' is not one of: active, inactive, discontinued."(생성·수정). 품목 가져오기(CSV)는 그 줄의 문제로 "Status must be one of: …".
- 수정할 때는 상태가 **바뀔 때만** 값을 검사합니다. 예전 값으로 저장된 품목도 다른 칸을 고칠 수 있습니다.
- 상태가 비어 있는 옛 품목은 active로 봅니다. 삭제된 품목의 `deleted`는 사람이 고르는 상태가 아닙니다.
- inactive와 discontinued는 서버 규칙이 같습니다. 차이는 뜻(잠시 멈춤 / 끝냄)뿐입니다.

## 규칙 (active가 아닌 품목)

| # | 막는 것 | 응답 |
|---|---|---|
| S1 | 새 재고 행(Add Stock, `POST /inventories`) | 409 "CODE is discontinued; set it back to active to receive stock." |
| S2 | 입고(`receipt`) 이동 | 409, 같은 문구 |
| S3 | 재고 가져오기의 그 줄 | 줄 문제로 같은 문구(파일 전체가 적용되지 않음) |
| S4 | 새 LOT 등록 | 409 "… to register a LOT." |
| S5 | 그 품목을 제품으로 하는 새 BOM | 409 "… to give it a BOM." |
| S6 | BOM에 자재로 추가(한 줄 추가, 자재 가져오기) | 409 / 줄 문제 "… to use it in a BOM." |
| S7 | 그 품목을 쓰는 BOM의 제출·승인 | 400 "This BOM cannot be approved: Material CODE is discontinued; …" 또는 제품이면 "… to approve its BOM." |
| S8 | 작업지시의 목표 품목으로 **새로** 지정 | 409 "… to plan a work order for it." 이미 그 품목을 목표로 하던 작업지시는 수정·진행할 수 있음 |

재발주 목록([재고 경보](stock-alert.md))은 active가 아닌 품목을 제안하지 않습니다(안전재고 밑이어도).

막지 않는 것: 출고, 예약, 이동, 실사, 격리, 폐기, 역분개, 생산 투입(남은 재고를 쓰기), 조회·분석. 이미 승인된 BOM은 그대로 두고, 새 개정판을 제출할 때 S7로 걸립니다. 생산 산출(실행 기록)은 이 규칙을 적용하지 않습니다(실행 서비스는 다른 작업 범위).

규칙은 `ItemStatusRule`(`domain/catalog/application`) 한곳에 있습니다. `catalog/domain/enums/ItemStatus`는 나중을 위해 잡아 둔 뼈대라 건드리지 않았습니다.

## 비활성 단위를 쓰는 품목

단위(Units 탭)를 비활성화해도 그 단위를 쓰던 품목은 단위를 그대로 가집니다. 전에는 품목 폼이 저장할 때마다 단위를 다시 보내고 서버가 "활성 단위만"을 검사해서, 그런 품목은 이름 하나 고치는 것도 400("Unit '…' does not exist or is inactive.")이었습니다. 이제 **단위가 바뀔 때만** 활성 여부를 봅니다(2026-09-26). 품목 폼의 단위 목록은 원래부터 그 품목의 비활성 단위를 계속 보여 줍니다. 다른 비활성 단위로 바꾸는 것은 여전히 400입니다.

## 화면

- 품목 폼의 Status 칸은 그대로(active / inactive / discontinued).
- 새 재고·계획을 만드는 선택 칸은 active 품목만 보여 줍니다(`pickableItems`): Add Stock, Register LOT, 새 BOM의 제품, BOM 자재, 작업지시 목표 품목과 각 스캔 칸. 수정 중인 기록이 이미 고른 품목은 계속 보입니다.
- 출고·예약 나누기, 실행 기록 등 남은 재고를 쓰는 칸은 모든 품목을 보여 줍니다.
- 품목 **Details** 머리줄의 상태가 active가 아니면 주황으로 `discontinued: no new stock, BOM use or work orders`.
- Stock 탭 **Open work order needs**에서 active가 아닌 자재에는 이름 아래 주황으로 `discontinued: not reordered`가 붙습니다. 그 부족은 주문으로 채울 수 없다는 뜻입니다.

## 검증

- `ItemStatusIntegrationTest` 첫 번째: 없는 상태 400, `" Active "` → active. 재고 10인 밀가루를 `Discontinued`로 바꾸면 `discontinued`로 저장. 새 재고 행 409(문구 전체 확인), 입고 409, 재고 가져오기 줄 문제, inactive LOT 품목의 LOT 등록 409, 다른 BOM에 자재 추가 409, 제품으로 BOM 409, 그 자재를 쓰던 초안 BOM 제출 400, 작업지시 409. 출고 4는 200(남은 6). active로 되돌리면 입고 200. 안전재고 20에 재고 10이라 재발주 목록에 있던 밀가루가 discontinued 뒤에는 빠짐
- 관련 통합·단위 테스트 102건(Item·BOM·LOT·Inventory·WorkOrder·StockImport) 통과
- 같은 테스트 클래스 두 번째: 단위 둘을 만들어 한 품목에 쓰고 둘 다 비활성화 → 같은 단위를 보내며 이름 수정 200, 다른 비활성 단위로 바꾸기 400
- `itemStatusModel.test.ts`: active·상태 없음은 선택 가능, inactive·discontinued는 빠짐, 이미 고른 품목은 남음
- 브라우저(2026-09-26): API로 품목 둘(하나는 discontinued)을 만든 뒤 Add Stock 409 문구 확인, Items 표에 `discontinued`. Add Stock·New BOM 제품·작업지시 Target item 목록에 active 품목은 있고 discontinued 품목은 없음. 콘솔 오류 0, 만든 품목 삭제
