# 보관 위치 목록 (Location master)

상태: **구현(2026-09-27).** 출처: [벤치마크](../reference/benchmarks/FlowMat_GitHub_Benchmark_2026-09-24.md) FM-WMS-001 Location hierarchy, [도메인 로드맵](../archive/2026-09-architecture/domain-roadmap.md) P3 WMS-lite "location". 코드는 가져오지 않았습니다. **새 마이그레이션 V28** (`storage_location`). 기존 V1~V27은 바꾸지 않았습니다.

## 왜 필요한가

지금까지 재고 위치(`inventory.location`)는 자유 입력이었습니다. 그래서 다음 문제가 있었습니다.
- `WH-A`와 `wh-a`, `WH-A `가 서로 다른 곳으로 기록됨
- 오타 위치로 이동하면 새 행이 생김
- 창고 → 구역 → 선반 같은 계층을 표현할 수 없음
- 재고 이동·입고 가져오기의 "위치 마스터 검사"가 남은 범위로 남아 있었음([재고 이동](stock-transfer.md), [재고 일괄 입고](stock-import.md))

## 모델

`storage_location` (프로젝트별)

| 열 | 뜻 |
|---|---|
| `location_code` | 재고 행의 `inventory.location`에 그대로 저장되는 코드. 프로젝트 안에서 대소문자 무시 유일(삭제된 것 제외). 최대 100자 |
| `location_type` | `site` > `warehouse` > `zone` > `location` > `bin` |
| `parent_location_id` | 바깥 종류의 위치. 비우면 최상위 |
| `active_yn` | `N`이면 새 재고를 받지 않음 |
| `location_name`, `note` | 설명용(100자, 500자) |

`inventory.location`은 계속 텍스트입니다. 외래 키를 걸지 않은 이유: 기존 행의 자유 입력 위치를 깨지 않고, 목록을 쓰지 않는 프로젝트는 지금처럼 쓸 수 있게 하기 위해서입니다.

## 규칙

| # | 규칙 | 위반 응답 |
|---|---|---|
| L1 | 위치는 바깥 종류 안에만 둘 수 있음(site > warehouse > zone > location > bin). 같은 종류나 안쪽 종류 안은 거절. 이 순서 때문에 순환(자기 안에 자기)이 생길 수 없음 | 400 `A bin cannot be inside … places nest as site > warehouse > zone > location > bin.` |
| L2 | 종류를 바꿀 때도 부모보다 안쪽, 모든 자식보다 바깥이어야 함 | 400 |
| L3 | 코드는 프로젝트 안에서 대소문자 무시 유일 | 409 `Location code … is already used in this project.` |
| L4 | 부모는 같은 프로젝트의 활성 위치. 부모를 바꾸지 않으면 다시 검사하지 않음 | 400 / 409 |
| **L5** | **목록이 비어 있는 프로젝트는 자유 입력(기존 동작).** 위치가 하나라도 있으면 새 재고 등록(Add Stock), 위치 변경, 이동의 도착 위치, 입고 가져오기의 위치는 **목록의 활성 위치만** 허용. 대소문자를 무시해 찾고 **목록의 표기로 저장** | 없음 400 `Location X is not in this project's location list…`, 비활성 409 `Location X is inactive.` |
| L6 | 재고 행의 위치를 **바꾸지 않는** 수정(수량·상태 등)은 목록에 없는 기존 위치여도 허용 | |
| L7 | 재고를 가진 위치(보유 또는 예약이 0이 아닌 행)는 비활성화·삭제 불가. 비활성화는 활성 자식이 없어야 하고, 삭제는 자식이 없어야 함. **코드 변경은 재고가 있어도 됨**(2026-10-03): 그 코드의 살아 있는 재고 행(재고 0 포함)과 그 위치를 가리키는 창고 작업(열린 것·끝난 것)의 위치가 새 코드로 바뀌고 행의 version이 올라감. 새 코드를 이미 쓰는 재고 행(목록 전 자유 입력)이 있으면 거절. 위치 코드마다 트랜잭션 잠금(`storage-place:<프로젝트>:<소문자 코드>`)을 새 재고·이동·작업 계획(`resolveForStock`)과 코드 변경·비활성화·삭제가 같이 잡아, 옛 코드로 재고가 생기는 경합이 없음 | 409 `… still holds stock in N records. Move the stock out before you …` / 409 `1 stock record already uses attic. Move them to a listed place first, or pick another code.` |
| L8 | 이동의 "같은 위치" 판정은 대소문자 무시 | 400 `The stock is already at …` |
| L9 | 입고 가져오기는 행마다 위치를 검사해 오류 행으로 보고(전체 미리보기 유지) | 행 `error` |
| L10 | **위치 라벨**(2026-10-03, 프런트만): 목록에 보이는 활성 위치마다 위치 코드의 Code 128 바코드(코드 집합 B, 출력 가능한 ASCII)·코드·경로·종류를 인쇄용 새 창에 냄. 스캐너가 읽으면 그 코드가 입력되어 [창고 작업](warehouse-task.md) W8의 위치 스캔과 맞음(대소문자·공백 무시). ASCII 밖 글자(한글 등)가 든 코드는 바코드 없이 `No barcode: …`. 저장하지 않음 | 위치 코드를 바코드로 붙여야 스캔으로 위치를 확인할 수 있어서 |

