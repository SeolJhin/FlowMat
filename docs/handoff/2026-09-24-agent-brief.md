# 위임 작업 지시서 — 에이전트 1명용 (2026-09-24)

`2026-09-23-work-split.md`의 A·B·C와 이후 추가된 E·F·G·H를 **에이전트 한 명이 순서대로** 처리하도록 합친 문서입니다. 이 문서가 기존 인계서의 작업 목록을 대체합니다(환경·규칙 설명은 여기 최신본 기준).

재고·BOM·LOT·생산(세션 1 담당)은 이 문서에 없습니다. 사람이 결정·실행할 일은 §6에 따로 있습니다.

---

## 1. 반드시 지킬 규칙

1. **커밋·푸시·브랜치 생성/전환 금지.** 변경은 작업 트리에만 둡니다. 커밋은 사람이 직접 합니다. (현재 브랜치 `main`)
2. **수정 금지 경로** (세션 1 소유):
   - `flowmat_backend/src/main/java/org/myweb/flowmat/domain/{inventory,bom,production,catalog}/**`
   - `flowmat_frontend/src/pages/{inventory,runs}/**`, `flowmat_frontend/src/entities/{bom,inventory,production,catalog}/**`
   - `docs/domain/**`
   - `flowmat_backend/src/main/resources/db/migration/**` — **새 파일도, 기존 파일 수정도 금지.** 고칠 것이 있으면 보고서에 적습니다. (프로젝트 규칙: 적용된 마이그레이션은 오타·주석까지 포함해 수정하지 않고, 변경은 항상 새 버전으로 한다.)
3. **스캐폴딩 스텁 삭제 금지**: `features/user/*`, `src/router/Router.jsx`, `flowmat-canvas-prototype`, 루트 Gradle 파일, `docs/seolly` 중복본, 루트 `package-lock.json`, `.ai/mcp/mcp.json`, 실행되지 않는 라우트 전부.
4. **수정 전에 `git status`로 그 파일이 다른 사람 작업 중(커밋 안 된 `M`)인지 확인.** 작업 중이면 손대지 말고 보고서에 적습니다. 현재 확인된 것: `.github/workflows/browser-e2e.yml`(작업 중).
5. **Gradle 테스트는 한 번에 하나.** 다른 세션과 `build/test-results`를 공유합니다. "Unable to delete directory"가 나면 잠시 뒤 재실행.
6. 테스트 전에 dev 백엔드(명령줄에 `flowmat_backend`가 있는 java 프로세스)를 끕니다.
7. 실패를 발견하면 **먼저 소유자를 확인**합니다. 남의 영역이면 고치지 말고 보고합니다.
8. 결과물은 전부 `docs/handoff/reports/` 아래에 남깁니다.

## 2. 환경 (2026-09-24 기준)

| 항목 | 값 |
|---|---|
| Docker | Docker Desktop 실행 필요 (Testcontainers, Redis) |
| 로컬 Postgres | 18, `localhost:5432`, `flowmat`/`flowmat`/`flowmat`. V18까지 적용됨(체크섬 문제는 해결, §3 G) |
| 임시 DB (기동 확인용) | `docker run -d --name flowmat-uicheck-db -e POSTGRES_DB=flowmat -e POSTGRES_USER=flowmat -e POSTGRES_PASSWORD=flowmat -p 5433:5432 postgres:16` |
| Redis | `compose.yaml`은 `.env`가 필요. 없으면 `docker run -d --name flowmat-uicheck-redis -p 6379:6379 redis:7.4` |
| 백엔드 기동 | `flowmat_backend`에서 `DB_URL`(임시 DB면 `jdbc:postgresql://localhost:5433/flowmat`), `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`(32바이트 이상) 환경변수 설정 후 `.\gradlew.bat bootRun --args='--spring.profiles.active=dev'` |
| API | `http://localhost:8080/api` |
| 프론트 | `flowmat_frontend`: `npm run dev`(5173), `npm run typecheck`, `npm run lint`, `npm run build`, `npx vitest run` |
| 실 API E2E | 백엔드·프론트를 띄운 뒤 `REAL_API_E2E=1 BASE_URL=http://localhost:5173 npx playwright test --trace=off --output=<임시폴더>` (결과 폴더를 다른 세션과 겹치지 않게) |
| 데모 계정 | `demo-owner` / `demo1234`, 프로젝트 `prj_demo_main`, 워크플로 `wf_demo_main` |

