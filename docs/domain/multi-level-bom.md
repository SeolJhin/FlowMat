# 다단계 BOM (Multi-level BOM)

상태: **구현(2026-09-27).** 출처: [벤치마크](../reference/benchmarks/FlowMat_GitHub_Benchmark_2026-09-24.md) FM-MFG-001 Multi-level BOM(cycle detection, recursive explosion, revision consistency). 1차 계약([재고·BOM·LOT 계약](inventory-bom-lot-contract.md) §5 승인 검증 7)의 "다단계 금지"를 대신합니다. 마이그레이션 없음.

## 무엇이 바뀌었나

전에는 자재가 자기 승인 BOM을 가지면(반제품) BOM 승인을 거절했습니다. 이제는:
- 자재가 자기 승인 BOM을 가져도 됩니다. 그런 자재를 **반제품(sub-assembly)** 이라 부릅니다.
- 대신 **자기 자신을 품는 BOM(순환)** 과 **10단계보다 깊은 BOM** 을 거절합니다.
- 생산 실행은 전과 같이 **바로 아래 자재만** 투입합니다. 반제품은 재고 품목이며, 모자라면 반제품의 작업지시로 만듭니다.
- 다단계 전개(explosion)와 간이 MRP의 다단계 순소요 계산이 생겼습니다.

## 승인 검증

`BomTree`(bom 패키지)가 프로젝트의 승인 BOM을 품목 트리로 봅니다(품목 → 그 승인 BOM의 자재). 검사하는 revision의 대상 품목은 이 revision이 기존 승인본을 대신하므로 트리에서 뺍니다.

| # | 규칙 | 위반 메시지 |
|---|---|---|
| M1 | 어떤 자재에서 승인 BOM을 따라 내려가도 이 BOM의 대상 품목에 닿으면 안 됨(순환) | `Material SUB is made from PROD through its own BOM (SUB → … → PROD); a BOM cannot contain itself.` |
| M2 | 이 BOM부터 자재들의 승인 BOM을 따라 내려간 깊이가 10을 넘으면 안 됨 | `With its materials' own BOMs this BOM would be N levels deep; at most 10 are allowed.` |

제출(submit)과 승인(approve) 모두 검사합니다. 반제품의 새 revision이 상위 품목을 자재로 넣으면 그 revision이 거절됩니다. 자재 CSV 가져오기도 행마다 M1을 봅니다(`… is made from this BOM's item through its own BOM; a BOM cannot contain itself`).

## 전개(Explosion)

`GET /boms/{bomId}/explosion?quantity=`(읽기 권한). **승인본만**(아니면 400 `… production can only use an approved revision.`), `quantity`는 BOM 대상 품목의 기준 단위, 0보다 커야 함(없음·숫자 아님·0 이하 400).

- 단계마다 보통의 1단계 소요량 계산(`BomService.requirementsForRun`)을 윗단계가 필요로 하는 양으로 부릅니다. 단위 환산·반올림이 그 반제품을 실제로 만들 때와 같습니다.
- 자재가 승인 BOM을 가지면 그 BOM으로 한 단계 더 내려갑니다(경로에 이미 있는 품목·10단계 이상은 내려가지 않음 — 승인이 막으므로 방어용).
- 결과: 트리(깊이 우선, `level`, `parentItemId`, 반제품이면 `bomId`·`bomVersion`), **구매 자재 합계**(승인 BOM이 없는 자재를 트리 전체에서 합산, 코드 순), 구매 자재 단가 × 수량의 **재료비 합계**(`costComplete`: 단가 없는 구매 자재가 있으면 false), 계산할 수 없는 반제품(`problems`)
- 총소요(gross)입니다. 재고는 빼지 않습니다.

예: 케이크 1개 = 스펀지 2개 + 크림 0.5 kg + 설탕 0.1 kg, 스펀지 1개 = 밀가루 0.2 kg + 달걀 2개, 크림 1 kg = 우유 0.8 kg + 설탕 0.2 kg. 케이크 10개 → 2단계, 트리 7줄, 구매 자재 밀가루 4·달걀 40·우유 4·설탕 2(케이크 1 + 크림 1), 단가 2·0.5·1·3이면 재료비 38.

