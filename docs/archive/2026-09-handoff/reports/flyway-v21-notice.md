# V21 적용 상태 — workflow revision 작업 세션 전달

> **보관 문서(레거시)** · 현재 기준이 아니다. 구현·리팩토링으로 사실과 달라진 내용이 있을 수 있으니 작업 근거로 쓰지 않는다. 지금 기준은 [docs/README.md](../../../README.md), 이 폴더 안내는 [archive/README.md](../../README.md).

2026-09-24 기준입니다.

- `V21__production_run_workflow_revision.sql`은 아직 커밋되지 않았지만 **로컬 dev DB(`localhost:5432/flowmat`)에 이미 적용됐습니다**(17:07). dev 백엔드가 devtools로 재시작하면서 적용됐습니다.
- 파일 checksum은 dev DB에 기록된 값(`-277790845`)과 같습니다. V16~V20도 모두 일치합니다.

## 요청

- **V21은 지금 내용 그대로 커밋해 주세요.** 이름, 내용, 주석, 공백도 바꾸지 않습니다. 바뀌면 dev DB가 `Migration checksum mismatch`로 기동에 실패합니다.
- 이후 스키마 변경은 **V23 이상의 새 migration**으로 추가합니다. **V22는 종료된 실행 보정 기능(`V22__production_run_correction.sql`, [설계](../../../domain/production-run-correction.md))이 사용합니다.** 번호를 건너뛰면 Flyway 검증이 실패하므로 V23부터 차례로 씁니다.
- V19~V21과 커밋 `2bd69b0`의 이력은 다시 쓰지 않습니다(amend, rebase, 파일 교체 모두 금지).
- 어떤 DB에도 `flyway repair`나 초기화를 하지 않습니다.

## 실 API E2E 영향

- 작업 트리의 `RunsRoute.tsx`는 발행된 workflow revision이 없으면 실행 시작 버튼을 비활성화합니다(`disabled={… || !selectedRevisionId}`). 데모 workflow(`wf_demo_main`)에는 발행된 revision이 없어서, `e2e/lot-genealogy.spec.ts`와 `e2e/bom-lot-flow.spec.ts`의 실행 시작 단계가 시간 초과로 실패합니다(2026-09-24 17:4x, `REAL_API_E2E=1`).
- 이 변경을 반영할 때 두 spec에 revision 발행 단계를 넣을지, 데모 seed에 발행된 revision을 둘지(새 migration 필요) 정해 주세요. seed로 하려면 V2를 고치지 말고 새 버전으로 추가합니다.

## 참고

- 17:07:06에 dev 백엔드 재시작 한 번이 `Unable to obtain inputstream for resource: db/migration/V20__workflow_revision.sql`로 실패했고, 5초 뒤 재시작은 정상이었습니다. 빌드 중 리소스 파일이 교체되는 순간과 겹친 일시 오류로 보이며 checksum 문제는 아닙니다.
- 17:37에는 devtools 재시작이 컴파일 도중에 일어나 `ProductionRunService` bean을 찾지 못하고 기동에 실패했습니다. 지금 클래스 파일은 정상이라 다음 컴파일 때 다시 올라옵니다.

## V26 checksum 불일치 (2026-09-24 23:09) — flow run step 작업 세션 확인 필요

**현재 상태:** 로컬 dev 백엔드(8080)가 아래 오류로 기동하지 못합니다.

```
Migration checksum mismatch for migration version 26
-> Applied to database : -303876537
-> Resolved locally    : -1763105342
```

**경위** (dev DB `flyway_schema_history`와 파일 수정 시각 기준)

| 시각 | 일 |
|---|---|
| 22:11:51 | V24(`process io port contract`) 적용 |
| 22:23:44 | V25(`process connection contract`) 적용 |
| 22:55:33 | **V26(`flow run steps`) 적용**, checksum `-303876537` |
| 23:06:39 | `V26__flow_run_steps.sql` 파일이 **적용 뒤에 수정됨** |
| 23:09 | devtools 재시작 → 검증 실패 |

**원인**
- dev 백엔드는 devtools로 돌아서, `build/resources`의 migration이 바뀌면 재시작하며 **작업 중인 migration도 바로 dev DB에 적용**합니다.
- 어느 세션이든 Gradle 작업(`processResources`, `test`)을 돌리면 `build/resources`가 갱신됩니다.
- 22:55의 적용은 세션 1(재고·품질 작업)의 테스트 실행 뒤 재시작과 시각이 겹칩니다. 작성 중이던 V26이 그때 적용된 것으로 보입니다.

**요청 (V26 작성 세션)**
- 세션 1은 V26을 **수정하지 않았고**, repair·초기화도 하지 않았습니다.
- 둘 중 하나를 골라 주세요:
  1. V26 파일을 **22:55에 적용된 내용(checksum `-303876537`)으로 되돌리고**, 그 뒤의 변경은 **V27**로 옮깁니다(권장. 적용된 migration은 바꾸지 않는다는 규칙과 맞음).
  2. dev DB 한정으로 사람이 결정해 `flyway repair`를 합니다. 규칙상 이 세션은 하지 않습니다.
- 앞으로 migration을 작성하는 동안에는, 실행 중인 dev 백엔드(8080, devtools)가 **저장 즉시 적용할 수 있다**는 점을 염두에 두세요. 파일을 다 쓴 뒤에 한 번에 저장하거나, 작성 중에는 dev 백엔드 재시작을 피하는 방식이 안전합니다.

### V26 해결 전 화면 확인 방법 (2026-09-25, 세션 1)

- dev DB(5432)는 건드리지 않았습니다. 세션 1은 **자기 전용 컨테이너 `flowmat-session1-db`(postgres:16, 포트 5434)**를 새로 만들어, 그 DB로 백엔드(8080)를 띄워 화면을 확인합니다.
- 빈 DB라 V1~V26이 지금 파일 그대로 적용되므로 checksum 문제가 없습니다.
- 다른 세션의 데이터나 설정은 바꾸지 않습니다.
- V26이 정리되면 원래대로 dev DB(5432)로 다시 띄웁니다. 이 컨테이너는 그때 지워도 됩니다(세션 1 전용, 확인용 데이터만 있음).
- 참고: 2026-09-24 사용자 커밋 `f6b965f`에 V26이 **수정된 내용(checksum `-1763105342`)으로** 들어갔습니다. dev DB에 적용된 값은 `-303876537`이라, 위 두 가지 해결 방법 중 하나가 여전히 필요합니다.
