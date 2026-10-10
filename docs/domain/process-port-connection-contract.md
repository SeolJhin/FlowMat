# 공정 포트·연결 계약 (2026-09-26)

이 문서는 V24·V25의 공정 포트·연결 열을 정의한다. 설계 검증과 revision 발행 관문, 발행된 revision을 따르는 Flow Run 그래프 라우팅을 구현했다. 기존 마이그레이션은 변경하지 않았고 실행 모드와 단계 출처 기록을 V39에 추가했다.

## 필드 의미

| 필드 | 뜻 |
|---|---|
| `process_io.direction` | `output`은 자원을 내보내고 `input`은 받는다. 명시적 연결은 출력에서 입력으로 향한다. |
| `process_io.role` | 선택적 업무 라벨이다. `feed`(원료 투입), `product`(주생산물), `byproduct`(부산물), `waste`(폐기물), `control`(제어 정보)을 권장한다. 사용자 정의 라벨도 허용하며 연결·실행 판정에는 사용하지 않는다. 최대 50자다. |
| `process_io.item_id` | 포트가 Catalog Item과 연결될 때만 쓰는 선택적 binding이다(V42부터 NULL 허용, [ADR-003](../architecture/adr/ADR-003-resource-port-contract.md) 결정 4). 데이터·파일·API 포트는 비우고 `schema_json`으로 계약한다. 생성 API에서 `itemId`는 선택이다. 수정 API에서 비어 있는 `itemId`는 기존 값을 유지하고, `clearItem: true`가 연결을 지운다(`itemId`와 함께 보내면 400 `itemId cannot be supplied with clearItem.`). 없는 품목은 404, 다른 프로젝트 품목은 400이다. |
| `process_io.resource_type` | 연결 호환성을 판정하는 자원 분류다. 비어 있으면 `io_type`을 따른다. 두 명시적 포트에서 정확히 같아야 한다. 현재 기본값은 `material`이다. |
| `process_io.schema_json` | 포트가 실어 나르는 속성의 최소 객체 스키마다. 그래프 실행에서 명시적 연결을 통과할 때 `outputSnapshot.attrs`의 필수 속성과 타입을 검사한다. 없으면 형식 검증을 건너뛴다. |
| `process_io.validation_rule` | 포트 값에 대한 조건식이다. 저장 시 문법과 속성 참조를 검증한다. 그래프 실행에서 명시적으로 연결된 출력·입력 포트의 규칙을 단계의 `outputSnapshot`에 적용한다. |
| `process_connection.condition_expr` | 연결을 통과할 조건식이다. 발행된 revision의 식을 출발 단계의 `outputSnapshot`에 대해 평가한다. 거짓이면 후속 단계를 만들지 않는다. |
| `process_connection.capacity` | 한 번의 연결 흐름에서 허용할 최대 자원 수량이다. 단위는 연결의 `unit`이 있으면 그것을, 없으면 출발 포트의 `unit`을 사용한다. `null`은 제한 없음이다. 저장 시 0 이상 및 `numeric(19,4)` 범위를 검증하고 그래프 실행에서 `outputSnapshot.quantity`와 비교한다. |
| `process_connection.failure_policy` | 해당 연결로 생성된 단계 실패 시 `stop`은 실행 전체 실패, `skip`은 단계를 건너뜀, `retry`는 즉시 최대 3회 재시도를 뜻한다. 기본값은 `stop`이다. |

## 저장 계약

