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
- 표: Code, Name, Type, Status, **Maker / model**(아래에 `S/N …`), **Location**, **Per hour**(`120.5 out · 4 kWh · 30 L`, 기록된 것만), Actions
- 표 위 거르기: 코드·이름·종류·제조사·모델·일련번호·위치 검색, 상태(any·active·inactive·maintenance), "N of M". **Download CSV**는 거른 목록 그대로 `equipment-YYYY-MM-DD.csv`, 열 `code,name,type,status,manufacturer,model,serial_no,location,capacity_per_hour,power_kwh,water_liter`(`filterEquipment`·`equipmentCsv`, `equipmentModel.test.ts`).
- 추가·수정 폼의 **Details (optional)**: Manufacturer, Model, Serial no., Location, Capacity / hour, Power kWh, Water L. 수정할 때 저장된 값이 채워지고, 칸을 비우고 저장하면 지워집니다. 숫자가 아니거나 음수면 보내기 전에 필드 이름과 함께 알려 줍니다.

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

## 남은 범위

- 설비와 공정·실행 연결(어느 실행이 어느 설비를 얼마나 썼는지)은 없음. 시간당 전력·물은 그 연결이 생기면 에너지 원가 계산에 쓸 수 있음
- 상태 이력은 V51부터(위 "상태 이력"). 가동 기록(실행별 설비 사용 시간)은 설비·실행 연결이 생겨야 함
- 교대 달력·정지 시간(정비·고장)과 작업지시 설비 점검은 [설비 달력·정지 시간](equipment-schedule.md)(2026-09-27, V32)
