# LOT 유효기한

상태: **구현(2026-09-24).** `lot_master.expiry_date`는 V1부터 있었고 LOT 등록 때 입력할 수 있었지만, 어디에서도 쓰지 않았습니다. 이제 기한이 지난 LOT를 생산에 쓰지 못하게 합니다. **새 마이그레이션 없음.**

## 결정 (2026-09-24, 세션 1)

| # | 결정 | 이유 |
|---|---|---|
| E1 | **만료일 당일까지 사용 가능, 다음 날부터 만료.** 기준일은 서버의 오늘 날짜(`LocalDate.now()`) | 표시된 날짜까지는 쓸 수 있다는 일반적인 뜻 |
| E2 | 만료는 **날짜로 계산**하고 `lot_status`에 저장하지 않음 | 날이 바뀔 때 상태를 바꾸는 배치가 필요 없고, 격리·종료 같은 기존 상태와 겹치지 않음 |
| E3 | 만료된 LOT의 재고는 **`production_input`, `reserve` 거절(409)** | 생산 투입과 생산용 예약이 막아야 할 대상 |
| E4 | **`issue`, `adjustment`, 역분개, 격리는 허용** | 만료품을 폐기(출고)하거나 정리할 수 있어야 함 |
| E5 | 검사는 재고 명령 한 곳(`InventoryCommandService.apply`)에서 함 | 실행 기록, 보정 전표의 투입 추가, 외부 재고 API가 모두 같은 규칙을 따름 |
| E6 | 작업지시 준비 점검에서 만료 LOT 재고는 **가용량에서 뺌** | 실제로 투입할 수 없는 재고를 준비됨으로 세지 않음 |
| E7 | 이미 기록된 투입은 그대로 둠 | 과거 기록을 소급해 바꾸지 않음 |

## 경보

만료 임박(기본 7일 이내)과 만료된 LOT 재고는 [재고 경보](stock-alert.md)의 `expiry` 종류로 Stock 탭 맨 위에 나타납니다. 재고를 다 출고하면 닫힙니다.

## API

- `LotResponse.expired`(`GET /lots`, `/lots/{id}`, 추적 노드): 오늘 기준 만료 여부
- 거절 메시지: `LOT X expired on 2026-09-23; it cannot be used or reserved. Issue it to scrap it.`

## 화면

- LOTs 탭 목록: 만료일을 빨간색과 `expired` 표시로 보여 줍니다.
- LOTs 탭 상세: "expired … issue it to scrap it" 안내를 보여 줍니다.
- Stock 탭 LOT 선택: `LOT (expired 2026-09-23)`처럼 표시합니다.
- 끝난 실행의 **보정 요청**(투입 추가)에서는 재고를 먼저 만료되는 LOT부터(FEFO) 보여 줍니다. 기한 없는 LOT는 그다음, 만료된 LOT는 맨 뒤에 `expired`로 표시하고 투입으로는 고를 수 없게 합니다(`orderStockForPick`, `correctionModel.test.ts`).
- 실행 상세의 투입 LOT 선택은 다른 세션이 작업 중인 화면이라 표시를 붙이지 않았습니다. 대신 서버가 거절 이유를 돌려줍니다.

## 만료 전망 (Expiry outlook)

LOTs 탭 목록 위 **Expiry outlook**(만료된 재고가 있으면 펼쳐진 채로 시작)
- 재고가 남아 있고(보유 > 0) 종료되지 않았으며 유효기한이 있는 LOT만 셉니다.
- 이미 만료, 오늘부터 7일씩 8주, 그 뒤로 나눕니다. 오늘이 첫 주의 첫날입니다.
- 주 안에서는 먼저 만료되는 순서라, 먼저 써야 할 LOT가 앞에 옵니다. LOT를 누르면 상세가 열립니다(툴팁에 품목과 보유량).
- 제목 줄: "N expired with stock, M within 8 weeks, K later"
- `expiryOutlookModel.test.ts`: 만료·주별(오늘·주 마지막 날 포함)·나중, 재고 없음·종료·유효기한 없음 제외
- 실 화면(2026-09-26): 2일 전·3일 뒤·10일 뒤 만료 LOT에 재고 5씩 → 만료 1, 8주 안 2(다른 LOT 1개는 나중), LOT 버튼으로 상세 열림. 콘솔 오류 0