**참고로 이미 확인된 사실** (다시 조사하지 않아도 됨):
- NOT NULL·기본값 없음인데 엔티티에 빠진 컬럼 0건. 엔티티 없는 테이블 17개는 미리 잡아 둔 구조(정상).
- `StompAuthChannelInterceptorTest` 16건 통과, 백엔드 소스의 websocket 파일은 커밋 후 수정 없음.
- 프론트 단위 테스트 172건 통과(2026-09-24 12시 기준).

---

## 3. 작업 목록 (위에서부터 순서대로)

### 1순위 — 막혀 있는 것부터

#### ~~G. Flyway 체크섬 문제 해결안 작성~~ — **완료(2026-09-24, 세션 1).** 건너뜁니다.
결정: C안. V2·V4·V5를 `4e251a0` 이전 내용으로 원복했고(`repair` 사용 안 함), 운영 데모 데이터 제거는 `V18__remove_demo_data_from_non_demo_environment.sql`로 처리합니다. 기존 dev DB가 repair 없이 검증 통과(V17·V18 적용), `ProdMigrationIsolationTest`·`DemoSeedCleanupMigrationTest` 통과.
**규칙: 적용된 Flyway 마이그레이션은 오타·주석을 포함해 절대 수정하지 않습니다. 변경은 항상 새 버전으로.**

<details><summary>원래 지시(참고용)</summary>

커밋 `4e251a0`이 이미 적용된 마이그레이션을 수정했습니다: V2(데모 시드를 `flowmat.demo_seed_enabled` 조건으로 감쌈), V4·V5(주석 한 줄 추가). 기존 DB는 모두 `Migration checksum mismatch`로 기동 실패합니다.

- 두 해결 방식을 비교합니다.
  1. 파일 유지 + 각 DB에서 `flyway repair`
  2. V4·V5 원복 + V2 처리 방법(원복 후 새 마이그레이션으로 이동 등)
- 각 방식의 명령, 적용 순서, 위험(운영 DB에 데모 행 유입 가능성 포함), 되돌리기, 검증 방법(`ProdMigrationIsolationTest`, `FlowMatSmokeTest`)을 적습니다.
- **어떤 DB에도 repair를 실행하지 말고, 마이그레이션 파일도 수정하지 마세요.**
- 산출물: `reports/G-flyway-checksum-options.md`
</details>

#### C1–C3. 실행 검증 기준선
- C1: 백엔드 `.\gradlew.bat test` 전체 + 프론트 typecheck·lint·build·vitest. 실패는 소유자와 함께 기록.
- C2: 임시 DB에 V1~V17 적용 → `ddl-auto=validate`로 기동 → 데모 로그인 → 핵심 API 몇 개 호출. 명령·결과·소요 시간 기록.
- C3: 프론트 요청 타입(`src/entities/**/api/*.ts`)과 백엔드 `*Request.java`의 필드·필수 여부 대조. 불일치 표.
- 산출물: `reports/C-verification.md`

### 2순위 — 코드 작업

#### A. 협업 방어층 (코드 + 테스트)
범위: `domain/workflow/collab/**`, `global/websocket/**`, 그리고 이를 호출하는 `domain/workflow/application/*ServiceImpl`, `workflow/annotation/application/CanvasAnnotationService`, `workflow/editor/application/WorkflowEditorDocumentService`. 수정 전 규칙 4 확인.