## 간이 MRP의 다단계 순소요

[열린 작업지시 자재 소요](material-requirements.md)에 더해진 것:
- **예정 공급**(`plannedSupply`): 승인·진행 중 작업지시 중 그 품목을 만드는 것의 남은 수량 합
- **부족** = 필요 − 가용 − 예정 공급(0 미만 없음)
- **반제품 전개**: 필요 목록에 있는 반제품(승인 BOM이 있는 품목, `madeHere`)을 **low-level code 순**(트리에서 가장 낮게 나타나는 단계)으로 처리합니다. 반제품의 필요 − 가용 − 예정 공급이 0보다 크면 그만큼을 그 승인 BOM으로 계산해 자재 필요에 더합니다. 이 몫은 작업지시 대신 `viaItemId`·`viaItemCode`로 표시합니다. low-level code 순서 덕분에 반제품의 모든 상위 수요가 들어온 뒤에 전개됩니다
- 반제품의 BOM을 계산할 수 없으면 `problems`에 적고 넘어갑니다

예: 위 케이크 10개 작업지시(승인), 스펀지 재고 5 → 스펀지 필요 20·가용 5·부족 15(`madeHere`), 스펀지 15개를 만들 밀가루 3·달걀 30은 `via 스펀지`. 크림은 재고가 없어 5 kg 전부 전개 → 우유 4·설탕 1(via 크림), 설탕 합계 2(케이크 직접 1 + via 크림 1). 스펀지 15개 작업지시를 승인하면 스펀지 예정 공급 15·부족 0, 케이크 쪽 스펀지 전개는 없어지고 밀가루 3·달걀 30은 스펀지 작업지시의 직접 필요가 됩니다.

## 다단계 역전개 (2026-10-02)

`GET /boms/where-used/all-levels?projectId=&itemId=`(읽기 권한). 한 단계 where-used(`GET /boms/where-used`)는 그대로 두고, 이 API는 **승인 BOM만** 따라 위로 올라갑니다: 그 품목을 자재로 쓰는 승인 BOM → 그 BOM의 제품을 자재로 쓰는 승인 BOM → … 어떤 승인 BOM도 쓰지 않는 **최상위 제품**까지. 마이그레이션 없음(`BomWhereUsedTreeService`).

| # | 규칙 |
|---|---|
| W1 | 승인 BOM의 자재 줄만 따라감. 초안·승인 대기·폐기 revision, 부산물·폐기물 줄은 뺌(만드는 쪽이 아니라 나오는 쪽) |
| W2 | 줄마다 "제품 1단위당 자재" = 줄 수량(자재 단위로 환산) ÷ 배치 크기(제품 단위로 환산). 경로를 따라 곱해서 `perProductUnit`(찾은 품목 단위) |
| W3 | 최상위 제품의 `perUnit`은 그 제품에 닿는 **모든 경로의 합**(예: 설탕이 케이크에 바로 0.1, 크림을 거쳐 0.1 → 0.2), `routes` 경로 수, `levels` 가장 긴 경로 |
| W4 | 환산할 수 없는 줄은 그 경로의 양을 `null`로 두고 `problems`에 적음(나머지는 계속). 최상위 합계에 `null` 경로가 있으면 합계도 `null` |
| W5 | 순환·10단계 초과는 승인이 막지만 방어로 경로에 이미 있는 품목·10단계 넘는 곳은 내려가지 않음 |
| W6 | 응답 `uses`는 깊이 우선(직접 쓰임 다음에 그 제품의 쓰임), 같은 단계는 제품 코드 순. `path`는 찾은 품목부터 그 제품까지의 코드 |

없는 품목·다른 프로젝트 품목 400, 외부인 403.

화면: 재고 → BOMs의 **Where is a material used?**에서 품목을 고르고 **All levels, through approved sub-assemblies up to the top products**를 켜면, 위에 `Top products: CAKE needs 0.2 kg per ea (2 routes) · 2 levels`, 아래 표에 단계만큼 들여쓴 쓰임(`↳ CAKE … v1 · top`, BOM 줄 `CREAM 0.5 kg per 1 ea`, 찾은 품목 기준 `0.1 kg / ea`). 줄을 누르면 그 BOM이 열리고, 마우스를 올리면 경로(`SUGAR → CREAM → CAKE`). 끄면 전과 같은 한 단계 목록(모든 상태의 revision).

