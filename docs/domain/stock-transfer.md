# 재고 이동 (위치 간 이동)

상태: **구현(2026-09-24).** 출처: [벤치마크](../reference/benchmarks/FlowMat_GitHub_Benchmark_2026-09-24.md) FM-WMS-002 Putaway/Pick/Transfer 중 **Transfer**. 코드는 가져오지 않았습니다. **새 마이그레이션 없음.** 거래 유형 두 개(`transfer_out`, `transfer_in`)를 코드에 추가했고, DB에는 거래 유형 CHECK가 없어 스키마 변경이 필요 없습니다.

## 왜 필요한가

지금까지 재고를 다른 위치로 옮기려면 "출고 + 다른 행에 입고"를 따로 기록해야 했습니다. 이러면 둘 중 하나만 기록될 수 있고, 이력에서 둘이 한 이동이라는 연결도 없습니다. 게다가 LOT 재고의 입고는 새 행을 만들어야 했습니다.

## API

`POST /inventory-transfers` — 프로젝트 쓰기 권한

```json
{ "fromInventoryId": "...", "toLocation": "WH-B / Rack 2", "quantity": 4, "requestId": "uuid", "note": "선택" }
```

응답: `{ transferId, out: 거래, in: 거래 }`. 두 거래 모두 `referenceType = "inventory_transfer"`, `referenceId = transferId`입니다.

## 규칙

| # | 규칙 | 이유 |
|---|---|---|
| T1 | 한 트랜잭션에서 출발 행 `transfer_out`(−q)과 도착 행 `transfer_in`(+q)을 기록 | 반쪽 이동이 생기지 않음 |
| T2 | 도착 행은 **같은 품목·같은 LOT·도착 위치**의 활성 행. 없으면 수량 0인 빈 행을 만든 뒤 `transfer_in` | LOT 행은 위치당 하나(V17 유일 인덱스). LOT는 이동해도 바뀌지 않음 |
| T3 | LOT 없는 품목은 그 위치의 행 중 격리되지 않은 가장 오래된 행을 씀 | 비LOT 행은 유일 제약이 없음 |
| T4 | **가용량(보유 − 예약)까지만** 이동. 예약은 출발 행에 남음 | 예약을 조용히 풀지 않음 |
| T5 | 출발 재고가 격리 중이면 거절(409). 도착 행이 격리 중이어도 거절 | 격리 재고와 섞이지 않게 |
| T6 | 같은 위치로의 이동은 거절(400). 앞뒤 공백은 무시, 빈 값은 "위치 없음" | |
| T7 | 종료된 LOT는 거절(기존 규칙). **만료된 LOT는 이동 허용** | 폐기 구역으로 옮기는 것은 정상 작업 |
| T8 | `requestId` 멱등: 같은 키, 같은 출발 행, 같은 수량이면 첫 이동 결과를 돌려주고 아무것도 옮기지 않음. 다른 내용이면 409 | 두 번 눌러도 한 번만 |
| T9 | 이동 거래는 **개별 역분개 불가**(400). 되돌리려면 반대로 이동 | 한쪽만 되돌려 반쪽 이동이 되는 것을 막음 |
| T10 | 두 행은 `inventory_id` 순서로 잠금 | 서로 반대 방향으로 동시에 이동해도 교착(deadlock)이 나지 않음 |
| T11 | 도착 행을 찾거나 만들기 전에 **품목·LOT·도착 위치**에 트랜잭션 범위 advisory lock(`pg_advisory_xact_lock(hashtext(…))`)을 잡음(2026-09-26). **Add Stock**(LOT 행)도 같은 키로 잡은 뒤 "이미 행이 있음"을 검사함 | 같은 새 위치로 동시에 두 이동이 오면 둘째가 기다렸다가 첫째가 만든 행으로 들어감. 전에는 LOT 행은 유일 인덱스 위반(409)으로 한쪽이 실패했고, 비LOT 품목은 같은 위치에 행이 둘 생길 수 있었음. 새 마이그레이션 없음 |
| T12 | 화면에서 응답이 확인되지 않은 같은 이동은 같은 `requestId`로 재시도. 성공을 확인한 뒤 같은 이동을 다시 입력하면 새 키. 저장 중 입력 잠금(2026-10-05) | 저장 성공 뒤 응답 유실로 인한 두 번 이동 방지. 키는 열린 History 화면에서만 유지하므로 닫기 전 결과 확인 |

