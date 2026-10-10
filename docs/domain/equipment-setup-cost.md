# 설비 시간당 원가와 전환 비용 추정

상태: **시간당 계획 원가 편집·전환 비용 추정 구현(2026-10-08, §2 2bs). 실행 실제 setup 시간·원가 snapshot 구현(2026-10-10, §2 2cd, 로컬 검증만).** 근거 정책은 [2026-10-05 결정 §4](../status/DECISIONS-2026-10-05.md#4-setup비용부산물). 다차원 속성 규칙은 [setup 속성 계약](setup-attributes.md)에 구현했다. 실제 설비 사용 시간과 실행 비용 snapshot은 후속 구현이다.

## 계약

| 규칙 | 동작 |
|---|---|
| SC1 | 설비의 현재 시간당 계획 원가는 별도 `equipment_hourly_cost`에 저장한다. 기존 설비 상세 편집·CSV가 원가를 지우지 않는다. 기존 설비는 원가 미상이며 0을 임의로 채우지 않는다 |
| SC2 | `GET /equipments/{id}/hourly-cost`: Project read. `{equipmentId, hourlyCost, version, updatedBy, updatedAt}`. 저장 기록이 없으면 null·version 0. 삭제된/없는 설비 404, 외부인 403 |
| SC3 | `PUT`은 Project write. `{hourlyCost: number|null, expectedVersion: integer}` 두 필드 필수. null은 명시적 해제, 0은 알려진 원가. 음수·10자리 정수 초과·소수 4자리 초과·잘못된 숫자/JSON 400, 필드 이름을 메시지에 표시. 작성자와 UTC 시각은 서버에서 정한다 |
| SC4 | 설비 행 잠금 뒤 삭제 여부와 저장 버전을 확인한다. 같은 버전의 서로 다른 동시 변경은 하나만 저장, 다른 요청은 409 `expectedVersion changed`. 버전 최대값은 409. 이전 버전 + 같은 작성자 + 같은 값의 바로 직전 저장 재시도는 현재 결과를 반환하고 버전을 늘리지 않는다 |
| SC5 | `EquipmentCostQuery`는 활성 설비와 프로젝트를 대조하고 알려진 원가만 반환한다. 빈 입력은 null 키 조회 가능한 빈 Map. production은 공개 Query를 통해 일괄 조회하여 다른 도메인 Repository를 참조하지 않는다 |
| SC6 | 부하표 각 작업지시의 `setupCostEstimate = changeoverMinutes × 현재 hourlyCost / 60`, 최종 소수 4자리 HALF_UP. 시간 표시의 반올림된 시간(예: 1분→0.02h)을 금액에 쓰지 않는다. 전환 0분은 금액 0, 전환 시간/원가 미상은 null |
| SC7 | 표시 금액은 **그 줄 작업지시의 전체 전환 추정**이다. 주간 가용 시간 비율로 나누지 않는다. 재료비·실제 실행 원가·날짜 변경·자동 실행에는 연결하지 않는다 |
| SC8 | Schedule의 **Equipment hourly cost**에서 현재 원가를 편집한다. 입력 값과 로드한 버전은 조회 갱신으로 덮어쓰지 않는다. 409 후 명시적 **Reload current rate**로 편집을 버리고 새 버전을 읽는다. 미확인 저장은 입력 잠금·원래 값/버전 재시도. 편집 없이 저장한 경우에도 요청 snapshot을 만든다 |
| SC9 | 저장 응답의 설비 ID·버전·금액을 검증한 뒤 조회 캐시를 갱신한다. 저장 전 진행 중인 옛 조회를 취소한다. 불완전 성공 응답은 미확인으로 표시하며 자동 PUT 재송신은 하지 않는다 |

## 데이터와 적용

- **V56__equipment_hourly_cost.sql**: 설비 FK·numeric(14,4) 비음수 CHECK·단조 버전·작성자/UTC 시각. 포트 없는 전용 컨테이너에서 V1 기준 스키마에 `BEGIN → CREATE → 존재 1 → ROLLBACK → 존재 0` 리허설 후 파일을 추가했다. 기존 V1–V55는 수정하지 않았다.
- 개발·세션 DB에는 적용하지 않았다. 새 스키마는 Testcontainers에서만 적용·검증했다.
- 소프트 삭제된 설비의 원가 기록은 보존하며 API와 공개 Query에서 제외한다. 기록된 현재 원가는 실제 비용 snapshot이나 전체 가격 변경 이력이 아니다.

## 검증

- `EquipmentHourlyCostIntegrationTest` 6건: 저장/0/해제/재생, 입력 경계와 외부 접근, 동시 수정, 정확한 분 산식, viewer/editor와 프로젝트 격리, JSON·버전 최대값.
- `equipment-hourly-cost.spec.ts`: 모의 API 정상·응답 유실·503·편집 없는 해제/재조회. 원래 expectedVersion, 입력 잠금, 409 뒤 편집 보존/명시적 새로고침, 별도 전환 추정 확인. 개발 DB 호출 없음.
- 조회/저장 hook와 입력 모델 19건, 측정 라인·분기·함수 100%. 전체 결과는 [WORKBOARD](../status/WORKBOARD.md) §1에 기록한다.

## 이어서 구현할 범위

- 다차원 setup 속성 규칙은 [setup 속성 계약](setup-attributes.md)에 연결됐다.
- ~~실제 설비 사용 시간·원가 snapshot~~ → 아래 "실행 실제 setup"(2cd). 계획 원가를 실제 원가로 표시하지 않는다.
- 현재 달력 날짜는 기존 시간대 동작을 유지한다. 프로젝트 시간대 적용은 별도 허가 대기 범위다.

## 실행 실제 setup (2026-10-10, 리드, §2 2cd)

상태: **구현 — 로컬 격리 검증만.** [결정](../status/DECISIONS-2026-10-05.md) §4 "setupCost는 setup 시간 × 설비 시간당 원가. Material Cost에 합치지 않는다. 계획은 현재 설비 원가의 estimate, 실제 원가는 실제 시간·비용 snapshot이 필요하다"의 실제 쪽 구현이다. AS1–AS6은 리드의 구현 선택이다. 새 마이그레이션 **V61** `production_run_setup`(개발 DB 미적용).

| # | 규칙 | 오류 |
|---|---|---|
| AS1 | `POST /production-runs/{id}/setups` `{requestId, equipmentId?, setupMinutes, note?}`, Project write, 열린 실행(pending·running)만. 설비 생략 시 실행의 작업지시 설비. 분은 정수 1–1440, 메모 500자 | 설비 없음·다른 프로젝트·범위 밖 400, 끝난 실행 400 `already finished` |
| AS2 | 기록 순간 설비의 시간당 원가와 그 **버전**을 행에 복사한다. 원가 = 분 × 원가 / 60, 소수 4자리 HALF_UP. 원가가 없으면 원가·금액 null. 뒤의 원가 변경은 이미 기록한 setup을 바꾸지 않는다 | |
| AS3 | `requestId`(UUID)는 실행 안에서 유일. 같은 작성자·같은 분·메모·설비의 재송신은 현재 상태를 돌려준다. 내용이 다르면 409 | 409 `requestId already belongs to a different setup.` |
| AS4 | `POST …/setups/{setupId}/cancel` `{reason}`: 열린 실행에서만, 사유 필수, 행은 지우지 않고 취소 표시(누가·언제·왜). 이미 취소된 것을 다시 취소하면 그대로 | 사유 없음 400 |
| AS5 | `GET /production-runs/{id}/setups`(Project read): 취소되지 않은 setup의 분·알려진 금액 합계, 원가 미상이 있으면 `costComplete=false`, 작업지시 설비 `defaultEquipmentId`, 모든 행(취소 포함). **재료비(`/cost`)에 더하지 않는다** | |
| AS6 | 기록·취소는 실행 행 잠금(`findForUpdate`) 아래에서 해서 마감과 겹치지 않는다. 실행 상세 **Setup (actual)**: 설비(기본 작업지시 설비)·분·메모 기록, 응답 유실 뒤 같은 입력은 같은 requestId로 **Retry setup**, 취소는 사유 입력. 끝난 실행은 읽기만(없으면 패널 숨김) | |

공개 API: `EquipmentCostQuery.findHourlyRate(projectId, equipmentId)`가 원가와 버전을 함께 돌려준다(production은 catalog 저장소를 직접 읽지 않는다).

검증(2026-10-10, 격리 복사본): `RunSetupCostIntegrationTest` 2건(작업지시 설비 기본값, 30/h 45분 22.5 → 원가 60으로 바뀐 뒤 15분 15·이전 행 유지, 같은 키 재송신·다른 내용 409, 원가 없는 설비 known subtotal, 재료비 불변, 취소 사유·합계 제외, viewer 읽기·쓰기 403·외부인 403, 마감 뒤 거절, 입력 검증·없는 실행 404), 설비·실행 원가·경계 테스트 묶음 60건 실패 0. 프런트 타입·lint, 모의 E2E `run-setup-cost.spec.ts`(503 뒤 같은 requestId 재시도, 취소) 포함 기본 모의 E2E 120 통과·16 의도적 제외.

남은 것: 작업지시별 계획 추정과 실제의 비교 화면, 설비 사용 시간(가동)의 실제 원가, 폐기 처리비(Waste Disposal Cost) 별도 설계.

## 끝난 실행의 setup 보정 (2026-10-10, 리드, §2 2cl)

상태: **구현 — 로컬 격리 검증만.** 새 마이그레이션 **V66**(설비 원가 이력·setup 원가 기준·보정 줄 종류, 개발 DB 미적용). [완료 실행 보정](production-run-correction.md)의 요청(쓰기)·owner 승인(=즉시 반영) 흐름을 그대로 쓴다(§6). AS7–AS10은 리드의 구현 선택이다.

| # | 규칙 | 이유 |
|---|---|---|
| AS7 | 보정 줄에 `cancel_setup`(`targetRunSetupId`)과 `add_setup`(`equipmentId`, `setupMinutes` 1–1440)을 더한다. 요청 때 검사(없는 setup 404, 이미 취소됨 409, 같은 setup 두 번 400, 설비·분 400), 승인 때 재고 줄 뒤에 반영. 취소 사유는 `Correction #n: <사유>`, 행은 지우지 않는다. V22의 종류 CHECK는 고치지 않고 V66에서 새로 건다 | 끝난 실행은 setup을 직접 바꾸지 않고 보정으로만 |
| AS8 | 보정으로 더한 setup은 **실행의 원래 마감 시각의 설비 원가**를 쓴다(§1 "완료 실행 보정은 원래 마감 단가"와 같은 원칙). 원가 이력이 그 시각을 덮지 않으면(첫 변경 전·마감 시각 없음) 처음 알려진 값으로 `estimated` | 보정 시점의 원가로 과거 실행 금액이 바뀌지 않게 |
| AS9 | 설비 시간당 원가가 **바뀔 때마다** `equipment_hourly_cost_history`에 이전/새 값·버전·작성자·UTC 시각을 남긴다(V66부터). 공개 `EquipmentCostQuery.findHourlyRateAt(projectId, equipmentId, at)` | AS8의 근거 |
| AS10 | setup 행의 `rateBasis`: `recorded`(기록 때 원가, 기존 모든 행), `historical`(보정, 마감 시각 이력), `estimated`(보정, 이력이 덮지 않음). 화면에 `rate at the run's finish`·`estimated rate` 표시 | 금액의 근거를 보이게 |

화면: 끝난 실행의 **Setup (actual)** 아래 접힌 **Request a setup correction**(취소할 setup 선택·더할 설비/분·사유 → 보정 요청). 승인은 기존 Corrections에서 하고, 승인되면 setup 목록을 다시 읽는다. 보정 줄 설명 `Cancel a setup`·`Add a setup of 20 min`.

검증(2026-10-10, 격리 복사본): `RunSetupCorrectionIntegrationTest` 2건(원가 30 → 마감 → 90으로 변경 뒤 보정한 20분은 30 기준 10·historical, 마감 뒤에 처음 원가를 정한 설비는 estimated·금액 미상, 취소 사유, 합계·불완전 표시 / 없는 setup 404·0분 400·없는 설비 400·같은 setup 두 번 400), setup·보정·설비·경계 묶음 104건 실패 0. 프런트 타입·lint·runs 단위 48, 모의 E2E(끝난 실행의 보정 요청) 포함 기본 모의 E2E 124 통과·17 의도적 제외.

남은 것: 설비 원가 이력 화면, 보정 승인 화면에서 setup 줄의 설비 이름 표시(지금은 분만).