## 반제품 원가 누적 (2026-10-02)

`GET /boms/cost-rollup?projectId=`(읽기 권한, `BomCostRollupService`). 승인 BOM이 있는 모든 품목의 **단위당 재료비**를 트리 아래부터 올려 계산합니다. 마이그레이션 없음.

| # | 규칙 |
|---|---|
| R1 | 구매 자재(승인 BOM 없음)는 품목 단가. 반제품은 **자기 누적 원가**(저장된 단가가 아님) — 아래 자재 단가가 바뀌면 위 단계 모두에 반영 |
| R2 | 줄마다 제품 1단위당 자재(줄 수량 ÷ 배치, 단위 환산, 역전개와 같은 `BomTree.perProductUnit`) × 자재 원가. 부산물·폐기물 줄은 공제하지 않음 |
| R3 | 단가 없는 구매 자재는 빼고 더한 값(`rolledUpCost`, 소수 4자리) + `complete: false` + `missingCosts`(코드). 환산할 수 없는 줄은 `problems` |
| R4 | 초안·승인 대기 revision은 보지 않음(승인본만) |
| R5 | 응답은 단계 수(`levels`) 적은 순(반제품 먼저), 같으면 코드 순. 지금 품목 단가(`currentUnitCost`)를 함께 |

화면: 재고 → BOMs 목록 아래 **Cost roll-up**(접힘): `material cost per unit of N made items · M differ from their unit cost`. 열은 품목(누르면 BOM 열림)·단계·누적 원가(불완전하면 `≥` 와 주황 `no unit cost: …`)·지금 단가(누적 원가와 다르면 `+31.6%`처럼, 10% 넘으면 주황)·**Use**(완전한 누적 원가가 지금 단가와 다를 때만) — 누르면 품목 단가를 그 값으로 저장(`PUT /items/{id}`)하고 목록을 다시 받습니다. 그러면 한 단계 BOM 재료비·재고 금액이 그 단가를 씁니다.

## 준비 점검의 반제품 작업지시 (2026-10-03)

작업지시 준비 점검의 자재 표에서 부족한 자재가 반제품(자기 승인 BOM이 있는 품목)이면 그 반제품을 만들 작업지시를 바로 채울 수 있습니다. 프런트만 바뀌었고(서버·마이그레이션 없음) 아무것도 자동으로 만들지 않습니다.

- **만들 양** = 부족 − 다른 열린 작업지시가 더 만들 양. 열린 작업지시는 간이 MRP의 예정 공급과 같은 기준입니다: 승인·진행 중이고 그 품목을 만드는 작업지시의 목표 − 생산량(0 미만 없음), 초안은 세지 않고 점검 중인 작업지시는 뺍니다
- 만들 양이 0보다 크면 **Sub-assembly** 칸에 **Make 12**(이미 계획이 있으면 `(5 already planned)`), 0이면 `open work orders make 5`, 부족이 없으면 `own BOM`
- **Make**를 누르면 오른쪽 **New Work Order** 폼이 채워집니다: 제목 `SPONGE for WO-0001`, 대상 품목, 그 품목의 승인 BOM, 수량, **계획 끝 = 점검 중 작업지시의 계획 시작**(반제품이 먼저 끝나야 함). 폼 위에 `Filled in from WO-0001's readiness … Check it, then create.` 사용자가 확인하고 만들기를 눌러야 저장됩니다
- 재고 → Stock의 **Open work order needs**에서도(2026-10-03): 부족한 반제품 줄의 `made here · own BOM` 옆 **Make 20** 링크 → 실행 화면 Work Orders로 가서 같은 폼을 `SPONGE for open work orders`, 부족량(이미 예정 공급을 뺀 값), 승인 BOM으로 채우고 `Filled in from open work order needs …` 안내. 링크는 `?view=work-orders&make=품목&quantity=수량`이며 아무것도 자동으로 만들지 않습니다
- 준비 점검 API는 그대로입니다. 반제품 여부는 화면이 이미 읽는 BOM 목록(승인본의 대상 품목)으로, 예정 공급은 작업지시 목록으로 계산합니다. 서버 쪽 `WorkOrderReadinessService`는 ADR-002 동결 위반 6줄이 있어 손대지 않았습니다

