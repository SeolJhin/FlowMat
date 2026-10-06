# BOM 부산물·폐기물 줄 (By-product / Waste)

상태: **구현(2026-09-27).** 출처: [벤치마크](../reference/benchmarks/FlowMat_GitHub_Benchmark_2026-09-24.md) FM-MFG-002 By-product / Waste("BOM output을 완제품 하나로 제한하지 않는다"). **새 마이그레이션 V34**(`bom_line.line_type` CHECK). `line_type` 열은 V1부터 있었고 늘 `material`이었습니다.

## 왜 필요한가

오렌지 주스를 짜면 껍질(팔 수 있는 부산물)과 찌꺼기(버리는 폐기물)가 함께 나옵니다. 지금까지 BOM은 들어가는 자재만 적을 수 있어서, 한 배치에서 무엇이 얼마나 함께 나오는지는 작업자가 기억해야 했습니다.

## 모델

BOM 줄마다 `lineType`:

| 값 | 뜻 |
|---|---|
| `material`(기본) | 배치가 쓰는 자재. 전과 같음 |
| `by_product` | 배치가 함께 내는 부산물(재고로 받을 수 있는 것) |
| `waste` | 배치가 내는 폐기물 |

수량·단위는 자재 줄과 같이 "기준 수량당"입니다. 줄 추가(`POST /boms/{id}/lines`)에 `lineType`을 줍니다. 비우면 `material`, 그 밖의 값은 400 `lineType is material, by_product or waste.` DB도 V34 CHECK로 막습니다.

## 규칙

- 부산물·폐기물 줄에도 자재 줄의 승인 검사가 그대로 적용됩니다: 수량 > 0, 활성 품목, BOM의 대상 품목이 아님, 같은 품목 두 줄 금지, 단위 환산 가능.
- **소요량**(`GET /boms/{id}/requirements`, 생산 시작의 계획 행, 준비 점검, 간이 MRP, 피킹 목록, 다단계 전개)은 **자재 줄만** 셉니다. 부산물·폐기물은 응답의 `outputs`로 따로 나옵니다(`bomLineId`, `itemId`, `lineType`, 줄 단위 수량, 품목 단위 수량 4자리). 원가에 넣지 않습니다.
- **만들 수 있는 양**(buildable)은 자재 줄만 봅니다. 부산물 재고가 없어도 제한하지 않습니다.
- **다단계 BOM**의 트리·순환 검사는 자재 줄만 따라갑니다([다단계 BOM](multi-level-bom.md)). 부산물로 나오는 품목의 BOM이 이 제품을 써도 순환이 아닙니다.
- **새 revision·복사**는 줄 종류를 그대로 옮깁니다. 자재 CSV 가져오기는 선택 열 `type`(`line_type`·`kind`)로 줄 종류를 받습니다(2026-10-03). 비우면 자재, 그 밖의 값은 그 줄의 오류(`Type must be material, by_product or waste, not emission`). 부산물·폐기물 줄은 "이 BOM의 품목으로 되돌아오는지"(순환) 검사를 하지 않습니다(소비가 아니라 나오는 것이므로, 승인 검증과 같음).
- **역전개(where-used)** 응답에 `lineType`이 붙어, 품목을 쓰는 BOM과 그 품목을 내는 BOM을 구별합니다.
- **생산 실행**은 부산물을 자동으로 기록하지 않습니다. 실행 화면이 예상량을 보여 주고, 작업자가 받을 재고 행을 골라 출력(output)으로 기록합니다. 계획 출력 행을 자동으로 만들지 않은 이유: LOT 없는 출력 행을 계보 재구성이 다루지 않기 때문입니다.

## 화면

- 재고 → BOMs: 목록 줄에 `2 materials · 1 by-product`. 상세의 줄에 `· by-product` / `· waste`. 줄 추가 폼에 **Line type**(Material / By-product / Waste). 소요량 표 아래 **Comes out of the batch**: 품목 · 종류, `comes out 5 kg`
- 품목의 where-used: 부산물·폐기물이면 `gives off 0.5 kg per 1 kg (by-product)`
- 생산 실행 상세: 기록 표 아래 **Also comes out**: 품목 · 종류, `expected 5 kg`, `recorded 3.5`(취소·계획 행 제외), 열린 실행이면 **Record** — 남은 양을 출력으로 기록 폼에 채움(받을 재고 행은 작업자가 고름)
- 끝난 실행(2026-10-03, 프런트만): **Also comes out**의 기대량을 실행이 만든 양(`actualOutputQty`)에 맞춰 줄이고(`expected 1.6 kg for 16 made`), Record 자리에 차이 `1.1 kg short`(주황)·`0.2 kg over`·`as expected`. 계획량이 0이면 BOM 배치 양 그대로. 상태가 `finished`인 실행만(취소 등은 열린 실행처럼 차이 없음)
- 생산 실행 상세 → **Finish Run**(2026-10-03, 프런트만): 부산물·폐기물이 덜 기록됐으면 Finish 버튼 위에 `Not all that comes out is recorded: BRAN · bran 0.5 of 1.6 kg, DUST · dust 0 of 0.4 kg.`(주황, `role=note`), 종료 확인창에도 같은 문장. 기대량은 계획 배치의 양을 **마감하는 생산량**에 맞춰 줄임(입력한 실제 생산량, 없으면 실행이 기록한 제품 출력, 그것도 없으면 계획). 기대보다 많이 기록한 것은 알리지 않고, 마감을 막지 않음. "Also comes out"과 같은 조회를 써서 요청이 늘지 않음

