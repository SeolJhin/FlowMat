# 설비 시간당 원가와 전환 비용 추정

상태: **시간당 계획 원가 편집·전환 비용 추정 구현(2026-10-08, §2 2bs).** 근거 정책은 [2026-10-05 결정 §4](../status/DECISIONS-2026-10-05.md#4-setup비용부산물). 다차원 속성 규칙은 [setup 속성 계약](setup-attributes.md)에 구현했다. 실제 설비 사용 시간과 실행 비용 snapshot은 후속 구현이다.

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
- 실제 설비 사용 시간·원가 snapshot. 계획 원가를 실제 원가로 표시하지 않는다.
- 현재 달력 날짜는 기존 시간대 동작을 유지한다. 프로젝트 시간대 적용은 별도 허가 대기 범위다.