## 먼저 만료되는 LOT 먼저 (재고 출고·예약)

Stock 탭에서 재고 행의 **History**를 열고 움직임을 **Issue** 또는 **Reserve**로 고르면, 같은 품목에 이 LOT보다 **먼저 만료되는** 쓸 수 있는 재고가 있을 때 폼 아래에 알려 줍니다.

> LOT FE-SOON expires 2026-10-06 (before this LOT FE-LATE) and has 3 available at WH-B. **Use that LOT**

- 후보: 같은 품목, 가용 수량 > 0, 행이 격리 아님, LOT이 닫힘·격리·만료 아님. 순서는 유효기한(없으면 맨 뒤) → 입고일 → LOT 번호(`fefoRecords`).
- 알리는 때: 후보 중 첫 행의 LOT이 이 LOT보다 **날짜가 앞설 때만.** 같은 날 만료는 알리지 않음. 이 LOT에 기한이 없으면 기한이 있는 후보가 앞선 것으로 봄. 이 LOT이 이미 만료됐으면(폐기 출고) 알리지 않음. LOT 없는 행은 대상 아님(`earlierToIssue`).
- **Use that LOT**는 History를 그 행으로 바꾸며, 고른 움직임과 적은 수량은 그대로 둡니다.
- 막지는 않습니다. 이 LOT에서 꼭 내야 할 이유(고객 지정 LOT 등)가 있을 수 있어서 안내만 합니다.
- 검증: `fefoModel.test.ts` 3건(순서, 알리는 때와 알리지 않는 때). 브라우저: 60일·10일 뒤 만료 LOT 두 행 → 늦은 행의 History에서 Receipt일 땐 안내 없음, Issue로 바꾸면 안내, **Use that LOT** 뒤 Issue·수량 2 유지, 안내 사라짐. 콘솔 오류 없음

생산 실행 상세(Runs → 실행)의 **Record** 폼도 같은 순서를 씁니다. 방향이 input이면 LOT 선택지가 먼저 만료되는 LOT부터 나오고(기한 없음 다음, 만료 맨 뒤), 만료되었거나 격리된 행은 고를 수 없으며(서버도 거절), 고를 수 있는 첫 LOT에 기한이 있고 선택지가 둘 이상이면 `· use first`가 붙습니다. 선택지마다 `· expires YYYY-MM-DD`를 보입니다. output이면 순서를 바꾸지 않습니다(`inputLotOptions`, `correctionModel.test.ts` 2건). 브라우저: 10일·60일 뒤·어제 만료 LOT 5 kg씩 → `SOON … use first`, `LATE`, `[비활성] GONE … expired` 순. 콘솔 오류 없음

## 여러 LOT에 나눠 투입

`POST /production-runs/{id}/inputs/fefo` `{ itemId, quantity, unit, processId? }` — 쓰기 권한. LOT 관리 품목의 투입 한 건을 먼저 만료되는 LOT부터 나눠, **LOT마다 평소 투입 기록 하나씩** 남깁니다.