## 검증

- `BomByProductIntegrationTest`: 주스 1 kg = 오렌지 2 kg, 껍질 0.5 kg(by_product), 찌꺼기 0.3 kg(waste) → 줄 종류 응답, `emission` 400, 승인 200. 10 kg 소요량: 자재 1줄(오렌지 20), `outputs` 2줄(껍질 5·찌꺼기 3). 오렌지 재고 4 → 만들 수 있는 양 2, 제한 자재 오렌지, 계산 줄 1개. 껍질 where-used `by_product`. 껍질 BOM이 주스를 자재로 써도 제출 200(순환 아님). 새 revision이 줄 종류 유지. 실행 시작 → 계획 행 1개(오렌지)
- 기존 BOM·다단계·buildable·가져오기 테스트 포함 전체 백엔드 446건 통과
- 자재 CSV 종류 열(2026-10-03): `BomLineImportIntegrationTest` 둘째 — 오렌지(빈 종류)·껍질 `by_product`·찌꺼기 `emission` 미리보기 → 오류 1(종류) → `" By_Product "`·`waste`로 저장 → 줄 종류 material·by_product·waste. `bomModel.test.ts` `bomLinesFromCsv` 종류 열. 가짜 API E2E `e2e/bom-by-products.spec.ts` 끝: `item_code,quantity,unit,type` 파일 → 미리보기 요청 줄에 `lineType: waste`. 같은 변경에서 `BomLineImportService`가 `ItemRepository` 대신 `CatalogQuery.findProjectItems`를 씀(ADR-002 Stage B, `CatalogItemView`에 `itemStatus`, `ItemStatusRule`에 코드·상태 버전, 동결 89 → 88)
- `bomLineTypeModel.test.ts` 4건(태그·요약, 실행이 기록한 출력 합계, 마감 알림: 20 계획·16 생산이면 기대 1.6 kg·0.4 kg, 다 기록하면 없음, 계획량 0이면 계획 그대로, `finishOutput` 입력 > 제품 출력 > 계획, 끝난 실행 `finishedByProduct`: 2 kg/20·16 생산·0.5 기록 → 기대 1.6·차이 −1.1, 1.8 기록 → +0.2, 생산 0 → 0, `differenceText` short·over·as expected)
- 화면 `e2e/byproduct-finish.spec.ts`(2026-10-03, **가짜 API**, CI의 일반 browser-e2e 단계에 포함): 빵 20 계획·16 기록·밀기울 0.5 kg → 알림 `BRAN · bran 0.5 of 1.6 kg, DUST · dust 0 of 0.4 kg` → 실제 생산량 20 입력하면 `0.5 of 2 kg … 0 of 0.5 kg` → Finish 확인창에 같은 문장(취소해서 마감하지 않음) → 가짜 실행을 `finished`·16 생산으로 바꿔 다시 열면 밀기울 줄 `expected 1.6 kg for 16 made`·`recorded 0.5`·`1.1 kg short`, 먼지 `0.4 kg short`, Record 버튼과 마감 알림 없음
- 화면 `e2e/bom-by-products.spec.ts`: **API를 가짜로 대신해**(개발 DB에 BOM을 넣지 않음) 목록 `1 material · 1 by-product`, 껍질 줄 `by-product`, 폐기물 줄 추가 시 요청 본문 `lineType: waste`와 줄 태그. CI browser E2E 단계에서 함께 돎

## 2026-10-05 확정: 부산물 가치와 배출

**Accepted (정책).** B 승인. 부산물 가치는 재료비와 별도 표시. 폐기 처리비는 별도 비용 component, Item.unitCost 재사용 금지. 배출량은 EmissionFactor 별도 모델로 보류, BOM emission line 추가 금지. 아래 메모는 검토 이력이며 구현 전이다. [최종 결정](../status/DECISIONS-2026-10-05.md)이 아래 예전 선택지보다 우선한다.