| 규칙 | 이유 | 위반 응답 |
|---|---|---|
| PC-01. 같은 공정을 출발·도착으로 연결할 수 없다. | 자기 참조와 무의미한 흐름 방지 | 400 `A connection cannot link a process to itself.` |
| PC-02. 같은 명시적 `fromIoId`→`toIoId` 살아 있는 연결은 하나다. | 중복 자원 흐름 방지 | 409 `Ports are already connected.` |
| PC-03. 출발 포트는 출발 공정의 `output`, 도착 포트는 도착 공정의 `input`이어야 한다. | 방향과 소유 관계 보장 | 400 `Connection fromIoId must be an output port of fromProcessId.` 또는 `Connection toIoId must be an input port of toProcessId.` |
| PC-04. 양쪽 포트의 `resourceType`은 같아야 한다. | 다른 자원 종류의 암묵적 변환 방지 | 400 `Connected ports resourceType must match.` |
| PC-05. 포트의 `itemId`는 서로 같아야 하며 연결의 `itemId`도 지정된 포트와 같아야 한다. 양쪽 포트 품목이 같고 연결 품목이 비어 있으면 저장 시 채운다. | 품목 계보 보존 | 400 `Connected ports itemId must match.` 또는 `Connection itemId must match the ports.` |
| PC-06. 등록된 단위의 유형은 포트·연결 간 같아야 한다. 모르는 단위는 저장을 허용하고 검증 보고서에 경고한다. | kg↔ea 같은 잘못된 변환 방지 | 400 `Connection unit type must match port units.` |
| PC-07. 포트의 `schemaJson`은 `{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}` 모양이다. 속성 타입은 `string`, `number`, `boolean`만 허용하고 필수 이름은 `properties`에 있어야 한다. 최상위의 알 수 없는 키는 무시한다. | 서로 비교 가능한 최소 스키마 확보 | 400 `schemaJson.type must be object.`, `schemaJson.properties...`, `schemaJson.required...` 등 필드 포함 메시지 |
| PC-08. 입력 포트의 필수 속성은 출력 포트의 `properties`에 같은 타입으로 있어야 한다. 한쪽 스키마가 없으면 연결은 허용한다. | 필수 입력의 공급 보장 | 400 `Target port needs <name> (<type>).` |
| PC-09. `conditionExpr`와 `validationRule`은 아래 문법에 맞고 최대 500자다. `attrs.name`은 해당 포트 스키마에 선언돼야 한다. 스키마가 없으면 참조를 허용한다. | 임의 코드 실행을 막고 조건을 재현 가능하게 함 | 400 `Invalid condition at position N: ...` |
| PC-10. `capacity`는 `null` 또는 0 이상이고 `failurePolicy`는 `stop`, `skip`, `retry` 중 하나다. | 정의 값의 의미 보존 | 400 `Connection capacity cannot be negative.` 또는 `Unknown connection failure policy.` |
| PC-11. 연결된 포트의 방향·자원 종류·품목·단위·스키마 수정은 기존 연결을 모두 재검증한다. 포트 삭제 시 연결도 같은 트랜잭션에서 소프트 삭제하고 각 연결 삭제 이벤트를 보낸다. | 고아 연결과 사후 호환성 파괴 방지 | 409 `Port change would break connection(s): <ids>` |

기존 캔버스의 기본 핸들 연결은 명시적 포트 ID 없이 저장할 수 있다. PC-02·PC-04·PC-08은 두 명시적 포트가 있을 때 적용한다. PC-05·PC-06은 한쪽만 지정돼도 지정된 값에 적용한다.

조건 문법: `or`, `and`, `not`, 괄호, `= != < <= > >=`, 숫자, 작은따옴표 문자열, `true`, `false`, `quantity`, `unit`, `item`, `attrs.<이름>`을 지원한다. 함수 호출은 허용하지 않는다. 평가 함수는 `boolean evaluate(Map<String,Object>)`이며 없는 값이나 서로 다른 타입의 비교는 `false`다.

## 워크플로 검증과 발행

`GET /workflows/{workflowId}/validation`은 읽기 권한을 요구한다. 결과는 `errors`, `warnings`, `issues[]`이며 각 문제에 `severity`, `code`, `processId`, `ioId`, `connectionId`, `message`가 있다. 오류 코드: `CONNECTION_ORPHAN`, `CONNECTION_INCOMPATIBLE`, `EXPRESSION_INVALID`, `PORT_SCHEMA_INVALID`, `REQUIRED_INPUT_UNCONNECTED`. 경고 코드: `PROCESS_ISOLATED`, `CYCLE`, `SCHEMA_UNVERIFIED`, `UNIT_UNKNOWN`, `RESOURCE_TYPE_UNKNOWN`. 오류를 먼저 표시한다.