| # | 작업 | 완료 기준 |
|---|---|---|
| A1 | STOMP `@MessageMapping` 핸들러와 서비스에서 workflow 읽기/쓰기 권한 재검증(`ProjectAccessService.requireWorkflowReadAccess/WriteAccess`) | 인터셉터를 거치지 않고 핸들러를 직접 호출하는 테스트에서 비회원 거부 |
| A2 | presence payload 검증(필수 필드, 길이 상한, 좌표 범위·NaN). 잘못된 입력은 버리고 로그 | malformed presence 테스트 |
| A3 | 삭제 이벤트(`*_deleted`)는 `payload`가 null이어도 `entityId`만으로 처리. 프론트 `WorkflowGraphChangeDto` 적용 로직과 일치 | null payload 테스트(백엔드 발행 + 프론트 적용) |
| A4 | DB commit 이후에만 broadcast(`TransactionSynchronization.afterCommit` 또는 `@TransactionalEventListener(AFTER_COMMIT)`) | 롤백 시 이벤트가 나가지 않음을 검증 |
| A5 | 재접속 복구: canvas snapshot + `graphSeq` → `graph-changes?sinceSeq=` → `resetRequired`면 snapshot 재조회. 빈틈 보완 | 시나리오 테스트 또는 절차 문서 |
| A6 | `WorkflowEditorDocumentService` 저장 흐름 점검(행 잠금 → expectedVersion → 409 → 저장 → version 증가 → commit 후 알림) | 점검표 |

금지: "전체 문서 저장 vs 요소별 patch" 모델 결정·변경, Yjs 도입.
산출물: 코드·테스트 + `reports/A-collab-defense.md`(바꾼 것, 테스트 결과, A6 점검표, 남은 위험)

#### E. 로컬 개발 환경 정리
오늘 백엔드 한 번 띄우려고 환경변수 3개(`DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`)와 compose `.env`를 설정 파일을 뒤져서 찾아야 했습니다.

- `flowmat_backend/.env.example`(필요한 변수·설명·안전한 예시값, 실제 비밀값 금지)
- 로컬 실행 절차 문서(README 또는 `docs/`): Docker, Postgres, Redis, 백엔드, 프론트, 데모 로그인, 자주 나는 오류(체크섬 불일치, JWT_SECRET 누락, compose `.env` 누락)
- 선택: 환경변수를 채워 백엔드를 띄우는 스크립트(PowerShell). 비밀값은 스크립트에 넣지 말 것.
- `application*.yml`, `compose.yaml`의 값·구조는 바꾸지 않습니다.
- 산출물: 위 파일들 + `reports/E-local-setup.md`(무엇을 만들었는지)

### 3순위 — 점검·문서

#### B. DB·엔티티 정합성 (읽기 전용)
- B1: 엔티티 필드 ↔ V1~V17 컬럼 비교표(`@Column(name)` 우선, 기반 클래스 `BaseTimeEntity`·`SoftDeleteEntity`·`CreatedUpdatedAuditEntity` 포함). 임시 DB(V17까지 적용) 기준.
- B2: nullable, precision/scale, length, default 차이(`String` ↔ `character(1)` 포함).
- B3: Repository 조회 조건 컬럼의 인덱스 유무, 업무상 유일해야 하는데 제약 없는 곳.
- B4: V17의 제약(`uq_lot_master_project_lot_no`, `uq_inventory_transaction_request`, `uq_inventory_transaction_single_reversal`, `uq_inventory_item_location_lot`, `uq_bom_header_revision`, CHECK 3개 `NOT VALID`) 검토 의견.
- 산출물: `reports/B-db-entity-consistency.md`(불일치 위주, 위험도 높음·중간·낮음, 소유자별 수정 제안)

#### F. CI 브라우저 E2E 확인
`.github/workflows/browser-e2e.yml`에 이미 Postgres·Redis 서비스와 `REAL_API_E2E: '1'`이 있습니다. 새 `e2e/bom-lot-flow.spec.ts`도 이 잡에서 돌게 됩니다.

- 이 파일은 **현재 다른 사람이 수정 중**입니다(커밋 안 된 변경 11줄). 커밋되기 전에는 편집하지 말고, 로컬에서 같은 조건으로 `backend-contract`, `bom-lot-flow`가 통과하는지만 확인합니다.
- 잡에 빠진 것(예: 실패 시 trace·스크린샷 아티팩트 업로드, 결과 폴더 분리)이 있으면 제안만 적습니다.
- 산출물: `reports/F-ci-e2e.md`