## 결정 메모: 부산물 가치와 배출 (Proposed, 2026-10-04)

> **결정이 아니다.** [WORKBOARD](../status/WORKBOARD.md) §4의 제품 규칙 묶음 중 부산물 쪽을 고르기 위한 자료다. 고르기 전에는 구현하지 않는다.

- 지금 코드: 줄 종류는 `material`·`by_product`·`waste`(V34 CHECK). 재료비([재료비](material-cost.md))는 자재 줄만 더한다. 부산물·폐기물 품목도 단가 열은 있다.
- 부산물 가치 선택지
  - A: 재료비에서 부산물 가치(양 × 단가)를 빼서 순 재료비로 보여 줌
  - B: 재료비는 그대로 두고 "부산물 가치"를 따로 한 줄 보여 줌(빼지 않음)
  - C: 폐기물 처리 비용을 단가로 받아 더함
- 배출(`emission`, CO₂ kg 같은 것) 선택지
  - A: 줄 종류에 `emission`을 더함(CHECK를 바꾸는 마이그레이션). 재고가 아니므로 출력 기록·재고 행이 없어야 함
  - B: BOM 줄이 아닌 배출 계수 표(품목·공정별 kg/단위)
- **권장안: 가치는 B, 배출은 결정 보류.** B는 금액을 어디서 빼는지(회계 방식)를 정하지 않고도 보여 줄 수 있다. A·C는 실행 원가 결정([재료비](material-cost.md) 메모)과 함께 정한다. 배출은 재고 흐름(출력 기록·재고 행)과 섞이지 않게 B 쪽이 안전하지만, 무엇을 보고해야 하는지(범위·단위)가 먼저다.

## 이후

- 부산물의 가치(원가 공제)와 폐기물 처리 비용을 재료비에 반영
- ~~실행 마감 시 예상 대비 부산물 기록 차이 표시~~ → 위 "화면"의 Finish Run 알림(2026-10-03). 끝난 실행의 차이는 위 "화면"의 끝난 실행(2026-10-03, 프런트만, 저장하지 않음)
- `emission`(배출) 같은 종류와 단위(CO₂ kg)
- ~~자재 CSV에 종류 열~~ → 위 규칙(2026-10-03)

## 기록된 부산물 가치 표시 (2026-10-06)

승인 정책 B의 별도 조회·표시 구현. `GET /production-runs/{id}/by-product-value`는 Project read 권한이 필요하다. 재고·BOM·실적을 변경하거나 저장 금액을 만들지 않는다.

| 규칙 | 처리 |
|---|---|
| B1 | 실행에 고정된 `bomId`의 `by_product` 품목만 분류. 새 revision이나 retire로 다른 BOM을 고르지 않는다. BOM 없는 실행의 임의 출력은 부산물로 추정하지 않음 |
| B2 | 실제 수량이 있는 미취소 output만 합산. 계획 행·input·주제품·waste 제외. correction으로 취소된 원기록도 제외하고 살아 있는 보정 출력만 합산 |
| B3 | 모든 출력량을 품목 단위로 환산해 합산한 뒤 소수 4자리 HALF_UP. 수량 × 품목 단위 가격이 부산물 가치. 환산 미상은 quantity=null, 가격/환산 미상은 value=null로 보존, 전체는 valueComplete=false와 아는 값의 subtotal |
| B4 | D+와 같은 가격 기준: 진행 중 현재, 완료는 원 마감 시각 가격, 시각/가격 이력 부족이면 ESTIMATED. 과거에 가격이 미상이었던 기록을 현재 가격으로 덮지 않음. 원 마감 시각 저장은 별도 미완료 범위로 유지 |
| B5 | public `BomOutputQuery`와 `CatalogQuery`/`CatalogUnitCostQuery`로 읽으며 다른 context Repository를 추가하지 않음. 다른 프로젝트 품목의 이름·코드·가격 숨김, 다른 프로젝트 BOM 분류·없는/삭제 실행은 404 |
| B6 | 실행 Material cost 안에 **By-product value** 표를 별도로 표시. 총 가치 또는 아는 가치 소계와 가격 기준·estimated 표시. 출력 기록/취소/보정/마감 후 기존 production-run-items 캐시 무효화로 다시 조회. 재료비·단위당 재료비에서 차감하지 않음 |

폐기 처리비와 EmissionFactor는 구현하지 않았다. 폐기물에 Item.unitCost를 대입하지 않는다. 통합 테스트와 모의 API 브라우저 검증 결과는 [WORKBOARD](../status/WORKBOARD.md) §2 2bp에 기록한다.
