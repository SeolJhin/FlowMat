# 설비 정보

상태: **구현(2026-09-26).** 새 테이블·마이그레이션 없음. V1 `equipment` 테이블에 이미 있던 열을 엔티티·API·화면에 연결했습니다. 상태 이력은 2026-10-03(커밋 전) V51 `equipment_status_history`로 더했습니다(아래 "상태 이력").

## 목적

설비 목록에 코드·이름·종류·상태만 있어서, 어느 회사의 어떤 모델인지, 어디에 있는지, 시간당 얼마를 만들고 얼마를 쓰는지 적을 곳이 없었습니다. 테이블에는 처음부터 그 열이 있었습니다.

## 필드

| 필드 | 열 | 형식 |
|---|---|---|
| `manufacturer` | `manufacturer` varchar(100) | 제조사 |
| `modelName` | `model_name` varchar(100) | 모델 |
| `serialNo` | `serial_no` varchar(100) | 일련번호 |
| `capacityPerHour` | `capacity_per_hour` numeric(14,4) | 시간당 산출량. 단위는 프로젝트가 그 설비의 일을 세는 단위 |
| `powerKwh` | `power_kwh` numeric(10,4) | 가동 1시간당 전력(kWh) |
| `waterLiter` | `water_liter` numeric(14,4) | 가동 1시간당 물(L) |
| `location` | `location` varchar(100) | 놓인 곳(자유 입력) |
| `efficiencyPercent` | `efficiency_percent` numeric(5,2)(V84) | 효율(%): 시간당 산출 중 실제로 내는 비율, 0 초과 100 이하, 비우면 100(아래 "효율") |
| `concurrentWorkOrders` | `concurrent_work_orders_yn` char(1)(V86) | 여러 작업지시를 함께 하는 설비, 기본 아니오(아래 "동시 작업") |

## API

기존 `/equipments` 요청에 `details` 객체가 붙습니다.

| 요청 | `details` |
|---|---|
| `POST /equipments` | 선택. 없으면 모두 비어 있음 |
| `PUT /equipments/{id}` | 없으면 그대로. **있으면 일곱 필드를 모두 바꿈** — 빠진 필드·`null`·빈 문자열은 지워짐 |
| `GET /equipments`, `GET /equipments/{id}` | 항상 있음. 기록되지 않은 필드는 `null` |

## 규칙

| # | 규칙 | 이유 |
|---|---|---|
| E1 | `details`는 통째로 보냄(부분 수정 없음) | 숫자를 지우는 방법이 필요함. 품목 단가처럼 "빠지면 그대로"로는 한 번 넣은 숫자를 지울 수 없음 |
| E2 | 글자는 앞뒤 공백을 떼고, 비면 `null` | 목록에 빈 칸과 "—"가 섞이지 않게 |
| E3 | 숫자는 0 이상, 소수 4자리까지, 정수부는 열 크기까지(전력 6자리, 나머지 10자리). 어기면 400과 필드 이름이 든 메시지 | 열이 담지 못하는 값이 500으로 끝나지 않게 |
| E4 | 글자는 100자까지(열 크기) | 같은 이유 |

## 화면

재고 → Equipment 탭
- 표: Code, Name, Type, Status, **Maker / model**(아래에 `S/N …`), **Location**, **Per hour**(`120.5 out · 4 kWh · 30 L · 85% efficient`, 기록된 것만), Actions
- 표 위 거르기: 코드·이름·종류·제조사·모델·일련번호·위치 검색, 상태(any·active·inactive·maintenance), "N of M". **Download CSV**는 거른 목록 그대로 `equipment-YYYY-MM-DD.csv`, 열 `code,name,type,status,manufacturer,model,serial_no,location,capacity_per_hour,power_kwh,water_liter`(`filterEquipment`·`equipmentCsv`, `equipmentModel.test.ts`).
- 추가·수정 폼의 **Details (optional)**: Manufacturer, Model, Serial no., Location, Capacity / hour, Efficiency %, Power kWh, Water L. 수정할 때 저장된 값이 채워지고, 칸을 비우고 저장하면 지워집니다. 숫자가 아니거나 음수면 보내기 전에 필드 이름과 함께 알려 줍니다.