`RESOURCE_TYPE_UNKNOWN`(2026-10-02)은 포트의 `resourceType`이 registry에 없을 때 나온다. Registry(Experimental)는 `material, product, energy, water, waste, file, data, api, parameter, signal, generic`이다([ADR-003](../architecture/adr/ADR-003-resource-port-contract.md) "Resource Type Registry"). `labor`는 실행 요건이지 포트로 흐르는 대상이 아니어서 넣지 않았다. 포트 편집 화면의 I/O Type에 `labor`가 있어 그 포트는 이 경고를 받는다. 저장과 발행은 막지 않는다. 목록 밖 값도 그대로 저장되며, 연결의 PC-04(양쪽 `resourceType` 일치)는 그대로 적용된다.

Revision 발행은 같은 검증을 수행한다. 오류가 있으면 409 `Workflow has N error(s): <앞 3개 요약>`으로 거절하고, 경고만 있으면 발행한다. 기존 revision 조회·폐기는 영향받지 않는다.

기존 데이터는 저장 시 일괄 수정하지 않는다. 과거의 위반 연결은 검증 보고서에 남기고 발행을 막는다. 운영 전 보고서를 검토하여 개별 포트·연결을 정상 API로 수정한다. 모르는 단위와 스키마 부재는 경고이므로 기존 그래프를 강제로 깨지 않는다. 자동 실행에 이 계약을 적용하려면 flow-run 담당자가 revision snapshot의 조건식·용량·실패 정책을 읽고 실행 시점의 수량·품목·속성으로 평가해야 한다.

## 2026-09-27 보강 규칙

| 규칙 | 이유 | 위반 응답 |
|---|---|---|
| PC-12. 포트 `direction`은 `input` 또는 `output`, `requiredYn`과 `allowShortageYn`은 `Y` 또는 `N`, `quantity`는 0 이상이어야 한다(2026-10-10부터 수량·단위는 material·product·품목 포트만 필수, [포트 수량·단위](port-measurement.md) PM2–PM3). 대소문자와 앞뒤 공백은 저장 전에 정규화한다. | 잘못된 값이 연결 및 필수 입력 검증을 우회하지 않게 한다. | 400, 해당 필드 이름을 포함한 메시지 |
| PC-13. 포트 수정·삭제와 연결 생성·수정은 동일한 workflow 행 잠금을 사용한다. 포트 수정은 잠금 뒤 최신 포트 상태를 다시 읽고 연결 호환성을 검증한다. | 동시에 요청해도 호환되지 않는 연결을 남기지 않는다. | 충돌 시 409 `Port change would break connection(s): <ids>`; 이미 삭제된 포트는 404 |

기존 DB의 잘못된 포트 값은 자동 변경하지 않는다. 워크플로 검증은 `PORT_INVALID` 오류로 표시하고 revision 발행을 막는다. 정상 API로 개별 값을 수정한다.

포트 수정 API는 `clearSchema: true`로 기존 `schemaJson`을 명시적으로 제거한다. `schemaJson`과 `clearSchema: true`를 함께 보내면 400 `schemaJson cannot be supplied with clearSchema.`로 거절한다. 두 필드를 모두 생략하면 기존 스키마를 유지한다.

편집 화면에서 `role`, `formula`, `validationRule`을 비우면 빈 문자열을 보내고 서버가 `null`로 저장한다. 필드를 요청에서 생략하면 기존 값을 유지한다.

## 2026-09-29 저장 정밀도·문자 보강 규칙