### 코드 변경과 창고 작업의 동시성 (2026-10-04)

위치 수정·삭제와 창고 작업의 계획·완료·부분 완료·취소·배정은 같은 프로젝트 잠금(`warehouse-task|<프로젝트>`)을 먼저 잡습니다. 프로젝트 ID만 조회해 권한을 확인하고, 잠금을 얻은 뒤 위치·작업 상태를 읽습니다. 그다음 위치 코드·재고·작업 행 잠금을 잡아, 코드 변경과 작업 완료가 서로 잠금을 기다리는 교착을 막습니다. 같은 프로젝트의 이 작업들은 차례로 처리됩니다.

먼저 시작한 코드 변경이 끝나기를 기다린 수정은 새 코드를 기준으로 적용됩니다. 설명만 수정해도 옛 코드로 되돌아가지 않고, 비활성화·삭제도 새 코드의 재고를 검사합니다. 기다리던 작업 계획은 변경된 출발 위치를 저장합니다.

화면의 위치 수정 성공 시 진행 중이던 위치·재고·작업·거래 이력 조회를 취소하고 해당 캐시를 갱신합니다. Stock·Tasks 탭을 미리 열었어도 수정 직후 새 코드로 조회하며, 늦게 도착한 옛 응답을 캐시에 넣지 않습니다. 거래 이력 조회 키에는 프로젝트가 없어 거래 이력 캐시 전체를 갱신합니다.

## 기존 위치 받아들이기

`POST /storage-locations/adopt-used?projectId=` — 재고 행이 쓰고 있는 위치 중 목록에 없는 것을 `location` 종류의 최상위 위치로 추가합니다(대소문자 무시로 중복 제거, 처음 본 표기 사용). 목록을 처음 켤 때 기존 재고가 "목록에 없는 곳"에 남지 않게 하려는 것입니다. 추가한 위치를 돌려줍니다. 나중에 편집에서 부모를 붙여 계층에 넣습니다.

## API

| 요청 | 권한 | 설명 |
|---|---|---|
| `GET /storage-locations?projectId=` | 읽기 | 트리 순서(부모 다음 자식)로 전체. 각 위치에 `path`("S1 / WH1 / Z1"), `depth`, `stockRecords`(재고를 가진 행 수), `itemCount` |
| `POST /storage-locations` | 쓰기 | `{projectId, locationCode, locationType, parentLocationId?, locationName?, note?}` |
| `PUT /storage-locations/{id}` | 쓰기 | 준 필드만 변경. `clearParent: true`는 최상위로, `active: false/true`, 빈 이름·메모는 지움 |
| `DELETE /storage-locations/{id}` | 쓰기 | 소프트 삭제(L7) |
| `POST /storage-locations/adopt-used?projectId=` | 쓰기 | 위 "기존 위치 받아들이기" |

## 화면

재고 → **Locations** 탭
- 표: 코드(깊이만큼 들여쓰기), 이름, 종류, 경로, 재고(행·품목 수), 상태, Edit / Deactivate·Activate / Delete
- 안에 위치가 있는 위치는 재고 칸에 안쪽까지 합친 값을 덧붙임(2026-10-03): `empty · with places inside: 1 record, 1 item`. 보유나 예약이 있는 재고 행과 그 품목 수이고, 행의 위치 코드를 대소문자 무시로 목록에 맞춰 그 위치와 바깥 위치 모두에 셈. 목록에 없는 코드의 행은 어디에도 세지 않음. 화면이 이미 불러온 재고 목록으로 계산(`stockWithin`, 서버 변경 없음)
- 검색(코드·이름·경로), 비활성 보기
- 재고 행이 쓰지만 목록에 없는 위치가 있으면 개수와 앞 5개를 보여 주고 **Add them as locations** 버튼
- 오른쪽 폼: 코드, 이름, 종류, Inside(바깥 종류의 활성 위치만, 자기와 자기 안쪽 제외), 메모. 종류를 바꾸면 담을 수 없는 부모는 비움. 추가 후 종류와 부모를 유지해 같은 선반의 bin을 연달아 넣기 쉬움