| # | 규칙 | 이유 |
|---|---|---|
| F1 | 수량은 평소처럼 품목 단위로 환산하고(8000 g → 8 kg), 기록도 품목 단위로 남김 | 조각마다 환산 오차가 생기지 않게 |
| F2 | 후보: 그 품목의 LOT 재고 행 중 가용 > 0, 행 격리 아님, LOT 상태가 쓸 수 있음(available·reserved), 만료 아님. 순서는 유효기한(없으면 뒤) → 입고일 → LOT 번호 | 화면의 FEFO 순서와 같음 |
| F3 | 후보의 가용 합이 모자라면 409 "Only N kg of X is in usable LOTs; M needed. Nothing was recorded." | 일부만 기록되면 나머지를 다시 나눠야 함 |
| F4 | 조각마다 `ProductionRunService.recordRunItem`(규칙 평가·재고 이동·LOT 계보)을 부르고 전체가 한 트랜잭션. 하나라도 거절되면(규칙 위반 등) 모두 되돌림. 재고 행은 나누기 전에 잠가서(X10) 그 사이 다른 이동이 줄이지 못함 | 평소 기록과 같은 검사, 전부 아니면 없음 |
| F5 | LOT 관리 품목이 아니면 400("record it directly") | 나눌 LOT이 없음 |

- 새 서비스·컨트롤러(`RunInputAllocationService`, `RunInputAllocationController`)로 만들었고 `ProductionRunServiceImpl`은 고치지 않았습니다(flow-run 연동 변경이 진행 중인 파일).
- 화면: 실행 상세 Record 폼에서 방향이 input이고 LOT 관리 품목이면 **Split over LOTs (FEFO)** 버튼. Actual(없으면 Planned) 수량과 단위로 나누고 "Recorded from 2 LOTs: SOON 5 kg, LATE 3 kg"을 보여 줍니다. 거절 사유는 폼 아래에.
- 검증: `RunInputAllocationIntegrationTest` — 5 kg LOT 셋(10일·60일 뒤·어제 만료)에 8000 g → 10일 LOT 5 kg + 60일 LOT 3 kg, 만료 LOT 그대로(재고 0·2·5). 남은 2 kg보다 많은 3 kg → 409, 기록·재고 그대로. LOT 관리 안 하는 품목 400. 브라우저: 8 kg 나누기 → 기록 두 줄(SOON 5, LATE 3), 5 kg 더 → 거절 메시지, 재고 LATE 2·SOON 0. 콘솔에는 일부러 낸 409 하나뿐

## 재고 출고 나눠 하기

`POST /inventories/issue-fefo` `{ projectId, itemId, quantity, unit?, note?, requestId, action? }` — 쓰기 권한. LOT 관리 품목의 출고 한 건을 먼저 만료되는 LOT부터, **재고 행마다 평소 출고(issue) 하나씩**으로 나눕니다. `action: "reserve"`(2026-09-26)면 같은 순서로 **재고 행마다 평소 예약(reserve) 하나씩**으로 나눕니다(기본 `issue`, 다른 값은 400).