| 규칙 | 이유 | 위반 응답 |
|---|---|---|
| PC-14. 연결 수정의 `flowRate`, `delayTimeSec`, `lossRate`는 원래 JSON 소수를 보존하여 각각 `numeric(14,4)`, `numeric(10,2)`, `numeric(5,4)` 범위를 검증한다. 유효한 지수 표기와 소수 끝의 0은 허용한다. | 부동소수점 반올림으로 초과 자릿수가 사라지거나 극소 값이 0이 되는 것을 막는다. | 400 `<field> must fit numeric(...).`; 문자열·객체·배열 등은 400 `<field> must be a number or null.` |
| PC-15. 포트·연결 문자열과 `schemaJson`의 모든 문자열·객체 키에 NUL 및 짝 없는 UTF-16 surrogate를 허용하지 않는다. 원래 입력을 공백 정규화 전에 검사한다. 정상 한글·이모지 및 다른 저장 가능한 제어 문자는 허용한다. | DB 오류와 문자 대체, 끝의 NUL이 trim으로 사라지는 데이터 손상을 막는다. | 400 `<field> contains a character PostgreSQL cannot store.` |
| PC-16. 연결 생성·수정 요청의 잘못된 JSON과 파서가 표현할 수 없는 숫자는 저장 전에 거절한다. | 입력 오류가 500으로 표시되지 않도록 한다. | 400 `Request body must contain valid JSON.` 또는 식별된 숫자 필드의 `<field> could not be read from the request body.` |
| PC-17. 포트의 `ioType`, `resourceType`, `colorScheme`과 연결의 `connectionType`은 서버 언어 설정에 독립적인 소문자로 정규화한다. 연결의 자원 종류 비교도 같은 정규화를 사용한다. | 터키어 설정에서 `MATERIAL`이 `materıal`로 저장되거나 대소문자만 바꾼 포트가 기존 연결을 깨는 것을 막는다. | 유효한 코드의 대소문자 변경은 200. 실제 자원 종류 불일치는 기존 PC-04의 400 또는 연결된 포트 변경의 409. |
| PC-18. 포트 `quantity`와 연결 `capacity`의 수학적 0은 지수·소수 자릿수와 관계없이 일반적인 0으로 저장한다. | `0e-1000000`처럼 값은 유효한 0이지만 원래 소수 자릿수로 인해 PostgreSQL 입력 범위를 넘는 표현을 안전하게 처리한다. | 유효한 0은 200. 0이 아닌 값의 기존 숫자 범위·정밀도 위반은 계속 400. |
| PC-19. 앞뒤 공백 정리 후 남은 내용이 없는 선택 문자열은 빈 값으로 처리한다. 생성의 `ioType`, `resourceType`, `colorScheme`, `connectionType`, `failurePolicy`, 핸들은 기존 기본값을 사용한다. 수정의 `ioType`, `resourceType`, `connectionType`, 포트 `unit`은 빈 값이면 기존 값을 유지하며, 선택 이름·역할·수식·검증식·연결 레이블·연결 단위·조건식은 `null`로 지운다. | 공백 정리로 사라지는 제어 문자만 보낸 값이 자원 종류를 빈 문자열로 바꾸거나 연결 무결성 검사에 실패하는 문제를 막는다. | 유효한 빈 선택 값은 200. 포트 생성의 필수 `unit`이 비어 있으면 400 `unit is required.` |

PC-14에서 필드 생략은 기존 값을 유지한다. 명시적 `null`은 `flowRate`를 지우고 `delayTimeSec`·`lossRate`를 0으로 돌린다. 이 규칙은 연결 요청 필드에만 적용하며 전역 JSON 파싱 설정을 변경하지 않는다.

PC-15는 새 생성·수정 입력에 적용한다. 실패한 요청은 포트·연결의 기존 값과 연결 버전을 바꾸지 않는다. 과거 대체·정규화된 문자의 원래 입력은 복구할 수 없어 기존 데이터와 발행된 리비전을 자동 수정하지 않는다.

PC-15의 문자열 검사는 요청 본문의 참조 ID에도 적용한다. 포트 생성의 `processId`·`itemId`, 포트 수정의 `itemId`, 연결 생성의 `workflowId`·`fromProcessId`·`toProcessId`·`fromIoId`·`toIoId`·`itemId`, 연결 수정의 `fromIoId`·`toIoId`·`itemId`를 각각 조회 전에 검사한다. 잘못된 문자는 필드명이 든 400으로 거절하며, 유효한 ID의 기존 권한·소속·연결 호환성 검증은 그대로 적용한다.

PC-17·PC-18도 새 생성·수정 입력에 적용한다. 과거 언어 설정으로 저장된 자원 종류는 사용자 정의 코드일 수 있어 자동 치환하지 않는다. 잘못 저장된 코드가 확인되면 정상 API로 개별 수정한다. 발행된 리비전과 기존 마이그레이션은 변경하지 않는다. 숫자는 값이 정확히 0인 경우에만 정규화하며, 극소인 0이 아닌 값을 0으로 바꾸지 않는다.

PC-19의 빈 값 판단은 기존 `trim` 정규화 후 수행한다. NUL·짝 없는 surrogate는 PC-15에 따라 정규화 전에 거절하고, 내용 중간의 저장 가능한 제어 문자는 기존대로 보존한다. 기존 데이터와 발행된 리비전은 일괄 수정하지 않는다.