## 상태 이력

2026-10-03(커밋 전), V51 `equipment_status_history`. 세션 DB에 적용됨.

| 열 | 뜻 |
|---|---|
| `previous_status` | 바뀌기 전 상태. 설비를 추가할 때 남긴 첫 줄은 `null` |
| `equipment_status` | 바뀐 상태(`active`·`inactive`·`maintenance`, CHECK) |
| `note` | 왜 바꿨는지(200자까지, 앞뒤 공백 뗌, 비면 `null`) |
| `changed_by`, `changed_at` | 누가, 언제 |

| # | 규칙 | 이유 |
|---|---|---|
| E5 | 설비를 추가하면 첫 상태를 한 줄 남김 | 이력만 보고 처음 상태를 알 수 있게 |
| E6 | `PUT /equipments/{id}`에서 상태가 실제로 바뀔 때만 남김. 같은 상태를 다시 보내거나 이름·상세만 바꾸면 남기지 않음. 요청의 `statusNote`는 상태가 바뀔 때만 쓰임 | 이력이 상태 변경의 기록으로 남게 |
| E7 | 이력은 V51부터. 그 전 설비에는 첫 줄이 없음 | 과거 상태는 알 수 없음 |

- API: `PUT /equipments/{id}`의 선택 필드 `statusNote`, `GET /equipments/{id}/status-history`(새것부터, 읽기 권한, 없는 설비 404)
- 화면: 수정 폼에서 Status를 바꾸면 **Status note** 칸이 나타남. 폼 아래 **Status history**(최근 8줄, `active → maintenance · Bearing replaced`, 첫 줄은 `added as active`, 누가·언제)
- 가동 기록(어느 실행이 언제 설비를 썼는지)은 아님 — 그것은 아래 "남은 범위"의 설비·실행 연결

## 검증

- `EquipmentServiceImplTest` 2건 추가: `details` 없는 수정은 제조사 유지, 있는 수정은 공백 제조사 지움·모델 trim·용량 40·전력 지움·위치 trim. 음수 전력 400, 저장 안 함
- `EquipmentDetailsIntegrationTest` 2건(실제 Postgres)
  - 생성 시 제조사 trim, 다시 읽으면 모델·용량 120.5·전력 3.75·물 0·위치. 이름만 바꾸면 일련번호 유지. `details`에 위치·전력만 보내면 제조사·용량이 지워짐
  - 음수 용량 400(메시지에 `capacityPerHour`), 전력 1234567 400(정수 6자리), 물 0.12345 400(소수 5자리)
- `equipmentModel.test.ts`: 폼 ↔ `details` 변환, 숫자 오류 메시지, `Per hour`·`Maker / model` 표시
- 브라우저(목록): 위치로 검색하면 그 설비 한 줄, Download CSV `equipment-….csv` 헤더와 그 한 줄(API로 만든 설비·화면에서 만든 설비 모두). 설비가 없으면 거르기 줄을 숨김
- 상태 이력: `EquipmentStatusHistoryIntegrationTest`(실제 Postgres) — 추가 → maintenance(메모 " Bearing replaced ") → 같은 상태 다시 → 이름만 → `Active`로 3줄(새것부터 maintenance→active 메모 없음, active→maintenance 메모 trim, 첫 줄 previous 없음·작성자), 멤버 아님 403, 없는 설비 404. `equipmentModel.test.ts`의 `statusChangeText`. 실 API E2E `e2e/equipment-schedule.spec.ts` 끝에 Status maintenance·메모 저장 → 다시 수정하면 Status history에 두 줄
- 브라우저(세션 DB): 상세와 함께 추가 → 표에 `Acme M-200`/`S/N SN-1`/`Line 1`/`120.5 out · 3.75 kWh` → 수정 폼에 값이 채워짐 → 전력 -1은 `Power kWh must be a number of 0 or more.` → 제조사 비우고 위치 Line 2·전력 4로 저장 → `M-200`/`Line 2`/`120.5 out · 4 kWh` → 삭제. 콘솔 오류 없음

## 효율 (2026-10-17, 2ea, V84)