| # | 규칙 | 이유 |
|---|---|---|
| X1 | 후보와 순서는 실행 투입 나누기(F2)와 같음. 만료·닫힘·격리 재고는 건드리지 않음(만료 재고를 폐기 출고하는 것은 그 행에서 따로) | 팔거나 내보내는 출고에 만료품이 섞이지 않게 |
| X2 | `unit`을 주면 품목 단위로 환산, 없으면 품목 단위로 봄. 응답의 수량은 모두 품목 단위 | 실행 투입과 같은 환산 |
| X3 | 모자라면 409 "Only N kg of X is available in LOTs that have not expired; M needed. Nothing was issued." | 일부만 나가면 나머지를 다시 나눠야 함 |
| X4 | 행마다 `InventoryCommandService.apply`(재고 불변식 검사)로 출고하고 전체가 한 트랜잭션. 원장 참조는 `fefo_issue` / `requestId`, 메모는 `note`(없으면 "Issued first-expiring first"), 행별 멱등 키는 `requestId:inventoryId` | 평소 출고와 같은 검사, 원장에서 한 번의 출고로 묶어 볼 수 있게 |
| X5 | 같은 `requestId`로 다시 보내면 처음 결과를 돌려주고 재고는 움직이지 않음. 같은 키로 **다른 품목**을 보내면 409("already used to issue a different item") | 네트워크 재시도에 두 번 나가지 않게(실사와 같은 방식), 키를 잘못 재사용해도 엉뚱한 결과를 돌려주지 않게 |
| X6 | LOT 관리 품목이 아니면 400 | 나눌 LOT이 없음. 그 행에서 출고 |
| X7 | 예약: 수량은 그대로 두고 예약량만 늘림. 원장 참조 `fefo_reserve`, 메모 기본 "Reserved first-expiring first". 모자라면 "… Nothing was reserved.". 응답 `action`은 `reserve`, 줄마다 `reservedAfter` | 평소 예약과 같은 검사(만료 LOT 예약 거절 포함) |
| X8 | 후보는 항상 **가용량**(보유 − 예약)이므로 예약해 둔 재고는 뒤의 출고·예약에서 빠짐 | 잡아 둔 몫을 다른 출고가 가져가지 않게 |
| X9 | 예약을 푸는 것은 원장에서 그 줄을 역분개(reversal). 같은 `requestId`를 출고↔예약에 다시 쓰면 409("already used to reserve/issue stock") | 풀기 전용 API를 새로 두지 않음. 행별 멱등 키가 겹치지 않게 |
| X10 | 나누기 전에 그 품목의 활성 재고 행을 `inventory_id` 순서로 `FOR UPDATE` 잠그고 읽음(`lockItemStock`, 2026-09-26). 실행 투입 나누기(`/inputs/fefo`)도 같음 | 동시에 두 요청이 오면 둘째가 기다렸다가 남은 재고로 다시 나눔. 전에는 둘째가 첫째가 비운 LOT을 계획해 409로 전체가 실패했음. 같은 순서로 잠가 교착 없음 |
| X11 | 화면에서 같은 FEFO 출고·예약이 미확인 상태면 요청 키를 유지. 성공 확인 뒤 동일 내용을 새로 입력하면 새 명령(2026-10-05). 프로젝트·품목·동작·수량·단위·메모가 키 식별 내용 | 첫 요청은 저장됐지만 응답만 끊긴 경우 두 번 출고·예약하지 않음. 서버 X5·X9 정책은 그대로 |

- 화면: Stock 탭 위 **Issue or reserve by item, first-expiring LOT first**(접힘, LOT 관리 품목이 없으면 숨김). 동작(Issue/Reserve)·품목·수량(품목 단위)·메모 → "Issued 7 kg: LOT SOON 5 (…, 0 left); LOT LATE 2 (…, 3 left)" 또는 "Reserved 6 kg: LOT SOON 5 (…, 5 of 5 reserved); LOT NEXT 1 (…, 1 of 5 reserved)". 예약을 고르면 "원장에서 역분개해 풀기" 안내가 붙습니다. 거절 사유는 아래에.
- 검증: `FefoIssueIntegrationTest` — 5 kg LOT 셋(10일·60일 뒤·어제 만료)에서 7000 g → SOON 5 + LATE 2(LATE 남은 3), 같은 requestId 다시 → 같은 두 줄·재고 그대로, 원장 `fefo_issue`·메모, 남은 3 kg보다 많은 4 kg → 409. 브라우저: 7 kg 출고 → 상태 문구와 재고 표 3·0, 9 kg → 거절 문구. 콘솔에는 일부러 낸 409 하나뿐
- 동시 검증: 같은 클래스 세 번째 — 5 kg LOT 둘(5일·50일 뒤)에 4 kg 출고 둘을 같은 순간 시작 → 둘 다 200, 이른 LOT 0·늦은 LOT 2. 세 번 반복. 잠금을 뺀 채 돌리면 `[409, 200]`으로 실패하는 것을 확인함
- 예약 검증: 같은 테스트 클래스 두 번째 — 7 kg 예약 → SOON 5(예약 5) + LATE 2(보유 5 그대로, 가용 3), 다시 보내도 두 번 잡지 않음, 원장 `reserve`/`fefo_reserve`, 그 키로 출고 → 409, 4 kg 출고 → "Only 3 kg"(예약분 제외), 첫 줄 역분개 → 예약 0, `action: hold` → 400. 브라우저(2026-09-26): 6 kg 예약 → 두 LOT에 5·1, 상태 문구 확인 후 두 줄 역분개로 되돌림. 콘솔 오류 0