두 거래는 다른 재고 이동과 같은 `InventoryCommandService`를 거칩니다. 그래서 다음이 그대로 적용됩니다:
- 불변식(음수 금지, 예약 ≤ 보유)
- LOT 상태 재계산
- [재고 경보](stock-alert.md) 재계산

## 화면

Stock 탭 → 행의 **History** → 이동 입력의 Movement에서 **Move to another place**를 고릅니다.
- 수량과 도착 위치를 입력하고 **Move**를 누릅니다.
- 도착 위치 행이 표에 나타나거나 수량이 늘어납니다.
- 이력에는 `transfer_out`과 `transfer_in`이 남고, Reverse 버튼은 나오지 않습니다.
- 가용량보다 많으면 서버 메시지("Not enough available stock: 6 available, 99 needed.")를 그대로 보여 줍니다.

## 검증

- `InventoryTransferIntegrationTest` 4건
  - 10(예약 2)에서 5 이동: 출발 5/예약 2/가용 3, 도착 새 행 5. 같은 `requestId` 재시도 시 같은 `transferId`에 재고 불변. 가용 초과 409. 같은 위치 400. 되돌려 이동하면 **원래 행**으로 들어가 출발 10, 중간 행 0.
  - LOT 재고 이동: 도착 행도 같은 LOT, LOT 합계 불변. 이동 거래 역분개 400. LOT 격리 후 이동 409.
  - 동시 이동(T11): 두 위치의 같은 LOT 재고를 같은 새 위치로 동시에(스레드 둘, 같은 순간 시작) 1·2 이동 → 둘 다 200, 도착 행 하나에 3. 비LOT 품목도 같은 방식 → 행 하나에 3. 세 번 반복. 잠금을 끈 채 돌리면 `[409, 200]`(uq_inventory_item_location_lot 위반)으로 실패하는 것을 확인함
  - 동시 Add Stock: 같은 LOT·위치로 두 요청을 같은 순간 → 200 하나, 409 하나이고 409는 "LOT … already has a stock record … Receive into that record instead.". 잠금을 빼면 409가 "This conflicts with a change that was just saved"(유일 인덱스 위반)로 바뀌어 실패하는 것을 확인함
- 기존 `InventoryCommandIntegrationTest` 10건, `StockAlertIntegrationTest` 3건, `QualityIntegrationTest` 4건 통과
- `stockModel.test.ts`: 이동 거래에 Reverse 버튼을 표시하지 않음
- 실 화면: WA 10 → WB로 4 이동 → WA 6, WB 4, 이력에 `transfer_out` 표시. 99 이동은 서버 메시지 표시
- 가짜 API `stock-command-retry.spec.ts`: 응답을 끊기 전에 이동을 반영한 뒤 재시도 → 출발 10에서 6, 도착 4로 한 번만 이동. 성공 확인 뒤 같은 이동을 새로 입력 → 출발 2, 도착 8. 입력 잠금 포함 통과(2026-10-05). 공통 요청 모델 6건·커버리지 100%.

## 이후

- ~~Putaway/Pick 작업 지시는 이 이동 명령 위에 올립니다(FM-WMS-002 나머지).~~ → [창고 작업](warehouse-task.md)으로 구현(2026-09-27, V31)
- ~~위치 마스터(창고·구역·랙)는 FM-WMS-001입니다. 지금 위치는 자유 문자열입니다.~~ → [보관 위치 목록](storage-location.md)으로 구현(2026-09-27, V28). 목록이 있는 프로젝트는 이동 도착지도 활성 목록 위치만 받습니다
- 재고 행을 새로 만드는 곳은 Add Stock·입고 가져오기(`InventoryServiceImpl.createInventory`)와 이동 도착 행뿐이다(2026-10-03 확인, 생산 산출은 고른 기존 행에 기록). 둘 다 T11 잠금을 쓴다. 위치 코드 잠금은 [보관 위치](storage-location.md) L7
