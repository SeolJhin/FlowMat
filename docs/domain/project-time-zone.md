# 프로젝트 업무 시간대 (2by, 2026-10-09)

상태: **Accepted 정책 구현.** [최종 결정](../status/DECISIONS-2026-10-05.md)의 B안. **V58** 기존 프로젝트 `Asia/Seoul` backfill, 새 프로젝트 같은 기본값. 기존 마이그레이션은 수정하지 않는다. 개발 DB에는 이 작업에서 V58을 적용하지 않는다.

| 규칙 | 동작 | 위반 응답 |
|---|---|---|
| TZ1 | `GET /projects/{projectId}/time-zone` Project read; `PUT` Project owner만 | 외부/쓰기 불가 403 |
| TZ2 | PUT `{timeZone, expectedVersion}`. JVM ZoneId에 있는 IANA ID/UTC. offset만 있는 값·공백·임의 문자열 불가 | 400, 필드 이름 포함 메시지 |
| TZ3 | version은 JSON 정수, 0 이상. 프로젝트 행 잠금 안에서 버전 대조. 같은 작성자의 바로 이전 버전·같은 zone 재송신은 성공 복구 | 버전 충돌 409; 최대 버전 409 |
| TZ4 | `ProjectCalendarQuery.zone/today/date` + 주입 Clock. timestamp는 UTC instant를 유지하고 업무 날짜만 프로젝트 zone으로 해석 | 없는 project 404 |

LOT·FEFO·재고 경보·만료 폐기·창고 작업·할당·투입 분할·가용 재고·준비 점검·NCR 기한은 같은 프로젝트의 오늘을 쓴다. 설비 교대·휴일·가용 시간도 프로젝트 zone이다. 실사 날짜·NCR 기한·BOM 유효일처럼 명시적으로 입력하는 date-only는 시간대를 더해 이동시키지 않는다. 시간대 변경은 기존 instant·date 값을 수정하지 않고 이후 판정에 적용된다.

Project Settings → Project time zone: viewer 조회, owner 변경. 최초 편집 버전 고정, 409 재조회, 저장 미확인 시 같은 zone/version으로 수동 재시도. 확인된 변경 뒤 프로젝트 날짜에 의존하는 query를 무효화한다.

프로젝트의 일반 필드 변경은 변경한 열만 갱신하도록 DynamicUpdate를 적용해, 먼저 읽어 둔 이름/설명 변경이 새 timeZone/version을 덮어쓰지 않게 했다.

검증: ProjectTimeZoneIntegrationTest(기본값·권한·입력·충돌·재전송·동시 이름 변경), ProjectCalendarBoundaryIntegrationTest(UTC/서울 자정·NY DST·설비 달력·LOT/가용 재고), 프런트 hook 8건, 모의 browser 3건. 새로 입력할 필요가 없는 데이터의 날짜/업무 정책은 추가로 바꾸지 않는다.
