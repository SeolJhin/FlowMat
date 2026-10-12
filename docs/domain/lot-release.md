# LOT 검사 대기·해제·재개

상태: **구현(2026-10-09, 세션 1 리드) — 로컬 격리 검증만.** 근거 결정은 [DECISIONS-2026-10-05](../status/DECISIONS-2026-10-05.md) §6("새 LOT는 검사/Release가 필요 없는 품목이면 AVAILABLE, 필요하면 QUARANTINE / INSPECTION_PENDING. 호환 기본값 AVAILABLE", "LOT 종료·재개는 Project owner만")이다. 결정은 사용자가 승인했고, 아래 R1–R6은 그 결정을 코드로 옮긴 리드의 구현 선택이다. 새 마이그레이션 **V60**(`item.lot_release_required_yn`). 개발 DB(5434)에는 적용하지 않았다.

## 규칙

| # | 규칙 | 이유 |
|---|---|---|
| R1 | 품목의 `lotReleaseRequiredYn = Y`이면 새 LOT는 **`inspection_pending`**, 아니면 **`available`**로 시작한다. 기존 품목은 V60에서 `N`이므로 지금과 같다. 설정 변경은 **그 뒤 등록하는 LOT**에만 적용한다. LOT 등록은 모두 `LotServiceImpl.createLot` 한 곳을 지난다 | 호환 기본값 AVAILABLE. 이미 쓰고 있는 LOT를 소급해 막지 않음 |
| R2 | 대기 LOT도 재고를 받을 수 있지만, 그 LOT의 재고 행은 **`quarantined`로 생긴다.** 이미 있는 행으로의 입고·생산 산출은 격리된 행에 쌓인다 | 기존 격리 규칙(투입·출고·예약·이동 거절, FEFO·준비 점검·가용량 제외)을 그대로 재사용. 새 예외 경로를 만들지 않음 |
| R3 | 해제는 **`POST /lots/{lotId}/release`**(Project write). LOT 품목의 활성·필수 검사 기준 중 단계가 `production`이 아닌 것(`receipt`·`any`)마다 **이 LOT의 최신 결과가 pass**여야 한다. 대응: 같은 `standardId`, 또는 `standardId` 없는 검사는 같은 품목·같은 검사 종류(대소문자 무시). LOT 상세의 Receipt checks와 같은 대응이다. 통과하면 격리 행마다 `unquarantine` 거래(`referenceType = lot_inspection_release`, `referenceId = lotId`)를 남기고 LOT 상태를 재고량으로 다시 계산한다. 필수 기준이 없으면 바로 해제된다 | 검사 기록이 해제의 근거. 원장에서 누가 언제 풀었는지 보임 |
| R4 | 대기 LOT의 일반 **`unquarantine`은 409**(`… waits for its receipt checks; release it with Release LOT once they have passed.`). `PUT /inventories/{id}`의 격리 상태 변경은 원래대로 거절한다 | 거래의 `referenceType`은 클라이언트가 정할 수 있으므로, 해제는 서버의 전용 경로로만 |
| R5 | 대기 중 격리(불합격 검사의 `quarantineLot`, 리콜 격리, 수동 `quarantine`)는 LOT를 **`quarantined`**로 바꾼다. 행은 이미 격리돼 있으므로 바뀌지 않고 `quarantine` 거래만 남는다. 그 뒤로는 일반 격리다: `unquarantine`이 처리 결정(예: NCR use-as-is)이며 원장에 남는다 | "아직 확인 전"과 "문제가 있어 처분 대기"를 구분. 처분 흐름은 기존 격리·NCR을 그대로 씀 |
| R6 | LOT 종료·**재개는 Project owner만**(`POST /lots/{lotId}/reopen`, 닫히지 않은 LOT는 409). 재개는 **새 등록처럼** 본다: 품목이 검사를 요구하면 `inspection_pending`이 되고 아직 격리되지 않은 행을 `quarantine` 거래(`referenceType = lot_reopen`)로 다시 묶는다. 이전에 통과한 검사는 그대로 유효하므로 Release LOT가 바로 통과한다. 검사를 요구하지 않는 품목은 격리 행이 남아 있으면 `quarantined`, 아니면 재고량대로(행이 없으면 `available`) | 닫힌 LOT는 이전 상태를 기억하지 않는다. 대기 LOT를 닫았다 열어 검사를 건너뛰는 길을 막음 |
| R7 | 해제 응답 `checkedStandards`: 확인한 필수 검사 기준 수. **0이면 검사 없이 해제**된 것이며, LOT 상세가 `Released without checks: … Add one under Quality → Inspection standards`를 보인다(2026-10-10 2cx) | 기준이 없어 바로 풀린 것을 사용자가 알게 |
| R8 | `GET /lots/{lotId}/release-history`(Project read, 2cx): 원장의 `lot_inspection_release`(해제)·`lot_reopen`(재개 때 다시 묶음) 행을 새것부터, 같은 사람·같은 동작의 5초 안 행을 한 사건으로 묶어 `{action: released|held, at, by, stockRows}`. LOT 상세의 **Release history** | 원장을 뒤지지 않고 LOT에서 해제 이력을 본다 |
| R9 | LOT **종료·재개마다 사건 한 줄**(`lot_status_event`, V77, 2dn): 동작(`closed`·`reopened`)·이전·이후 상태·사람·시각. 이미 닫힌 LOT를 다시 닫으면 사건이 없다(응답은 그대로). 거절된 재개(닫히지 않음 409, 소유자 아님 403)는 남지 않는다. 재개 사건의 시각은 재개가 만든 묶음(`held`)보다 앞선다. V77 전의 종료·재개는 되살리지 않는다 | 빈 LOT의 종료·재개는 원장 행이 없어 흔적이 없었다 |
| R10 | R8 응답에 R9 사건을 합쳐 새것부터: `{action: closed|reopened, at, by, stockRows: 0, status}`(`status` = 그 뒤 LOT 상태, 원장 사건은 null). **Release history**에 `Closed · 사람 · 시각`, `Reopened as inspection pending · …`(재고 행 수는 해제·묶음에만). 종료·재개 뒤 이력을 다시 읽는다 | 종료·재개·해제를 한곳에서 본다 |

