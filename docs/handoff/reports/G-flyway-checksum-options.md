# G. Flyway 체크섬 해결안

**한 줄 결론:** 기존 DB의 기동 복구에는 검증된 백업 뒤 `repair`가 가장 작은 변경이지만, 이는 DB 이력을 새 SQL에 맞춰 다시 기록하므로 운영 적용은 사람이 결정해야 한다. V2를 원복하는 안은 새 운영 DB에 데모 데이터가 들어가는 문제를 별도로 해결해야 한다.

## 한 것 / 못 한 것

- `4e251a0`의 실제 diff 확인: V2는 `flowmat.demo_seed_enabled` 조건을 추가했고, V4·V5는 주석만 추가했다. 현재 dev/prod 프로필은 Flyway `init-sqls`로 각각 `true`/`false`를 설정한다.
- 기존 DB의 `flyway_schema_history` 조회, `repair`, 마이그레이션 파일 수정, 운영 DB 접속은 하지 않았다.

## 선택지 비교

| 항목 | A. 현 파일 유지 + DB별 repair | B. V4·V5 원복 + V2 별도 처리 |
| --- | --- | --- |
| 기존 DB 복구 | 적용된 V2·V4·V5 체크섬을 현 파일에 맞춰 재정렬한다. | V4·V5 불일치는 없어지나 V2 불일치는 계속 남는다. V2도 원복해야 기존 이력과 일치한다. |
| 새 운영 DB | 현재 V2는 prod `init-sqls=false`로 데모 행 삽입을 건너뛴다. | 원본 V2는 무조건 데모 행을 삽입한다. **V2 원복 + 나중 V18 추가만으로는 삽입 자체를 막을 수 없다.** 운영 신규 DB의 V2 실행을 막는 별도, 사전 검증된 메커니즘이 필요하다. |
| 이력 신뢰 | 실제로 적용된 SQL과 이력 체크섬의 의미가 달라진다. `repair`는 이미 실행된 V2를 재실행하지 않는다. | 원래 이력을 유지하지만 배포본별 V2 동작이 달라져 새 DB 생성 경로가 복잡해진다. |
| 범위/위험 | 모든 이미 적용된 DB를 빠짐없이 수리해야 한다. `repair`는 실패 마이그레이션 제거·누락 마이그레이션 deleted 처리도 할 수 있어 전체 출력 확인이 필수다. | V4·V5 주석만 원복은 안전하지만 V2를 무작정 원복하면 신규 prod 데이터 격리가 깨진다. |

Flyway 공식 문서: [repair 동작](https://documentation.red-gate.com/flyway/reference/commands/repair), [versioned migration 변경 원칙](https://documentation.red-gate.com/fd/versioned-migrations-273973333.html), [schema history](https://documentation.red-gate.com/fd/flyway-schema-history-table-273973417.html).

## A안 실행서 초안 — **실행하지 않음**

1. 대상 DB마다 앱 쓰기 중지, 백업·복구 연습, `flyway_schema_history` 전체 사본 확보. 적용 버전·checksum·success를 조회해 V2/V4/V5 외 다른 차이가 없는지 확인한다. 기존 데모 ID(`demo-owner`, `prj_demo_main`, `wf_demo_main`) 존재도 확인한다.
2. 현재 배포본과 정확히 같은 migration locations를 사용한다. 백엔드 `build.gradle`에는 Flyway Gradle 플러그인이 없으므로 `gradle flywayRepair` 명령은 바로 사용할 수 없다. 별도로 준비한 Flyway CLI에서 `FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD`, `FLYWAY_LOCATIONS`를 각 대상 DB에 맞춰 설정하고 `flyway info`, `flyway validate` 결과를 보관한다.
3. 사람이 대상 DB·백업을 재확인한 뒤 `flyway repair`를 **DB별로** 실행하고 출력의 `migrationsAligned`가 기대한 V2/V4/V5인지, `migrationsRemoved`·`migrationsDeleted`가 비어 있는지 확인한다. 예상 밖 항목이 있으면 후속 배포를 멈춘다.
4. `flyway validate` → 앱 기동 → `ddl-auto=validate` → `/api/actuator/health` → 인증·핵심 API를 확인한다. 새 임시 DB에서 `ProdMigrationIsolationTest`(prod 데모 행 0건)와 `FlowMatSmokeTest`(전체 적용/엔티티 검증)를 통과시킨다.
5. 되돌리기는 DB 백업 복원이다. 단순히 예전 checksum을 다시 넣으면 코드와 DB 이력의 불일치가 재발한다. 이미 적용된 V2의 데모 행은 `repair`가 제거하지 않으므로 별도 데이터 감사가 필요하다.

## B안 실행서 초안 — **실행하지 않음**

1. V4·V5의 새 주석을 제거하면 두 파일은 `4e251a0` 이전과 같아진다. V2도 원본으로 되돌릴 경우 기존 DB checksum은 맞지만, 새 prod DB에서 원본 V2가 데모 행을 삽입한다.
2. 따라서 V2 원복은 prod에서 V2를 **실행 전에** 안전하게 우회하는 방식, 기존 prod의 데모 행 처리, 새 dev/test의 시드 경로를 함께 설계한 후에만 선택한다. V18에서 데모 행을 사후 삭제하는 방식은 중간 노출·참조 데이터 삭제 위험이 있어 대체책으로 확정하지 않는다.
3. 사전 검증: 기존 DB에서 `flyway validate`, 새 dev/prod DB에서 각각 `FlowMatSmokeTest`·`ProdMigrationIsolationTest`, 데모 계정 및 프로젝트 존재/부재 확인. 전환 중 실패하면 배포본과 DB를 함께 백업 상태로 되돌린다.

## 사람 결정이 필요한 것

- D4: A/B 선택, 대상 DB 목록, 백업·정지 시간, 운영 prod에서 기존 데모 행이 존재할 때 처리 기준.
- 현 코드에서는 A안을 권고한다. V2를 되돌리면 신규 prod 격리가 즉시 깨지기 때문이다. 이는 코드와 공식 Flyway 동작에서 도출한 **추론**이며 실제 DB 이력은 조회하지 않았다.

## 다른 담당에게 넘길 것

- DB 운영 담당: 각 환경의 적용 버전/체크섬/데모 행 현황과 백업 복구 가능 여부 확인.
- 배포 담당: 같은 migration locations와 Flyway 버전을 쓰는 read-only `info`/`validate` 절차 준비.
