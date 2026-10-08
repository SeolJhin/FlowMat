# 품목 setup 속성과 설비 전환 규칙

상태: **구현(2026-10-08, WORKBOARD §2 2bt).** [사용자 결정 §4](../status/DECISIONS-2026-10-05.md#4-setup비용부산물)에 따른 다차원 속성 모델이다. 단일 setup_group을 추가하지 않는다. 비용 추정은 [설비 원가](equipment-setup-cost.md), 기존 품목 쌍/기본 규칙은 [전환 시간](equipment-changeover.md)을 함께 참고한다.

## 계약

| 규칙 | 동작·이유·거절 |
|---|---|
| SA1 | 품목 속성은 별도 item_setup_attributes에 저장한다. 기존 상세 수정/CSV가 지우지 않는다. 미설정은 {}·version 0, {} 저장은 명시적 해제 |
| SA2 | 속성은 최대 20개 문자열 쌍. 이름 1–50자, 값 1–100자. 양끝 공백 제거 후 대소문자 구분. 빈 문자열·제어 문자·단독 surrogate·중복 이름·__proto__/prototype/constructor·숫자/배열/중첩 객체는 400, attributes 또는 해당 필드 이름을 메시지에 표시 |
| SA3 | GET /items/{id}/setup-attributes는 Project read, PUT은 write. attributes·expectedVersion 필수. viewer 읽기 가능/쓰기 403, 외부인 403, 삭제/없는 품목 404. 변경자·시각은 서버 로그인 정보·UTC |
| SA4 | 설비 규칙의 fromAttributes/toAttributes는 각 방향의 모든 키가 정확히 일치해야 한다(AND). 한쪽 {}는 그 방향의 아무 품목, 양쪽 {}는 400: 기존 any-to-any 규칙을 사용한다. 없는/삭제/외부 프로젝트 품목은 빈 쪽이라도 속성 규칙에 맞지 않는다 |
| SA5 | 선택 순서: 정확한 품목 쌍 → 속성 규칙 → 기존 from-item/any → any/to-item → any/any. 속성 규칙 내 priority 1–100000의 낮은 수 우선. 활성 규칙의 priority는 설비 내 유일하며 중복 저장 409 priority. 여러 속성 규칙의 모호한 동률을 피하도록 사용자가 순위를 명시한다. 같은 품목 연속 생산은 기존 정확한 자기 쌍 규칙이 있는 경우만 전환 시간 적용 |
| SA6 | GET /equipments/{id}/setup-changeovers는 활성 규칙을 priority 순으로 반환. PUT /{changeoverId}는 UUID를 사용하며 fromAttributes/toAttributes/priority/minutes/expectedVersion 필수, note 선택. minutes 1–10080 정수, note 최대 500자. note의 NUL/단독 surrogate는 400; 정상 한글·이모지·메모 개행은 저장 가능. 형식/한계/잘못된 JSON은 400. 새 UUID·version 0 → 저장 version 1 |
| SA7 | 품목/설비 부모 행 잠금 후 삭제 상태와 버전 확인. 다른 동시 수정은 409 expectedVersion. 바로 이전 버전 + 같은 작성자 + 같은 전체 내용의 재시도만 현재 저장 결과 반환(중복 버전 증가 없음). 버전 최대값은 409. 임의의 작성자 필드는 권한/감사 정보에 영향 없음 |
| SA8 | DELETE /equipments/{id}/setup-changeovers/{uuid}?expectedVersion=…는 write. 현재 버전 대조 후 soft delete, 남은 목록 반환. 충돌 409, 없는/외부 설비 규칙 404. 삭제된 UUID의 PUT은 409로 재생성 방지. 삭제된 priority는 다른 새 UUID로 재사용 가능 |
| SA9 | 품목 Details의 Setup attributes, 설비 Schedule의 Setup attribute rules에서 편집. 저장 응답 유실/503/잘못된 성공 응답은 미확인으로 표시하고 같은 ID·내용·로드한 버전으로 수동 재시도. 입력을 잠가 다른 저장이 섞이지 않게 한다. 409는 편집 보존 후 명시적 Reload로 버리고 최신 목록을 읽는다. 자동 PUT/DELETE 반복 없음 |
| SA10 | 응답의 ID·안전한 속성 map·버전·규칙 범위를 확인한 뒤 캐시 갱신. 오래된 진행 중 조회는 저장 전에 취소. 품목/규칙 저장·삭제 후 작업지시 준비/계획과 프로젝트 설비 부하를 다시 조회한다 |
| SA11 | GET /equipments/{id}/setup-preview?fromItemId=…&toItemId=…는 Project read. 같은 프로젝트의 live 품목 두 개를 검증하며 빠진/없는/외부/삭제 품목은 400 with fromItemId/toItemId, 없는/삭제 설비 404, 외부인 403. 적용 minutes·ruleType·changeoverId 반환. EXACT_ITEM_PAIR/ATTRIBUTE_RULE/FROM_ITEM/TO_ITEM/DEFAULT/NONE으로 이유를 표시하며 NONE은 0분·null ID |
| SA12 | 미리보기는 실제 계획의 기존 선택 함수를 호출하고 repeatable-read 트랜잭션에서 선택/설명을 같은 저장 시점으로 읽는다. 저장·승인·날짜 변경 없음. 화면은 저장한 규칙만 대상으로 하며 미저장 입력을 적용하지 않는다. 입력 쌍과 응답 ID가 다르면 거절; 쌍이 바뀌는 동안 이전 결과를 표시하지 않는다. 선택 품목이 목록에서 사라지면 이전 캐시 결과를 숨기고 새 조회를 막는다 |

## 예시

품목 A: {color: red, mold: M1}, B: {color: blue, mold: M2}.

- 정확한 A→B 규칙이 있으면 그것을 적용한다.
- 없으면 from {color: red, mold: M1} → to {mold: M2}, priority 10, minutes 30 같은 속성 규칙을 적용한다. 색상만 같고 금형이 다르면 이 규칙에는 맞지 않는다.
- priority 5의 다른 속성 규칙도 맞으면 5를 선택한다. 더 많은 속성을 썼다는 이유로 priority를 건너뛰지 않는다.
- 맞는 속성 규칙이 없으면 기존 품목 wildcard/default를 적용한다. 기존 데이터는 속성이 없으므로 기존 규칙을 그대로 사용한다.

## 데이터·실행 적용

- **V57__setup_attributes.sql**: 별도 품목 속성·설비 규칙 테이블. 부모 FK, JSON object/string 값 CHECK, 최소 한 방향 조건, 정수 범위·버전 CHECK, 활성 priority 유일 index. 추가 직전 V56을 다시 확인했다.
- 전용 포트 없는 컨테이너에서 V1 기준 BEGIN → 테이블 2/인덱스 생성 → 존재 2 → ROLLBACK → 존재 0 리허설. 개발 DB에 적용하거나 기존 마이그레이션을 수정하지 않았다. Testcontainers에서 전체 Flyway 적용 검증.
- 기존 규칙·품목·단가·생산 기록을 backfill하거나 변경하지 않는다. 새 필드 없는 기존 조회/명령 계약은 유지한다.
- catalog의 기존 CatalogQuery.changeoverMinutes 및 EquipmentChangeoverService.changeover 경로에 연결하여 준비 점검·기간 제안·부하/순서 제안·계획 전환 원가가 같은 선택 규칙을 사용한다. 실제 설비 시간/원가 snapshot, 날짜 자동 변경은 이 기능의 동작이 아니다.
- 속성/규칙은 **현재 계획 조건**이다. 과거 실행의 setup 속성이나 적용 규칙을 고정 저장하는 계약은 아직 없다. 완료 실행 비용으로 표시하지 않는다.

## 검증

SetupAttributesIntegrationTest: 다차원 저장/기존 상세 보존, JSON/길이/예약 키, 필수 버전, 선택 순서/AND/미지정 차원, 동시 속성 편집·같은 priority 동시 생성, viewer/editor·작성자 재시도, 삭제·프로젝트 격리, 버전 한계. 브라우저 setup-attributes.spec.ts는 모든 API를 가짜 응답으로 처리하여 실제 DB에 쓰지 않고 정상/응답 유실·충돌 보존·명시적 재조회·삭제를 검증한다. 단독 surrogate가 200으로 저장되는 실패를 재현한 뒤 UTF-8 저장 가능 여부와 NUL을 검증하도록 수정했다. 메모·정상 한글/이모지/개행도 대조한다. 통합 10건, 프런트 hook/모델 37건(라인 98.27%·분기 98.55%), 정상/응답 유실 모의 UI 2건(375px 품목·설비 편집에서 가로 넘침 없음). 전체 수치는 WORKBOARD §1에 남긴다.

## 저장 규칙 미리보기 (2026-10-08, §2 2bv)

Schedule의 **Saved setup preview**에서 From/To 품목을 고르면 적용 규칙 종류와 분 수를 확인한다. 미저장 편집과 실제 실행은 구분한다. 품목 속성·규칙 저장/삭제와 기존 품목 쌍 변경 뒤에는 활성 미리보기도 다시 읽는다. 다른 사용자의 변경은 **Reload saved preview**로 새로 확인할 수 있다.

- EquipmentSetupPreviewIntegrationTest 3건: 정확한 품목 쌍/속성/wildcard/default/NONE 선택 이유, 같은 품목 연속 생산, viewer/외부인·품목 격리/삭제, 조회 후 버전 불변.
- 프런트 조회 hook 13건: 빈 선택 비활성, 쌍별 캐시, 잘못된 ID/분/종류 응답 거절, NONE/적용 규칙 구분.
- 모의 UI에서 선택 변경·미저장 입력 제외·수정/삭제 후 다시 조회·375px을 검증한다. 다른 사용자가 품목을 삭제한 뒤 낡은 결과가 남는 실패도 재현해 수정했다.