## 모든 단계 한 번에 (2026-10-03, 커밋 전)

프런트만. 재고 → Stock의 **Open work order needs**에서, 열린 작업지시가 남기는 부족을 **모든 단계의 반제품**에 대해 한 번에 초안 작업지시로 만듭니다. 간이 MRP가 이미 low-level code 순으로 전개하므로(위 "간이 MRP의 다단계 순소요") 아래 단계 반제품의 부족에는 위 단계 반제품을 만드는 몫(`via`)이 들어 있습니다.

| # | 규칙 | 이유 |
|---|---|---|
| S1 | 대상: `madeHere`이고 부족량 > 0인 줄. 수량 = 그 부족량, BOM = 그 품목의 승인 revision, 제목 `SPONGE for open work orders`(Make 링크와 같음) | 한 줄의 Make를 모든 줄에 한 번에 |
| S2 | 그 품목을 만드는 **초안** 작업지시가 이미 있으면 만들지 않고 `SPONGE already has draft WO-0101`로 알림. 승인·진행 중 작업지시는 이미 예정 공급으로 부족에서 빠져 있음 | 초안은 간이 MRP에 들어가지 않아(M1) 다시 누르면 두 번 만들어지므로 |
| S3 | 승인 BOM이 없거나 active가 아닌 품목은 만들지 않고 이유를 보여 줌 | 작업지시가 그 BOM으로 계획하므로 |
| S4 | 확인창에 품목·수량을 보여 준 뒤 하나씩 만들고, 거절되면 그 자리에서 멈추고 만든 것과 이유를 보여 줌. 승인은 Work Orders에서 따로 | 초안만 만들고 아무것도 예약하지 않음 |

- 화면: 표 위 **Draft N work orders for short sub-assemblies** 버튼과 `Not drafted: …`. 끝나면 `Drafted WO-0101 (SPONGE 20). Approve them on Work Orders.`와 **Open Work Orders** 링크. BOM·작업지시 목록은 부족한 반제품이 있을 때만 불러옴

## 화면

- 재고 → BOMs: BOM 자재 줄에 반제품이면 `· has its own BOM`. 승인본이고 반제품 자재가 있으면 소요량 표 아래 **Through sub-assemblies (all levels)**(펼침): `2 levels · 2 bought materials · cost 28`, 들여쓴 트리(반제품에 `· own BOM v1`), 구매 자재 표(합계·비용). 수량은 소요량 계산의 "Materials needed to make" 값을 씀
- 재고 → Stock의 **Open work order needs**: **Being made** 열(예정 공급), 반제품에 `made here · own BOM`, For 칸에 `via SPONGE 4`. CSV에 `being_made`, `made_here` 열 추가, work_orders 칸에 `via …`

## 검증

- `MultiLevelBomIntegrationTest` 2건(실제 Postgres)
  - 전개: 위 케이크 예 그대로 — 2단계, 7줄, 스펀지 1단계 20·자기 BOM id, 밀가루 2단계·부모 스펀지·4, 달걀 40, 우유 4, 구매 자재 4종·설탕 2·스펀지 없음, 재료비 38·완전. 수량 0·문자·없음 400, 초안 revision 400(`approved`), 외부인 403
  - MRP: 스펀지 재고 5, 케이크 10 작업지시 → 스펀지 20/5/부족 15/`madeHere`, 밀가루 3(`via` 스펀지), 달걀 30, 우유 4, 설탕 2(필요 2건). 스펀지 15 작업지시 승인 → 스펀지 예정 공급 15·부족 0, 밀가루 3의 첫 필요가 스펀지 작업지시