Organization OWNER/ADMIN이라는 이유만으로 종료·재개를 허용하지 않는다(§6, ADR-001).

## API

| 엔드포인트 | 설명 | 오류 |
|---|---|---|
| `POST /lots/{lotId}/release` | `{lotId, lotNo, lotStatus}` | 404 없는 LOT, 403 쓰기 권한 없음, 409 대기 아님 또는 `Before releasing LOT X: record A; B failed.` |
| `POST /lots/{lotId}/reopen` | `LotResponse` | 403 owner 아님, 409 닫히지 않음 |
| `POST /items`, `PUT /items/{id}`, `ItemResponse` | `lotReleaseRequiredYn`(`Y`/`N`, 생성 기본 `N`, 수정 때 생략하면 그대로) | |
| `LotResponse.lotStatus` | `inspection_pending` 추가 | |

## 화면

- Inventory → Items 품목 폼: LOT 추적 품목일 때 "Hold new LOTs until their receipt checks pass".
- LOTs 탭: 상태 필터·색 `inspection pending`, 상세 안내("held until its receipt checks pass: record them below, then Release LOT"), **Release LOT**(거절 사유를 `role=alert`로 표시), 닫힌 LOT의 **Reopen LOT**(확인 대화상자).
- Stock 탭 FEFO 후보에서 대기 LOT 제외(행도 격리라 이중 방어).

## 구조 (ADR-002)

quality `LotReleaseService` → inventory 공개 API `LotQuery`(LOT 읽기)·`LotReleaseCommand`(새, 해제) → `InventoryCommandService.releaseInspection`. 검사 기준·결과는 quality가, 재고 행·원장은 inventory가 각자 자기 저장소로 처리하고 한 트랜잭션으로 묶인다. `QualityServiceImpl`(동결 위반 보유)은 고치지 않았다: 대기→격리 전환은 `InventoryCommandService.changeQuarantine`에서 처리한다. `InventoryServiceImpl`은 catalog `ItemRepository` 대신 `InventoryCatalogReferences`를 쓴다(고치는 파일 Stage B). `LotStatusResync`·`syncLotStatus`는 대기 LOT를 재계산하지 않는다.

## 검증 (2026-10-09, 격리 복사본)

- 백엔드 `LotInspectionReleaseIntegrationTest`(Testcontainers PostgreSQL): 대기 LOT의 격리 행, 출고·`unquarantine` 409, 검사 누락·불합격 409, 외부인 403, editor 해제, 해제 원장, 비대상 품목 `available`, 설정 변경 뒤 새 LOT 대기, 불합격 격리 → 처분 해제, owner 전용 재개와 재격리, 비대상 품목 재개. 관련 LOT·재고·품질·실행·경계 테스트 묶음.
- 프런트 타입·lint·단위(FEFO 제외 포함)·빌드, 모의 API 브라우저 `e2e/lot-release.spec.ts`.
- 2dn(2026-10-12, 격리 복사본): `LotInspectionReleaseIntegrationTest` 확장 — 검사 대상 LOT는 해제·묶음·재개(`inspection_pending`)·종료 4사건을 새것부터, 거절된 재개 두 번은 남지 않음, 검사 없는 빈 LOT는 두 번 닫아도 종료 1건과 재개(`consumed`) 1건. LOT·만료·아키텍처·마이그레이션 관련 68건 실패 0. 모의 E2E `e2e/lot-release.spec.ts` 확장(DONE-1의 `Closed · demo-owner`, 재개 뒤 `Reopened as consumed`, 재고 행 수 없음).

## 남은 것

- 개발 DB(5434)는 V51에 멈춰 있다. V52–V60 적용은 사용자 승인 뒤.
- 실 API 브라우저 E2E, 보안 검토(오류·보안 담당 Agent), 원격 CI.
- ~~필수 기준이 없는 대상 품목의 해제 안내~~ → R7(2cx). 해제는 그대로 바로 된다.
- ~~해제·재격리 이력을 LOT 상세에~~ → R8(2cx). ~~LOT 종료·재개 자체의 이력(원장 행이 없는 경우)~~ → R9–R10(2dn V77).
- 재개 규칙은 **현재** 품목 설정을 따른다. 종료 직전 상태는 이제 R9 사건(`from_status`)에 남지만 재개 규칙에는 쓰지 않는다.