### FEFO 화면 재시도(2026-10-05)

연결 실패뿐 아니라 HTTP 500 이상도 저장 여부 미확인으로 안내합니다(2026-10-05, §2 2ay). 400·409 같은 업무 거절은 서버 메시지를 보여 줍니다.

- 저장 중 Action·Item·Quantity·Note를 잠그고 중복 제출을 막습니다. 연결 오류에는 결과 미확인과 같은 값으로 재시도하라는 안내를 표시합니다.
- 성공 응답을 받기 전에 같은 값을 다시 보내면 이전 키를 사용합니다. 동작·품목·수량 등이 달라지면 새 명령입니다. 서로 다른 프로젝트의 같은 입력도 키를 공유하지 않습니다.
- 키는 열린 화면의 메모리에만 유지합니다. 페이지를 떠나거나 다시 열기 전에 같은 값으로 재시도해 결과를 확인합니다. 이 보완은 FEFO 출고·예약과 History의 이동 명령에 한정하며 실행 투입·실사·만료 폐기 API의 키 정책을 변경하지 않았습니다.
- `useFefoIssueMutation.test.ts` 4건: 출고·예약 저장 후 응답 유실과 다시 렌더링, 프로젝트 전환·복귀, HTTP 200 오류 envelope. 실제 QueryClient의 mutation·캐시 무효화를 확인하며 브라우저는 실제 React를 사용합니다.
- 가짜 API `fefo-command-retry.spec.ts` 2건: 먼저 출고·예약을 저장하고 응답을 끊은 뒤 재시도 → 가용 20에서 16으로 한 번만 반영. 성공 뒤 다시 입력하면 12로 새 명령 반영. 응답 지연 중 입력 잠금도 확인했습니다. 수정 전 두 키 불일치 실패를 재현했고 수정 후 통과했습니다.
- 2au–2av 합동 검증: 프런트 전체 437건·타입·린트·빌드, 관련 가짜 API 브라우저 4건 통과. 공통 명령·FEFO mutation 단위 10건과 대상 코드 커버리지 라인·분기·함수·문장 모두 100%. 서버·마이그레이션 변경 없음, 실제 DB에는 요청하지 않았습니다.

## 만료 재고 폐기

`POST /lots/expired/write-off` `{ projectId, lotIds?, note?, closeLots, requestId }` — 쓰기 권한(`closeLots`면 소유자). 만료된 LOT의 재고를 평소 출고(issue)로 내보냅니다.

| # | 규칙 | 이유 |
|---|---|---|
| W1 | `lotIds`가 비면 프로젝트의 만료·닫히지 않음·재고 있는 LOT 전부(유효기한 순). 이름을 준 LOT이 아직 만료 전이면 400, 닫혔으면 409, 다른 프로젝트면 404 | 만료 전 재고를 폐기로 잘못 내보내지 않게 |
| W2 | 재고 행마다 **가용 수량**만 출고. 격리된 행은 그대로 두고(출고가 막혀 있음) "quarantined …; release it first", 예약분은 예약 그대로 두고 "reserved …"로 결과의 `note`에 적음 | 격리 판단·예약 해제는 사람이 따로 할 일 |
| W3 | 원장 참조 `expiry_write_off` / `requestId`, 메모는 `note (LOT 번호)`(기본 "Expired stock written off"), 행별 멱등 키 `requestId:inventoryId`. 같은 `requestId`로 다시 보내면 처음 결과(LOT별 폐기량)를 돌려주고 움직이지 않음 | 재시도 안전, 원장에서 한 번의 폐기로 묶어 봄 |
| W4 | `closeLots`면 남은 재고가 없어진 LOT을 평소 LOT 닫기로 닫음. 소유자 권한은 **먼저** 확인 | 권한 부족이 폐기를 반쯤 되돌리지 않게 |
| W5 | 결과: LOT별 폐기량(품목 단위)·금액(오늘 단가)·닫힘 여부·남긴 이유, 합계 금액과 `valueComplete` | 폐기 손실을 바로 보도록 |
| W6 | 완료 결과·미확인 요청은 목록 재조회 후에도 유지(2026-10-05). 재시도는 처음 요청의 LOT 집합·닫기 옵션을 그대로 사용하며 새 만료 LOT을 포함하지 않음. 확인 후 Clear write-off result로 결과를 지움 | 빈 목록 때문에 안내가 사라지거나 재시도가 다른 재고를 폐기하지 않음. 미확인 상태에는 닫기 옵션 변경 금지 |