Stock 탭의 위치 입력(Add Stock, 행 편집)과 **Move to another place**의 도착 위치는 목록의 활성 위치를 제안합니다(`datalist`). 목록이 비어 있으면 제안이 없고 자유 입력 그대로입니다. 서버 거절 메시지는 기존처럼 폼에 보입니다.

## 위치 라벨 (L10)

- Locations 탭 거르기 줄 끝 **Print labels**: 지금 보이는(검색·비활성 거르기 반영) 활성 위치의 라벨을 새 창에 냄. 창 위 **Print**와 `N labels`, 라벨마다 바코드·코드(크게)·`WH-A / BIN-1 · bin`. 인쇄할 때는 버튼이 숨고 테두리가 옅어짐. 팝업이 막히면 `Allow pop-ups for this site to print labels.`
- 바코드는 앱 안에서 그림(SVG). 막대 표는 python-barcode 0.16.1의 Code 128 표를 그대로 옮겼고, 체크값은 (104 + Σ 자리 × 값) mod 103, 양쪽 여백 10모듈

- 위치 수정 폼(2026-10-03, L7): 재고가 있는 위치를 고칠 때 Code 아래 `A new code moves the N stock record(s) and warehouse tasks here along.`, 코드를 바꿔 저장하면 확인창(`… holds stock in N records. Rename it to … and move them, and its warehouse tasks, along?`)

## 검증

- 위치 계층별 합계(2026-10-03): `locationModel.test.ts` `stockWithin`(bin·zone·warehouse·site로 올라가며 합침, 대소문자 무시, 보유·예약 0인 행·목록 밖 코드·위치 없는 행 제외, 품목은 중복 없이). 실 화면 `e2e/storage-locations.spec.ts`: bin에 재고를 둔 뒤 warehouse 줄 `empty · with places inside: 1 record, 1 item`. 이어서 Count 탭 **Place**에서 warehouse를 고르면 bin 행만, 목록 밖 위치 행은 없음. `locationModel.test.ts` `codesWithin`

- `StorageLocationIntegrationTest` 2건(각자 새 프로젝트를 만들어 데모 프로젝트의 자유 입력 위치를 쓰는 다른 테스트에 영향 없음)
  - 계층: S1 > WH1 > Z1 > B1 생성, bin 안의 bin·zone 안의 warehouse 400, `wh1` 중복 409, 없는 종류 400, 목록 순서와 `path`·`depth`, 자식 bin을 가진 zone을 bin으로 변경 400, 자기 bin 안으로·자기 안으로 이동 400, 최상위로 이동과 이름 변경, 자식 있는 위치 삭제 409, 권한 없는 사용자 403
  - 재고: 목록 없을 때 자유 입력 200 → adopt 1건(`stockRecords` 1) → 목록에 없는 위치 Add Stock 400, `wh-2`로 등록하면 `WH-2`로 저장, 없는 곳으로 이동 400, `wh-2`로 이동하면 기존 행 재사용, 재고 있는 위치 비활성화·삭제·코드 변경 409, 재고를 뺀 뒤 비활성화 200, 비활성 위치 Add Stock 409, 입고 가져오기 미리보기에서 목록에 없는 위치 행 오류, 빈 위치 삭제 200