- 원가 누적(같은 클래스 네 번째): 단가 밀가루 2·달걀 0.5·우유 1·설탕 3 → 스펀지 1.4(1단계), 크림 1.4, 케이크 3.8(2단계, 전개의 10개 38과 같음)·완전·지금 단가 5·BOM id. 커스터드(2 kg당 우유 2 kg) 1.0 완전 — 커스터드 새 revision 초안과 바닐라 초안 BOM은 영향 없음. 플랜(커스터드 0.25 kg + 단가 없는 바닐라 10 g) → 0.25·불완전·`missingCosts` 바닐라. 외부인 403
- 실 화면(원가 누적, 2026-10-02): 밀가루 단가 2, 스펀지(1 ea당 200 g), 케이크(2 ea당 스펀지 4·밀가루 0.1 kg) → `CRS … 1 | 0.4 / ea | - | Use`, `CRC … 2 | 0.9 / ea | - | Use`. 케이크 Use → 지금 단가 0.9로 저장, Use 사라짐. 콘솔 오류 0. BOM 폐기·품목 삭제로 정리
- 다단계 역전개(같은 클래스 세 번째): 위 케이크 예 + 설탕을 쓰는 초안 BOM 하나. 설탕 → 쓰임 3줄(케이크 1단계 0.1·최상위, 크림 1단계 0.2, 케이크 2단계 via 크림 0.1·경로 3칸), 최상위 케이크 0.2·경로 2·2단계, 문제 0. 밀가루 → 스펀지 1단계, 케이크 2단계 0.4. 케이크 → 쓰임 없음. 없는 품목 400, 외부인 403
- 실 화면(2026-10-02): API로 밀가루(kg)→스펀지(1 ea당 200 g)→케이크(2 ea당 스펀지 4·밀가루 0.1 kg)를 만들고 승인 → 밀가루 All levels: `Top products: WUC… needs 0.45 kg per ea (2 routes) · 2 levels`, 줄 `WUC … · top | 0.1 kg per 2 ea | 0.05 kg / ea`, `WUS … | 200 g per 1 ea | 0.2 kg / ea`, `↳ WUC … | WUS 4 ea per 2 ea | 0.4 kg / ea`, 경로 툴팁 `WUF → WUS`. 콘솔 오류 0. BOM 폐기·품목 삭제로 정리
- `BomIntegrationTest` 다단계 테스트를 바꿈: 반제품이 있는 BOM 승인 200 → 반제품의 새 revision에 상위 품목을 넣으면 제출 400(`a BOM cannot contain itself`)
- `BomLineImportIntegrationTest`: 반죽의 승인 BOM이 빵을 쓰므로 빵 BOM에 반죽 줄 → 행 오류(`a BOM cannot contain itself`)
- 기존 `MaterialRequirementIntegrationTest` 포함 전체 백엔드 445건 통과
- `bomExplosionModel.test.ts` 2건(반제품 판정, 요약), `stockAlertModel.test.ts` needsCsv에 반제품 줄(`via LOAF 8`, `being_made` 5, `made_here` yes)
- 준비 점검의 반제품 작업지시(2026-10-03): `readinessModel.test.ts` `plannedSupply`(승인·진행 중만, 목표 − 생산량, 초안·완료·자기 자신·목표 없음 제외)·`subAssemblyToMake`(0 미만 없음, 소수 4자리). 화면 `e2e/sub-assembly-order.spec.ts`(**가짜 API**, BOM을 개발 DB에 넣지 않음, CI의 일반 browser-e2e 단계에 포함): 케이크 작업지시 Readiness → SPONGE 부족 17, 승인된 스펀지 작업지시 5 → `Make 12`·`(5 already planned)`, FLOUR(구매 자재)는 버튼 없음 → **Make** → 제목 `SPONGE for WO-0001`, 대상 sponge, 수량 12, BOM sponge v1, 계획 끝 `2030-01-07T09:00`(케이크 계획 시작, Asia/Seoul). `e2e/multi-level-bom.spec.ts` 끝(가짜 API): Open work order needs의 **Draft 1 work order for short sub-assemblies** → 확인 → 요청 본문 `SPONGE for open work orders`·sponge·20·sponge-bom, `Drafted WO-0101 (SPONGE 20)`, 그 뒤 버튼 대신 `Not drafted: SPONGE already has draft WO-0101`(모든 단계 한 번에, `stockAlertModel.test.ts` `subAssemblyDrafts`: 두 단계 초안, 구매 자재·부족 0 제외, 승인 BOM 없음·초안 있음·단종 이유, 승인된 작업지시는 막지 않음). 이어서 SPONGE **Make** 링크 → 제목 `SPONGE for open work orders`, 대상 sponge, 수량 20, BOM sponge v1
- 화면 `e2e/multi-level-bom.spec.ts`: **API를 가짜로 대신해**(개발 DB에 BOM을 넣지 않기 위해) BOMs 탭에서 케이크 BOM → `SPONGE … has its own BOM` → 10개로 전개 → `2 levels · 2 bought materials · cost 28`, 트리의 스펀지 `own BOM v1`, 밀가루 `4 kg`, 달걀 `40 ea` → Stock 탭 Open work order needs에 스펀지 `made here · own BOM`, 밀가루 `via SPONGE 4`, 달걀 `via SPONGE 40`. CI의 browser E2E 단계에서 함께 돎