- 화면: LOTs 탭 **Expiry outlook**에 만료 LOT이 있으면 **Write off expired stock (N)** 버튼과 "close the LOTs afterwards (owner)". 확인 창 뒤 목록의 만료 LOT 전부를 폐기하고 "Wrote off LOT … 5 kg (closed), … · value 12"와 남긴 이유를 보여 줍니다.
- 검증: `ExpiredWriteOffIntegrationTest` — 3일 전 만료 LOT(2+1 kg, 단가 2), 어제 만료지만 격리된 LOT(4 kg), 30일 뒤 LOT(6 kg). 만료 전 LOT 이름 → 400. 두 만료 LOT 폐기 + 닫기 → 첫 LOT 3 kg·닫힘, 격리 LOT 0·남긴 이유, 금액 6, 원장 `expiry_write_off`, 30일 LOT 그대로. 같은 요청 다시 → 한 LOT 3 kg, 격리 LOT 4 그대로. 브라우저: 만료 2개 → 확인 창 → 둘 다 폐기·닫힘, value 12(단가 없는 품목 안내), 전망 "0 expired", 새 LOT 6 그대로. 콘솔 오류 없음
- 화면 복구(2026-10-05): 가짜 API `expired-writeoff-recovery.spec.ts` 4건(목록 갱신 뒤 결과 유지, 저장 후 연결 유실·빈 대상 목록, 새 LOT 추가, 게이트웨이 503). 수정 전 결과·재시도 버튼 유실과 새 LOT을 대신 폐기하는 3개 실패 재현 후 수정. mutation 3건(저장 결과 재생, 다른 LOT·닫기 값 구분, 순서 변경·입력 불변성). 키는 열린 화면 메모리에서만 유지. 0 폐기·예약·격리 등 원장 거래가 없는 결과의 서버 replay·당시 단가 고정은 이번에 변경하지 않음.

## 목록 거르기

- LOTs 탭 목록 위 거르기: LOT 번호·품목 검색, 상태(any status·not closed·개별 상태), 유효기한(expired·**30일 안에 만료**·유효기한 없음). 30일은 오늘을 포함하고 이미 지난 것은 넣지 않습니다. **Download CSV**는 거른 목록 그대로(`lots-YYYY-MM-DD.csv`, 열 `lot,item,status,on_hand,reserved,expiry_date,expired,received_at`, `lotExportModel.test.ts`). `listFilterModel.test.ts`. Items 탭에도 코드·이름·유형 검색, 상태, LOT 관리 품목만 거르기가 있습니다.

## 검증

- `LotExpiryIntegrationTest` 2건
  - 어제 만료 LOT: `expired=true`, 예약 409, 생산 투입 409, 출고(폐기) 200. 오늘 만료 LOT: `expired=false`, 생산 투입 200.
  - 준비 점검: 만료 LOT 100 kg + 유효 LOT 2 kg → 가용 2, 사용 가능 LOT 1, 준비 안 됨
- 기존 `LotIntegrationTest` 10건, `WorkOrderReadinessIntegrationTest` 2건 통과
- 실 화면: LOTs 탭의 만료 표시와 안내, Stock 탭 LOT 선택지 표시 확인. 콘솔 오류 0