## 2026-09-30 조건 연산자·부모 상태 보강 규칙

| 규칙 | 이유 | 위반 응답 |
|---|---|---|
| PC-20. 비교 연산자는 `=`, `!=`, `<`, `<=`, `>`, `>=`만 허용한다. `==`는 `=`의 별칭이 아니다. 포트 `validationRule`과 연결 `conditionExpr` 모두 저장 전에 검사한다. | `==`가 저장은 되지만 평가할 때 항상 `false`가 되던 불일치를 막는다. | 400 `Invalid condition at position N: unsupported comparison operator '=='` |
| PC-21. 포트의 생성·수정·삭제와 연결의 생성·수정·삭제는 워크플로 행 잠금 뒤 워크플로의 최신 삭제 상태를 확인한다. 포트 작업은 부모 공정의 최신 삭제 상태도 확인한다. 포트 생성은 revision 발행과 같은 워크플로 잠금을 사용한다. | 잠금 대기 중 부모가 삭제된 요청을 거절하고, 발행 검증과 스냅샷 사이에 새 필수 포트가 들어오지 않게 한다. | 삭제된 워크플로 또는 공정에 대한 포트 변경과 삭제된 워크플로의 연결 변경은 404. 잠금이 해제된 뒤 정상 부모의 작업은 처리한다. |
| PC-22. 워크플로가 삭제되면 포트 목록·단건 조회와 연결 목록·단건 조회는 404다. | 삭제된 설계의 하위 객체가 개별 URL에서 계속 노출되지 않게 한다. | 404. 기존 포트·연결 행과 과거 revision의 스냅샷은 자동 삭제하지 않는다. |

과거에 저장된 `==` 조건은 자동으로 바꾸지 않는다. 현재 초안은 워크플로 검증에서 `EXPRESSION_INVALID`로 표시하고 새 revision 발행을 409로 막는다. 수정할 때는 포트 또는 연결 API로 `=`을 명시해야 한다. 이미 발행된 revision도 자동 변경하지 않으며, 그래프 실행은 시작할 때 표현식을 검증해 잘못된 발행본을 409로 거절한다.

PC-21은 포트·연결 서비스와 revision 발행이 함께 쓰는 워크플로 잠금에 관한 규칙이다. 공정 자체를 수정·삭제하는 서비스까지 같은 잠금으로 직렬화하는 계약은 아직 확정되지 않았다.

## 2026-09-30 그래프 실행 계약 (V39)

`POST /flow-runs/graph`는 발행 상태의 revision snapshot에서 시작 노드(진입 연결 없음)를 `planned`로 만든다. 기존 `POST /flow-runs`는 수동 모드이며 기존 기록은 `execution_mode=manual` 기본값을 가진다. 그래프 모드에서 단계 수동 추가와 수동 retry는 409다. 실제 공정 작업은 각 단계를 사용자가 시작하고 완료 또는 실패로 기록한다. 이는 라우팅 정책이며 작업자·설비를 자동 가동하는 엔진은 아니다.