## 2026-10-05 확정: 유효일 BOM과 팬텀

**Accepted (정책).** 유효일 B 승인: 기간 비중첩 다중 approved·자동 retire 금지·작업지시 plannedStartAt 기준 선택과 실행 revision 고정. 팬텀은 A(BomLine.phantom), Item 전역 플래그 권장안은 미채택. 여러 draft·품목당 pending 하나. 아래 메모는 검토 이력이며 구현 전이다. [최종 결정](../status/DECISIONS-2026-10-05.md)이 아래 예전 선택지보다 우선한다.

## 결정 메모: 유효일 BOM과 팬텀 반제품 (Proposed, 2026-10-04)

> **결정이 아니다.** [WORKBOARD](../status/WORKBOARD.md) §4의 제품 규칙 묶음 중 BOM 쪽을 고르기 위한 자료다. 고르기 전에는 구현하지 않는다.

- 지금 코드:
  - `bom_header.effective_from`·`effective_to`(V1 열)는 엔티티에 매핑돼 있지 않다. 세션 DB의 BOM 41개 모두 비어 있다.
  - 품목당 승인 revision은 하나이고, 새로 승인하면 이전 것이 retired. 이것은 D2의 "검토 대기" 항목이다([재고·BOM·LOT 계약](inventory-bom-lot-contract.md)).
  - 팬텀 표시는 줄에도 품목에도 없다.
- 유효일 선택지
  - A: 승인 revision 하나를 유지하고 유효일은 표시용으로만 둔다
  - B: 기간이 겹치지 않는 승인 revision 여럿을 허용하고, 작업지시·실행이 계획 시작일로 revision을 고른다
- 팬텀 선택지
  - A: BOM 줄에 팬텀 표시. 간이 MRP·준비 점검·실행 계획이 그 반제품을 재고·작업지시 없이 자재까지 바로 전개한다
  - B: 품목에 팬텀 표시(그 품목이 들어간 모든 BOM에 적용)
- **권장안: 유효일은 D2 결정과 함께. 팬텀은 B.**
  - 유효일 B는 D2의 "품목당 승인 revision 하나"를 바꾸는 일이라 그 결정이 먼저다. 그 전에는 A(지금과 같음)다.
  - 팬텀은 "재고로 두지 않는 품목"이라는 품목 성질이라 B가 자연스럽다. 전개 코드(`BomTree`, MRP 반제품 전개)는 이미 단계별로 내려가므로 "재고·예정 공급을 보지 않고 바로 전개"만 더하면 된다.

## 이후

- 팬텀(phantom) 반제품: 재고로 두지 않고 상위 실행에서 바로 자재까지 투입
- 대체 자재(`substitute_group`)·선택 자재·스크랩률(1차 계약 §5-6에서 아직 거절)
- ~~준비 점검에서 부족한 반제품에 "반제품 작업지시로 만들기" 안내~~ → 위 "준비 점검의 반제품 작업지시"(2026-10-03). ~~여러 단계 반제품을 한 번에~~ → 위 "모든 단계 한 번에"(2026-10-03, Open work order needs에서. 작업지시 하나의 준비 점검은 지금처럼 바로 아래 반제품만)
- 유효일자(effective date) 기준 revision 선택