- 기존 백엔드 테스트(재고 이동 4건, 입고 가져오기, `InventoryServiceImplTest` 등) 포함 전체 430건 중 새 실패 없음(실패 1건은 다른 작업자의 진행 중인 포트 테스트)
- 실 화면 `e2e/storage-locations.spec.ts`(REAL_API_E2E, CI browser-e2e에 추가): 새 프로젝트에서 자유 입력 재고 1건 → Locations 탭에 "목록에 없는 위치" 안내와 **Add them as locations** → 행에 `1 record, 1 item` → 폼으로 warehouse와 그 안의 bin 추가, 경로 `WH-… / B-…` 표시 → 재고 있는 위치 Deactivate 시 서버 메시지 표시 → 목록 밖 위치 등록 400, 소문자 bin 코드 등록 시 목록 표기로 저장 → Stock 탭의 위치 제안에 두 위치 → 자식 있는 위치 Delete 시 서버 메시지. 2026-10-03부터 Analysis 탭 **Place**로 창고를 고르면 보유 `6 kg` → `1 kg`(그 안의 bin만, [재고 흐름 분석](stock-analysis.md) A5), Stock 탭 경보에서 bin 행(최소 5)의 low 경보가 **Alerts at place** 창고로 `1 stock alert at WH-…`, 느슨한 위치로 `No open stock alerts at …`. 끝나면 프로젝트 삭제
- `locationModel.test.ts` 7건: 안쪽 위치 찾기, 부모 후보(바깥 종류·활성·자기와 안쪽 제외·현재 비활성 부모 유지), 제안 코드, 목록에 없는 사용 위치, 검색, 생성·수정 요청 본문
- 위치 라벨(2026-10-03, L10): `labelModel.test.ts` — python-barcode가 만든 `Bin-a1`·`WH-A`·`Shelf 2/b` 모듈과 같음, 빈 값·한글·탭은 바코드 없음, SVG 여백(99 = 79 + 20)·막대 수, 시트의 라벨 수·HTML 이스케이프·바코드 없음 문구. 그린 라벨 네 개(`WH-A`, `loose-k3x9`, `Shelf 2/b`, `B-MUS6XB1Z`)를 Chromium으로 찍어 zbar로 읽으면 모두 CODE128로 같은 코드. 실 API E2E `e2e/storage-locations.spec.ts`: 위치 셋을 만든 뒤 **Print labels** → 새 창에 라벨 3개, `Barcode B-…` 그림, `WH-… / B-… · bin`, `3 labels`
- 재고 있는 위치의 코드 변경(2026-10-03, L7): `StorageLocationIntegrationTest`
  - 둘째 테스트를 바꿈: 재고 있는 WH-2 → WH-9 200(`stockRecords` 1, 행 위치 WH-9), 옛 코드로 새 재고 400, 다시 WH-2
  - 셋째: 열린 putaway의 출발·도착 위치가 새 코드로 바뀌고 그 작업 완료 200, 자유 입력 attic 행이 있는 코드로 바꾸면 409
  - 넷째(동시성): 같은 순간 코드 변경과 옛 코드로 새 재고를 세 번 → 코드 변경은 늘 200, 새 재고는 200(먼저 들어와 따라감)이나 400, 옛 코드 행 0. `resolveForStock`의 잠금을 빼고 돌리면 두 번 모두 옛 코드에 행이 남아 실패함을 확인
- 재고 이동·창고 작업·가져오기 통합 테스트(`InventoryTransferIntegrationTest` 5, `WarehouseTaskIntegrationTest` 4, `StockImport*` 2) 통과. 실 API E2E `e2e/storage-locations.spec.ts` 끝: 통 위치 Edit → 안내 문구 → 코드 `…-R` 저장(확인창 수락) → 목록 줄 `1 record, 1 item`, 재고 행 위치 `…-R`

### 동시성·화면 회귀 (2026-10-04)

- `StorageLocationConcurrencyIntegrationTest` 9건 통과. 수정 전에는 9건 모두 실패했고, 완료·이름 변경 경합에서 실제 PostgreSQL 교착(SQLState `40P01`)을 확인했습니다.
- 기다리던 코드 변경·설명 변경·비활성화·삭제 4건, 기다리던 작업 계획 1건, 출발·도착 위치 변경과 전체·부분 완료의 조합 4건입니다.
- `useStorageLocations.test.ts` 2건과 가짜 API `e2e/storage-location-rename.spec.ts` 1건 통과. Stock·Tasks 캐시를 먼저 채운 뒤 코드 변경 → 두 탭의 즉시 새 코드 표시를 확인했습니다. 실제 로그인·개발 DB 쓰기 없이 검사했습니다.

## 이후

- ~~위치별(창고별) 재고 분석~~ → [재고 흐름 분석](stock-analysis.md) A5(2026-10-03)

- ~~Putaway/Pick 작업 지시(FM-WMS-002 나머지)~~ → [창고 작업](warehouse-task.md)으로 구현(2026-09-27, V31)
- 위치별 용량·보관 조건(냉장 등)과 품목 보관 조건 대조
- ~~위치 코드 변경 시 재고 행 위치 일괄 변경~~ → L7(2026-10-03). 이동 이력·실사 이력의 위치 칸은 재고 행의 지금 위치라 옛 이동도 새 코드로 보임([재고 이동 이력](stock-ledger.md) "한계")
- ~~재고 경보를 위치 계층(창고 단위)으로 묶어 보기~~ → Stock 탭 경보의 **Alerts at place**(2026-10-03, [재고 경보](stock-alert.md) 화면). 위치 목록의 계층별 재고 행·품목 합계와 실사의 **Place** 거르기(그 위치와 안쪽 위치의 행만, 실사표 내려받기에도 적용)도 2026-10-03 구현