| 규칙 | 동작 | 위반 응답 |
|---|---|---|
| GR-01 | 순환 연결이 있거나 노드·연결 참조가 잘못된 revision은 그래프 실행을 시작하지 않는다. | 409 `Graph revisions with cycles cannot execute.` 등 |
| GR-02 | 완료된 출발 단계의 `outputSnapshot` 객체에서 `quantity`, `unit`, `item`, `attrs`를 읽고 발행된 `conditionExpr`을 평가한다. 거짓이면 해당 연결은 통과하지 않는다. | 객체가 아니면 400 `Graph step outputSnapshot must be an object.` |
| GR-03 | 조건을 통과한 연결만 `capacity`와 단위를 검사한다. `quantity`가 없거나 용량을 초과하면 출발 단계 완료 전체를 원자적으로 거절해 재입력할 수 있게 한다. | 409 `Connection <id> requires outputSnapshot.quantity for capacity.` 또는 `Connection <id> capacity exceeded.` / `unit does not match...` |
| GR-04 | 통과한 연결마다 대상 `planned` 단계를 만들고 `sourceConnectionId`, `sourceStepId`, `inputSnapshot`, `step_created` 이벤트를 기록한다. 여러 진입 연결은 각각 별도 단계이며 V40의 같은 run FK가 정확한 원본 단계를 보존한다. | 단계 수 상한 초과 시 409 |
| GR-05 | 대상 단계 실패는 진입 연결의 `failurePolicy`를 따른다. `skip`은 단계 `skipped`와 이벤트 기록, `retry`는 처음 시도 이후 최대 3회 즉시 새 attempt, `stop` 및 재시도 소진은 run 실패다. 시작 노드의 정책은 `stop`이다. | 종료된 run 수정은 409 |
| GR-06 | 모든 기록된 단계가 `completed` 또는 `skipped`일 때 run을 마칠 수 있다. | 미완료 단계가 있으면 409 |
| GR-07 | 통과할 연결에 명시적 출력·입력 포트가 있으면 두 포트의 `validationRule`을 전송 값에 적용한다. 규칙이 거짓이면 단계 완료를 원자적으로 거절한다. | 409 `Port <id> validationRule did not pass.` |
| GR-08 | 명시적 출력·입력 포트의 `schemaJson.required`는 `outputSnapshot.attrs`에 있어야 하고 선언된 속성 값은 `string`, `number`, `boolean` 타입을 따라야 한다. 추가 속성은 허용한다. | 409 `Port <id> requires outputSnapshot.attrs.<name>.` 또는 `... must be <type>.` |
| GR-09 | 발행 snapshot의 연결이 명시한 `fromIoId`와 `toIoId`는 각각 존재하는 출발 공정의 출력 포트와 도착 공정의 입력 포트여야 한다. 과거 snapshot의 누락·오방향 참조도 실행 시작 전에 거절한다. | 409 `Published revision connection <id> has an invalid fromIoId.` 또는 `... toIoId.` |
| GR-10 | `POST /flow-runs/{runId}/steps/{stepId}/preview`는 실행 중인 그래프 단계의 `outputSnapshot`을 완료와 같은 발행 revision 규칙으로 평가해 연결별 `willRoute`를 반환한다. 조건이 거짓인 연결도 결과에 포함한다. 단계·attempt·event는 바꾸지 않으며 완료 요청에서 다시 검증한다. | 쓰기 권한 없으면 403, 실행 중인 그래프 단계가 아니면 409, 출력 객체가 아니면 400, 용량·포트 검증 실패는 완료와 같은 409 |
| GR-11 | 그래프 단계 완료 시 조건이 거짓인 연결마다 출발 단계에 `connection_filtered` 이벤트를 남긴다. payload에는 `connectionId`, `targetNodeId`, `reason=condition_false`를 넣고 화면 이력에 연결 이름을 표시한다. 미리보기는 이 이벤트를 만들지 않는다. | 단계 완료의 단일 트랜잭션에 포함되어 완료 실패 시 이벤트도 저장되지 않음 |
| GR-12 | 과거 발행 snapshot의 `processIos` 형태, 포트 검증식·스키마, 연결 조건식이 잘못되면 그래프 실행 시작을 거절한다. 저장된 발행본의 오류이며 요청 본문 오류로 취급하지 않는다. | 409 `Published revision has invalid ...` |

조건·용량·정책·포트 검증식과 스키마는 시작할 때 고정된 발행 revision에서 읽는다. 이후 draft를 고쳐도 진행 중인 run에 반영되지 않는다. 연결 단위는 `outputSnapshot.unit`이 제공되면 비교하며 자동 단위 변환은 하지 않는다. 연결되지 않은 포트의 실행 값 검증, 여러 진입 연결의 합류, 수량 분할, 일정·지연 시간, 자동 작업 실행은 후속 범위다.

`GET /flow-runs/{flowRunId}/steps/{stepId}/lineage`는 프로젝트 읽기 권한을 확인한 뒤 선택 단계와 정확한 원본 단계 체인(`ancestors`, 시작 단계부터 순서대로), 모든 하위 실행 단계(`descendants`, 단계 순번 순서대로)를 반환한다. 수렴 그래프에서도 각 단계의 `sourceStepId`를 따라가므로 같은 공정 노드의 다른 실행 경로가 섞이지 않는다. 다른 run에 속한 `stepId`는 404다. 화면의 단계 상세에는 이 경로와 저장된 입력·출력 snapshot, 오류 메시지를 표시한다.