## 유효기간 명령·날짜 조회와 여러 초안 (2026-10-06)

기간별 다중 승인 전환의 기반 구현이다. 기존 승인은 아직 이전 approved revision을 자동 retire한다. 작업지시 계획 시작일에 맞춘 자동 revision 선택과 팬텀 전개는 아직 적용하지 않았다. 프로젝트 시간대 정책은 Accepted이며, project 담당 범위 수정 허가를 기다리고 있다.

| 규칙 | 구현 |
|---|---|
| E1 | V1 `effective_from`/`effective_to`는 날짜로 매핑. null은 해당 방향 무제한, 시작·끝 포함. 양쪽 JSON 키는 필수이며 null로 명시적 해제. 역순·1~9999년 밖 날짜·비어 있는 사유 400 |
| E2 | `GET/POST /boms/{id}/effectivity`. 읽기는 Project read, draft 변경은 write, approved 변경은 owner, pending/retired 변경 409. 기존 날짜 version 0; V55의 단조 증가 version·변경 전/후 날짜·사유·작성자·시각 보존 |
| E3 | `expectedPeriodVersion`과 UUID requestId 사용. 같은 작성자의 정확한 재송신만 재생, 이미 뒤에 변경됐다면 현재 상태 반환. 오래된 version·다른 approved 기간과 overlap은 409. 헤더와 이력 저장은 한 트랜잭션 |
| E4 | 공개 `BomRevisionQuery.findEffective(projectId, targetItemId, on)`와 `GET /boms/effective?projectId=&targetItemId=&on=YYYY-MM-DD`. on은 명시적 프로젝트 달력 날짜이며 브라우저/서버의 오늘을 가정하지 않음. active approved만 고려, 일치 없음 404, 기존 겹친 데이터는 409(최신 revision 임의 선택 금지) |
| E5 | BOMs의 Effective periods에서 기간 편집·이력과 날짜별 revision 미리보기. viewer와 approved를 편집하는 editor는 변경 버튼 없음. 미확인 저장은 같은 UUID/값으로만 재시도, 409 뒤 원래 편집을 보존하고 명시적 최신 상태 불러오기 |
| D1 | approved/retired 원본에서 여러 초안 복사 가능. 번호는 삭제 이력까지 포함한 최대 번호 +1. 기간은 복사하되 새 초안의 기간 version은 0, 이전 변경 이력은 복사하지 않음 |
| D2 | 품목당 pending approval 하나. 동시에 제출해도 하나만 승인 대기, 나머지는 409·draft 유지. 반려 뒤 다른 초안 제출 가능 |
| D3 | 공통 품목 advisory lock → 헤더 최신 상태/행 잠금. 승인·제출·반려·폐기는 프로젝트 승인 그래프 lock → 품목 → 헤더 순서. 다른 품목의 상호 순환 후보도 동시에 승인 불가 |
| D4 | 자재 CSV는 초안 lock 뒤 기존 줄·상태를 검증. 동일 자재의 동시 append는 하나만 적용하고 다른 요청은 행 오류와 applied=false. 검사와 삭제/추가는 같은 트랜잭션 |

검증: `BomEffectivityIntegrationTest` 13건, `BomDraftConcurrencyIntegrationTest` 7건(독립 Postgres/Testcontainers), `bom-effectivity.spec.ts` 기간·권한·충돌·정확한 재송신·날짜 경계/결과 해제, `bom-multiple-drafts.spec.ts` 초안 둘과 단일 pending. 브라우저 API는 전부 가짜로 응답하여 개발 DB에 BOM을 넣지 않는다. #44의 Revision locator는 select의 combobox 역할과 정확한 이름으로 수정했다.

남은 연결: Project.timeZone 조회/설정 → 작업지시 plannedStartAt의 프로젝트 날짜 → 승인 기간 overlap 검증과 자동 retire 제거 → 날짜별 반제품 트리/MRP/원가 조회 → 실행에 선택 revision 상속. 이 연결을 끝내기 전 전체 유효일 BOM 기능을 완료로 올리지 않는다. 기존 V1–V55는 수정하지 않는다.