#### C4–C6. 문서 초안
- C4 권한 매트릭스: 엔드포인트 × (비회원 / viewer / editor / owner / 시스템 관리자). `ProjectAccessService`, `PermissionService` 호출과 `ProjectAccessIntegrationTest`(73건)에서 추출. → `reports/C-permission-matrix.md`
- C5 협업 모델 비교표: 현재 모델(DB + expectedVersion + commit 후 STOMP) / 요소 단위 조건부 patch / Yjs CRDT. 기준: 충돌 처리, 재접속, undo, 권한 철회, 운영 복잡도, 구현 비용. 참고 `docs/hj/*`, `docs/jb/*`, `docs/editor/*`, A6 결과. → `reports/C-collab-model-comparison.md`
- C6 DB 전환·rollback 실행서: V16·V17 적용 순서, 적용 전 점검 SQL(음수 재고, 예약 초과, 중복 LOT 번호, 중복 revision), `NOT VALID` 제약의 `VALIDATE CONSTRAINT` 절차, 되돌리기 SQL. G의 결론과 연결. **실행 금지.** → `reports/C-db-migration-runbook.md`

#### I. 레퍼런스 구조 조사 (읽기 전용, 레포당 반나절 이내)

목적은 기능 복사가 아니라 **FlowMat ERD·백엔드 구조 결정에 쓸 비교 근거**입니다. 레포 소개문은 필요 없습니다.