사용자 결정(2026-10-14 "Equipment efficiency", 2026-10-16 정리): 기본 100%로 기존 계산을 지키고, 계획은 시간당 산출 × 효율로 센다. 출처: 벤치마크 FM-PLAN-002 Capacity Resource(`efficiency`). 한 번에 한 작업지시만 하는지(동시 작업)는 효율과 따로 다룬다(2ec, 아래 "동시 작업"). 새 마이그레이션 **V84**(개발 DB 미적용).

| # | 규칙 | 오류 |
|---|---|---|
| E8 | `details.efficiencyPercent`(V84 `equipment.efficiency_percent` numeric(5,2)): 시간당 산출 중 실제로 내는 비율, 0 초과 100 이하·소수 2자리까지. 비우면(null) 100이라 이전 계획이 그대로다. `details`를 통째로 보내므로(E1) 빠지면 지워진다 | 400 `efficiencyPercent must be above 0 and at most 100.`·`efficiencyPercent takes at most 2 decimals.` |
| E9 | **실제 산출 = 시간당 산출 × 효율.** 계획 기간 제안([P1](equipment-schedule.md)), 부하표의 필요 시간, 준비 점검의 `equipment` 필요 시간, 작업지시 가동 계획(계획 쪽 분)이 같은 값을 쓴다. **전환 시간은 효율로 늘리거나 줄이지 않는다.** 응답에 `efficiencyPercent`(100이면 null)를 함께 보이고 `capacityPerHour`는 정격 그대로 | |
| E10 | 지난 실적과 확정 원가는 다시 계산하지 않는다: 실행의 가동 시간·setup·원가 기록(snapshot), 완료된 실행의 실제 분·원가는 그대로다. 효율을 바꾸면 그 뒤에 읽는 계획 값만 달라진다 | |
| E11 | 화면: 추가·수정 폼 **Efficiency %**(0 초과 100 이하가 아니면 보내기 전에 `Efficiency % must be above 0 and at most 100.`), 목록 **Per hour**에 `85% efficient`(100이면 없음), 부하표 설비 칸 `80% efficient`, 준비 점검 `… needs 2.5 h at 80% efficiency …`, 가동 비교 계획 `120 min at 10/h × 80%`. 범위 밖: 효율의 기간별 이력, 품목마다 다른 효율(동시 작업은 2ec, E12–E15) | |

검증(2026-10-17, 격리 복사본): `EquipmentEfficiencyIntegrationTest` — 시간당 10·효율 80% 설비(달력 없음), 빨강→파랑 전환 30분, 월 06–07 승인 빨강 → 파랑 16개 제안: 생산 2시간(16 ÷ 8)·전환 0.5시간(그대로)·필요 2.5시간·월 08–10:30, 응답 정격 10·효율 80 → 같은 작업지시의 계획 한 시간(08–09) 준비 점검 경고 `Equipment … needs 2.5 h at 80% efficiency (with 0.5 h changeover) for 16 but has only 1 h available in the planned window.` → 부하표 효율 80·그 작업지시 필요 2.5시간 → 가동 비교 계획 120분 → 효율 0·100.5 400, 12.345 400(소수 2자리) → 효율을 비우면 null, 제안 생산 1.6시간(16 ÷ 10). 설비 효율·설비 상세·설비 원가·부하·가동 시간·계획 제안·여러 건 계획·준비 점검·인력 계획·인력 몫·설비 달력·모듈 경계·마이그레이션 관련 50건 실패 0. 프런트 `equipmentModel.test.ts`(효율 칸 변환·거절·표시) 1건 추가·2건 수정.

## 동시 작업 (2026-10-17, 2ec, V86)

사용자 결정(2026-10-17 "Concurrent equipment flag", 2026-10-16 정리 "동시 작업 허용 여부는 효율과 별개로 처리"): 설비마다 켜고 끄는 스위치 하나다. 끄면(기본) 지금처럼 한 번에 작업지시 하나다. 몇 개까지 함께 하는지(N)는 두지 않는다. 출처: 벤치마크 FM-PLAN-002 Capacity Resource(`constrained`). 새 마이그레이션 **V86**(개발 DB 미적용).