## 2026-10-05 확정: 프로젝트 시간대

**Accepted (정책).** B 승인. Project.timeZone IANA ID, 기존 Asia/Seoul backfill, timestamp UTC 저장, 업무 날짜는 프로젝트 시간대. 앱 단일 시간대 권장안 A는 채택하지 않는다. 아래 메모는 검토 이력이며 구현 전이다. [최종 결정](../status/DECISIONS-2026-10-05.md)이 아래 예전 선택지보다 우선한다.

## 결정 메모: 오늘을 정하는 시간대 (Proposed, 2026-10-04)

> **결정이 아니다.** [WORKBOARD](../status/WORKBOARD.md) §4 "프로젝트별 시간대"를 고르기 위한 자료다. 고르기 전에는 구현하지 않는다.

**지금 코드 (2026-10-04 확인)**
- "오늘"을 서버 기본 시간대의 `LocalDate.now()`로 정하는 곳이 14곳이다:
  - 만료 판정(`InventoryCommandService`, `LotServiceImpl`)
  - FEFO, 만료 재고 폐기, 재고 경보(`expiry`), 재고 흐름 분석, 창고 작업, 할당, 투입 나누기, 쓸 수 있는 재고(`UsableStock`)
  - 준비 점검, NCR 조치 `overdue`
- 설비 달력·휴일·계획 기간 제안만 설정 `app.planning.time-zone`(기본 `Asia/Seoul`)을 쓴다.
- 그래서 서버가 UTC로 돌면 두 "오늘"이 하루에 9시간 동안 어긋난다. 그동안 LOT 만료는 서버 날짜로 바뀌고, 설비 하루는 서울 날짜로 바뀐다.

| 안 | 내용 | 필요한 일 | 약점 |
|---|---|---|---|
| A | 앱 전체에 시간대 하나: 14곳이 모두 `app.planning.time-zone`의 오늘을 씀(공용 `Clock`·시간대 제공자 하나) | 공용 빈 하나와 14곳 교체. 마이그레이션 없음. 테스트가 시각을 고정할 수 있게 됨 | 시간대가 다른 프로젝트를 한 서버에 둘 수 없음 |
| B | 프로젝트별 시간대: `project.time_zone` 열과 프로젝트 설정 화면, 각 계산이 프로젝트의 오늘을 씀 | 마이그레이션(V52 후보), project 구역의 API·화면, 14곳 + 설비 달력이 프로젝트를 받아 시간대 조회 | project 구역(세션 1 밖)을 함께 고쳐야 함 |
| C | 운영에서 JVM 시간대를 고정(`-Duser.timezone=Asia/Seoul`) | 배포 설정만 | 코드에는 두 기준이 그대로 남고 개발·CI 환경마다 결과가 달라질 수 있음 |

**권장안: A부터.** 지금 어긋남을 코드 한 곳(시간대 제공자)으로 없앤다. 프로젝트마다 시간대가 다른 사용자가 생기면 같은 제공자가 프로젝트 설정을 읽게 바꿔 B로 넓힌다. A만으로는 사용자에게 보이는 동작이 서버가 서울 시간대일 때와 같다.
- 영향받는 코드: 위 14곳(inventory·production·quality), `EquipmentScheduleService`(이미 설정 사용), 각 통합 테스트의 날짜 기대값(대부분 상대 날짜라 그대로)

## 이후

- FEFO는 재고 출고·예약 안내, 보정 요청, 실행 상세의 투입 LOT 선택, 실행 투입 나누기(`/inputs/fefo`), 재고 출고·예약 나누기(`/inventories/issue-fefo`, `action`)에 적용됨. 예약에 작업지시 같은 대상을 묶는 기능은 없음(메모로만 남김)
- 시간대: 지금은 서버 날짜 기준입니다. 프로젝트별 시간대가 생기면 그 기준으로 바꿉니다.