**규칙**
- 레포는 FlowMat 저장소 **밖**(예: `E:\projects\refs\`)에 클론하거나 GitHub에서 읽습니다. FlowMat 안에 넣지 않습니다.
- **코드를 복사하지 않습니다.** AGPL(OCA/manufacture, OpenMes)은 구조·흐름만 요약하고 코드 인용 금지. Apache-2.0(Flowable, Conductor, OpenWMS)도 인용은 짧은 식별자 수준까지만.
- 각 주장에는 근거 파일 경로(레포 기준)를 답니다.

**확인된 레포 정보 (2026-09-24, GitHub API)**

| 레포 | 라이선스 | 마지막 커밋 | 비고 |
|---|---|---|---|
| flowable/flowable-engine | Apache-2.0 | 2026-09-17 | |
| conductor-oss/conductor | Apache-2.0 | 2026-09-24 | |
| openwms/org.openwms | Apache-2.0 | 2026-07-13 | |
| OCA/manufacture | AGPL-3.0 | 2026-09-21 | 구조만 참고 |
| Mes-Open/OpenMes | AGPL-3.0 | 2026-09-22 | 구조만 참고 |
| sindohmes/mes4u | LGPL-2.1 | 2020-12-24 | 오래 멈춤 — 필요할 때 ERD만 참고 |

**질문 (이 순서로)**

| # | 질문 | 볼 곳 | FlowMat 비교 대상 | 산출 |
|---|---|---|---|---|
| I1 | **실행이 그래프를 따라가게 하려면?** 정의 ↔ 인스턴스 ↔ 노드(태스크) 인스턴스 분리, 상태 전이, 병렬(fork/join)·조건 분기, 재시도, 실행 이력 | Flowable(런타임·이력 테이블 구조, Execution/Task 모델), Conductor(WorkflowDef/TaskDef ↔ Workflow/Task 인스턴스, 상태값) | `workflow`/`process`/`process_connection`(정의) ↔ `production_run`(인스턴스). 노드 인스턴스는 **없음**, 이력은 `run_state_snapshot`뿐 | FlowMat용 **실행 단계 테이블 초안**(컬럼, 상태 전이표, `production_run_item`과의 연결)과 대안 비교. 제안서일 뿐 마이그레이션은 쓰지 않음 |
| I2 | 공정 순서(routing)·작업지시·BOM·LOT 계보를 어떤 단위로 잇는가 | OCA/manufacture(+ 기반인 Odoo MRP 모델) | `docs/domain/inventory-bom-lot-contract.md`의 `[구현 결정]`: 1단계 BOM, 실행 단위 계보, 소요량 반올림, revision 방식, 승인 시 기존 revision 자동 폐기 | 결정별 "레퍼런스는 이렇게 함 / 우리와 차이 / 유지·변경 제안" |
| I3 | 재고 이동·예약·위치·격리 모델 | OpenWMS | 재고 명령 API(§2~3), 예약·격리·역분개 | 차이점과 누락 개념(위치 계층, 이동 지시 등) 목록 |
| I4 | 실제 MES의 엔티티 구성과 작업지시·실적·품질·비가동 흐름 | OpenMes | 전체 ERD | FlowMat에 없는 개념 목록과 우선순위(지금 / 나중 / 불필요) |

**하지 말 것:** 워크플로 엔진(Flowable·Temporal 등) 도입이나 BPMN·bpmn-js 전환을 결론으로 밀지 않습니다. 필요하다고 판단되면 "사람 결정 필요" 항목으로만 적습니다.

산출물: `reports/I-reference-architecture.md` (맨 앞에 질문별 한 줄 결론, 이어서 질문별 비교표, 마지막에 FlowMat 변경 제안을 우선순위별로)

### 4순위

#### H. 화면 접근성 점검 (보고서만)
세션 1 영역(§1 규칙 2) 밖의 화면: 워크스페이스·캔버스, 인증, 프로젝트·멤버, 규칙(Rules) 화면. 레이블 없는 입력·select·아이콘 버튼, 키보드 접근 불가 요소, 대비 문제를 파일·줄 단위로 목록화합니다. 고치지 않습니다.
- 산출물: `reports/H-a11y-audit.md`

---

## 4. 보고서 공통 형식

각 보고서 맨 위에:
1. 한 줄 결론
2. 한 것 / 못 한 것(이유)
3. 사람 결정이 필요한 것
4. 다른 담당에게 넘길 것(소유자 표시)

## 5. 끝났을 때

모든 보고서를 쓴 뒤 `reports/00-summary.md`에 작업별 상태(완료/부분/막힘)와 사람이 결정할 목록을 한 표로 정리합니다.

## 6. 에이전트가 하지 않는 일 (사람 몫)

| # | 일 | 입력 자료 |
|---|---|---|
| D1 | 협업 충돌 모델 결정 (전체 문서 저장 유지 / 요소별 patch / Yjs 시제품) | C5, A6 |
| D2 | ~~`docs/domain/inventory-bom-lot-contract.md`의 `[구현 결정]` 승인·수정~~ **대부분 결정(2026-09-24)** — 계약서 머리의 "구현 결정 검토 현황" 표 참고. 남은 것: revision 자동 retire·draft 제한, 새 LOT `available` 시작(검토 대기), `NOT VALID`의 `VALIDATE` 계획(D4와 연결) | 계약서 |
| D3 | 권한 매트릭스 확정 | C4 |
| D4 | Flyway 체크섬 해결 방식 선택과 각 DB 적용, 운영 DB 전환·`VALIDATE CONSTRAINT` | G, C6, B |
| D5 | 협업·STOMP 독립 보안 검토 | A |
| D6 | 브라우저 실사용·다중 사용자·부하·사용성 검증 | 전체 |
| D7 | 실행 단계(노드 인스턴스) 모델 채택 여부와 범위, 외부 워크플로 엔진 도입 여부 결정 | I1 |

세션 간 전달 문서:
- 인증 담당: [같은 브라우저 안의 refresh 경합](reports/auth-refresh-race.md). 실 API E2E의 `workers: 1`은 이 문제가 해결될 때까지 유지합니다.
- workflow revision 작업 세션: [V21은 이미 dev DB에 적용됨. 그대로 커밋](reports/flyway-v21-notice.md)

---

## 7. 붙여 넣을 지시문

```
E:\projects\git\FlowMat 저장소에서 작업한다. 먼저 docs/handoff/2026-09-24-agent-brief.md 전체를 읽고 그대로 따른다.
§3의 작업을 1순위(G, C1~C3) → 2순위(A, E) → 3순위(B, F, C4~C6, I) → 4순위(H) 순서로 진행한다.
I(레퍼런스 조사)는 FlowMat 저장소 밖에 클론하고, 코드를 복사하지 않으며, 레포당 반나절 이내로 끝낸다.
커밋·푸시·브랜치 생성/전환 금지. §1 규칙 2의 경로(재고·BOM·LOT·생산·카탈로그, 마이그레이션, docs/domain)는 수정 금지.
파일을 고치기 전에 git status로 다른 사람이 작업 중인지 확인하고, 작업 중이면 손대지 않고 보고서에 적는다.
어떤 DB에도 flyway repair나 마이그레이션을 실행하지 않는다.
결과는 docs/handoff/reports/ 아래에 작업별 보고서로 남기고, 마지막에 00-summary.md로 정리한다.
Gradle test 전에는 dev 백엔드를 끄고, 다른 세션이 test 중이면 기다린다.
```