| # | 규칙 | 오류 |
|---|---|---|
| E12 | `details.concurrentWorkOrders`(V86 `equipment.concurrent_work_orders_yn`): 켜면 이 설비에서 여러 작업지시가 함께 돈다(오븐·탱크 등). JSON `true`·`false`만 받고, `details`를 통째로 보내므로(E1) 빠지면 꺼진다. 시간당 산출과 효율은 작업지시 하나의 속도다 | 400 `Send the equipment as JSON, with numbers as numbers and concurrentWorkOrders as true or false.` |
| E13 | 켠 설비에서는 계획 기간 제안([설비 달력](equipment-schedule.md) P4·P9)이 승인·진행 중이거나 앞에서 놓인 작업지시를 비켜 가지 않는다(`movedPast` 없음). 인력이 겹치는 것은 그대로 비켜 간다(WC25). [준비 점검](work-order-readiness.md)의 `schedule` 경고가 없다 | |
| E14 | 켠 설비의 [부하표](equipment-load.md): 계획이 가용을 넘어도 **과부하가 아니다**(`overloaded` false, 부하율은 그대로 세어 100%를 넘을 수 있다). 타임라인에서 겹치는 막대를 충돌로 표시하지 않는다. 응답 `concurrentWorkOrders` | |
| E15 | 전환 시간은 그대로 계획 시작 순서의 앞 작업지시로 센다([전환 시간](equipment-changeover.md)). 화면: 추가·수정 폼 **Runs several work orders at once**(설명 포함), 목록 상태 칸 `side by side`, 부하표 설비 칸 `runs orders side by side`. 범위 밖: 동시에 할 수 있는 작업지시 수, 동시 작업 설비의 용량 나눔 | |

검증(2026-10-17, 격리 복사본): `ConcurrentEquipmentIntegrationTest` — 시간당 10 설비(달력 없음)에 동시 작업을 켜고 2041-09-02 08–10 승인 작업지시 둘(각 20개) → 둘째의 계획 제안 08–10 그대로(`movedPast` 없음), 준비 점검 `schedule` 없음, 08–10 부하표 가용 2·계획 4·부하율 200·과부하 아님 → 스위치를 빼고 저장하면 꺼짐, 제안 10시부터(`movedPast`에 첫째), `schedule` 경고, 과부하 → `"concurrentWorkOrders":"yes"` 400. 동시 작업·설비 상세·효율·전환·원가·부하·가동 시간·계획 제안·여러 건 계획·준비 점검·인력 계획·인력 몫·작업자 달력·설비 달력·Exclusive·연결 계약·모듈 경계·마이그레이션 관련 153건 실패 0. 프런트 `equipmentModel.test.ts`·`equipmentLoadModel.test.ts` 각 1건, 모의 API e2e `concurrent-equipment.spec.ts` 3회 반복 통과.

## 남은 범위

- 설비와 공정·실행 연결(어느 실행이 어느 설비를 얼마나 썼는지)은 없음. 시간당 전력·물은 그 연결이 생기면 에너지 원가 계산에 쓸 수 있음
- 상태 이력은 V51부터(위 "상태 이력"). 가동 기록(실행별 설비 사용 시간)은 설비·실행 연결이 생겨야 함
- 교대 달력·정지 시간(정비·고장)과 작업지시 설비 점검은 [설비 달력·정지 시간](equipment-schedule.md)(2026-09-27, V32)

## 현재 시간당 계획 원가 (2026-10-08)

Schedule에서 [시간당 원가](equipment-setup-cost.md)를 편집하고 부하표에서 작업지시 전환 추정을 읽는다. 원가는 기존 details와 별도 저장하여 이름·설비 상세 변경으로 지워지지 않는다. 미상(null)과 알려진 0을 구분한다. 실제 사용 시간·실행 원가 snapshot은 후속 범위다.

- 품목의 색상·금형 등 다차원 [setup 속성 규칙](setup-attributes.md)은 Schedule에서 우선순위와 전환 분을 편집한다. 품목 Details에서 대응 속성을 저장한다. 기존 품목 쌍/기본 규칙과 함께 적용된다.
