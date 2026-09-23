# 작업 분할 · 인계서 (2026-09-23)

외부 점검 결과의 "추가로 해야 할 일" 중 **재고·BOM·LOT 담당(Claude 세션 1) 몫을 뺀 나머지**를 정리했습니다.
에이전트에게 맡길 일 3묶음(A·B·C)과 사람이 해야 할 일(D)로 나눴고, 각 에이전트에 그대로 붙여 넣을 지시문을 함께 둡니다.

---

## 0. 담당 현황

| 영역 | 담당 | 상태 |
|---|---|---|
| 1. 재고 거래 경계 (명령 API · 멱등성 · 음수 금지 · 역분개) | 세션 1 | 완료, 테스트 통과 |
| 2. BOM/LOT 상태 흐름 · snapshot · LOT 계보 + 관련 테스트 | 세션 1 | 진행 중 |
| 3. 협업 방어층 | **에이전트 A** | 대기 |
| 4. DB·엔티티 정합성 검사 | **에이전트 B** | 대기 |
| 실행 검증 · 문서 산출물 | **에이전트 C** | 대기 |
| 결정 · 승인 · 운영 · 실사용 검증 | **사람 (D)** | 대기 |

기준 문서: [`docs/domain/inventory-bom-lot-contract.md`](../domain/inventory-bom-lot-contract.md)

---

## 1. 모든 에이전트 공통 규칙

1. **커밋·푸시·브랜치 생성/전환 금지.** 변경은 작업 트리에만 남깁니다. (현재 브랜치 `fix/ribbon-stability-20260923` 그대로)
2. **파일 소유권을 지킵니다.**

   | 경로 | 소유 |
   |---|---|
   | `domain/inventory/**`, `domain/bom/**`, `domain/production/**`, `docs/domain/**` | 세션 1 — 수정 금지 |
   | `src/main/resources/db/migration/**` | 세션 1만 새 파일 작성. 다른 에이전트는 **만들지 말 것** (V18 이후 번호 충돌 방지) |
   | `global/websocket/**` | **다른 세션이 수정 중** — 에이전트 A는 §2의 선행 조건을 먼저 확인 |

3. **스캐폴딩 스텁은 지우지 않습니다.** `features/user/*`, `src/router/Router.jsx`, `flowmat-canvas-prototype`, 루트 Gradle 파일, `docs/seolly` 중복본, 루트 `package-lock.json`, `.ai/mcp/mcp.json`, 실행되지 않는 라우트 전부.
4. **Gradle 테스트는 한 번에 한 에이전트만.** `build/test-results`를 공유하므로 동시에 돌리면 "Unable to delete directory" 오류가 납니다. 겹치면 잠시 뒤 재실행하세요.
5. **dev 백엔드를 끄거나 켤 때 알립니다.** 테스트 전에 dev 백엔드(명령줄에 `flowmat_backend`가 있는 java 프로세스)를 꺼야 devtools 재시작이 반쯤 컴파일된 클래스를 물지 않습니다.
6. 실패를 발견하면 고치기 전에 **소유자부터 확인**합니다. 남의 영역이면 보고만 합니다.

### 환경

| 항목 | 값 |
|---|---|
| Postgres | 로컬 설치 18, `localhost:5432`, DB/계정/비번 `flowmat`/`flowmat`/`flowmat` |
| Redis | `docker compose -f flowmat_backend/compose.yaml up -d redis` (Docker Desktop 필요) |
| 백엔드 실행 | `flowmat_backend`에서 `.\gradlew.bat bootRun --args='--spring.profiles.active=dev'` |
| API 주소 | `http://localhost:8080/api` (context-path `/api`) |
| 데모 계정 | `demo-owner` / `demo1234`, 프로젝트 `prj_demo_main`, 워크플로 `wf_demo_main` |
| 통합 테스트 | Testcontainers(Postgres 16, Redis 7.4) — Docker 엔진이 켜져 있어야 함 |
| 프론트 검증 | `flowmat_frontend`에서 `npm run build`, `npm run lint`, `npx vitest run` |

### 이미 알려진 실패 (다른 작업 소관 — 새 실패로 보고하지 말 것)

- `StompAuthChannelInterceptorTest` 9건 — STOMP 작업 세션
- `FaceAuthServiceImplTest` 1건, `FaceAuthenticationIntegrationTest` 2건 — FaceAuth 작업
- `AuthServiceImplTest.refreshRotatesRefreshToken` 1건 — 인증 저장소 작업
- 프론트 `CanvasViewport.retention` 1건

---

## 2. 에이전트 A — 협업 방어층 (점검 3번 + 관련 테스트)

### 선행 조건

`global/websocket/StompAuthChannelInterceptor.java`와 그 테스트가 **다른 세션에서 수정 중**입니다(작업 트리 `M`, 테스트 9건 실패).
다음 중 하나가 될 때까지 `global/websocket/**`는 건드리지 마세요.

- 그 세션이 끝났다고 사람이 알려줌, 또는
- 사람이 A에게 그 파일까지 넘기라고 지시함

그 전에는 `domain/workflow/collab/**`와 서비스 계층부터 진행할 수 있습니다.

### 범위

`domain/workflow/collab/` — `GraphSyncService`, `NodeSyncController`, `PresenceController`, `WorkflowSessionRegistry`, `WorkflowPresenceEventListener`, `WorkflowPresenceCleanupService`, `RedisGraphChangeStore`, `dto/*`
그리고 이 서비스들을 호출하는 곳: `workflow/application/*ServiceImpl`, `workflow/annotation/application/CanvasAnnotationService`, `workflow/editor/application/WorkflowEditorDocumentService`

### 할 일

| # | 작업 | 완료 기준 |
|---|---|---|
| A1 | STOMP `@MessageMapping` 핸들러와 그 서비스에서 **workflow 읽기/쓰기 권한을 다시 검증** (인터셉터에만 의존하지 않기). `ProjectAccessService.requireWorkflowReadAccess/WriteAccess` 사용 | 인터셉터를 거치지 않고 핸들러 메서드를 직접 호출하는 테스트에서 비회원 → 거부 |
| A2 | presence payload 검증: 필수 필드, 길이 상한, 좌표 범위, 알 수 없는 필드 처리. 잘못된 입력은 조용히 버리고 로그 | malformed presence 테스트 (null, 빈 문자열, 초과 길이, NaN 좌표) |
| A3 | 삭제 이벤트 payload 계약 고정: `changeType=*_deleted`일 때 `payload`가 null이어도 `entityId`만으로 처리 가능하게. 프론트 타입(`WorkflowGraphChangeDto`)과 일치 확인 | null payload 삭제 이벤트 테스트 (백엔드 발행 + 프론트 적용 로직) |
| A4 | **DB commit 이후에만 broadcast**. 트랜잭션 안에서 바로 `convertAndSend` 하는 곳을 찾아 `TransactionSynchronization.afterCommit` 또는 `@TransactionalEventListener(phase = AFTER_COMMIT)`로 이동 | 롤백된 저장은 이벤트가 나가지 않음을 검증하는 테스트 |
| A5 | 재접속 복구 경로 확인: `GET /workflows/{id}/canvas`(snapshot + `graphSeq`) → `GET /workflows/{id}/graph-changes?sinceSeq=` → `resetRequired=true`면 snapshot 재조회. 빈틈이 있으면 보완 | 재접속 시나리오 테스트 또는 절차 문서 |
| A6 | 에디터 문서 저장(`WorkflowEditorDocumentService`)이 설계대로인지 점검: 행 잠금 → `expectedVersion` 비교 → 409 → 저장 → version 증가 → commit 후 알림 | 점검 결과를 보고서에 표로 |

### 하지 말 것

- "전체 문서 저장 vs 요소별 patch" 모델을 **결정하거나 바꾸지 말 것**. 사람(D1)이 정합니다. 비교표 초안은 에이전트 C가 만듭니다.
- Yjs 도입 코드 금지.

### 산출물

- 코드 + 테스트 (위 경로 안에서만)
- `docs/handoff/reports/A-collab-defense.md`: 바꾼 것, 테스트 결과, A6 점검표, 남은 위험

---

## 3. 에이전트 B — DB·엔티티 정합성 (점검 4번)

**읽기 전용.** 코드·마이그레이션을 고치지 않고 보고서만 씁니다. 고칠 곳은 목록으로 넘기면 소유자가 반영합니다.

### 할 일

| # | 작업 | 방법 |
|---|---|---|
| B1 | 엔티티 필드 ↔ V1~V17 컬럼 **비교표** | `@Entity`/`@MappedSuperclass` 필드를 snake_case로 바꾸고(`@Column(name)` 우선) dev DB `information_schema.columns`와 대조. 기반 클래스 `BaseTimeEntity`, `SoftDeleteEntity`, `CreatedUpdatedAuditEntity` 포함 |
| B2 | 타입 세부 비교: nullable, precision/scale, length, default | 엔티티의 `@Column(nullable, precision, scale, length)`와 DB 정의 차이. Java `String` ↔ `character(1)` 같은 차이 포함 |
| B3 | 빠진 인덱스 · 유니크 제약 | 조회에 쓰이는 Repository 메서드(`findAllByXAndY…`)의 조건 컬럼에 인덱스가 있는지. 업무상 유일해야 하는데 제약이 없는 곳 |
| B4 | 중복 방지 제약 검토 의견 | V17의 `uq_lot_master_project_lot_no`, `uq_inventory_transaction_request`, `uq_inventory_transaction_single_reversal`, `uq_inventory_item_location_lot`, `uq_bom_header_revision`, CHECK 3개(`NOT VALID`)가 설계 의도와 맞는지 |
| B5 | Flyway 적용 DB에서 validate | `FlowMatSmokeTest`(Testcontainers + `ddl-auto=validate`) 실행 결과 + dev DB의 `flyway_schema_history` 최신 버전 |

참고: 이미 확인된 사실 — **NOT NULL·기본값 없음인데 엔티티에 빠진 컬럼은 0건**, **엔티티 없는 테이블 17개**(품질검사·lot_trace 등)는 미리 잡아 둔 구조라 정상.

### 산출물

`docs/handoff/reports/B-db-entity-consistency.md`:
비교표(불일치만 강조), 누락 인덱스/제약 목록(위험도 높음·중간·낮음), 소유자별 수정 제안

---

## 4. 에이전트 C — 실행 검증 · 문서 산출물

코드는 바꾸지 않습니다. 실행하고 기록하고 초안을 씁니다.

### 할 일

| # | 작업 | 산출물 |
|---|---|---|
| C1 | 백엔드 전체 `.\gradlew.bat test` + 프론트 `npm run build` / `npm run lint` / `npx vitest run` 재실행. 실패는 §1 "알려진 실패"와 구분 | `reports/C-verification.md` 1장 |
| C2 | Docker/PostgreSQL 통합 검증: 빈 DB에 Flyway V1~V17 적용 → 앱 기동(`ddl-auto=validate`) → 데모 로그인 → 핵심 API 몇 개 호출 | 같은 문서 2장 (명령·결과·소요 시간) |
| C3 | 프론트 요청 payload ↔ 백엔드 DTO 대조: `flowmat_frontend/src/entities/**/api/*.ts`의 요청 타입과 `*Request.java` 필드·필수 여부 | 같은 문서 3장 (불일치 표) |
| C4 | **권한 매트릭스 초안**: 엔드포인트 × (비회원 / viewer / editor / owner / 시스템 관리자). `ProjectAccessService`, `PermissionService` 호출과 `ProjectAccessIntegrationTest`(66건)에서 추출 | `reports/C-permission-matrix.md` |
| C5 | **협업 모델 비교표 초안**: 현재 모델(DB + expectedVersion + commit 후 STOMP) / 요소 단위 조건부 patch / Yjs CRDT. 기준: 충돌 처리, 재접속, undo, 권한 철회, 운영 복잡도, 구현 비용. 참고 자료 `docs/hj/*`, `docs/jb/*`, `docs/editor/*` | `reports/C-collab-model-comparison.md` |
| C6 | **DB 전환·rollback 실행서 초안**: V16·V17 적용 순서, 적용 전 데이터 점검 SQL(음수 재고·예약 초과 행 수), `NOT VALID` 제약의 `VALIDATE CONSTRAINT` 절차, 되돌리기 SQL | `reports/C-db-migration-runbook.md` (실행은 사람이 함) |

### 하지 말 것

- 운영 DB에 접속하거나 마이그레이션을 실행하지 말 것 (C6은 문서만).
- 실패를 직접 고치지 말 것 — 소유자에게 넘깁니다.

---

## 5. 사람이 할 일 (D)

에이전트에게 맡기지 않는 판단·승인·권한·실사용 작업입니다.

| # | 작업 | 입력 자료 |
|---|---|---|
| D1 | 협업 충돌 모델 결정 (전체 문서 저장 유지 / 요소별 patch / Yjs 시제품 착수 시점) | C5 비교표, A6 점검표 |
| D2 | 계약서 `[구현 결정]` 승인 또는 수정 — 요청 형식(`quantity`는 양수, 방향은 거래 유형이 정함), 잔량 있는 재고 삭제 금지, BOM revision 방식, 자재 중복·대체재·스크랩율 1차 거부, CHECK `NOT VALID`, 거래 유형 이름 변경 | `docs/domain/inventory-bom-lot-contract.md` |
| D3 | 권한 매트릭스 확정 (누가 BOM 승인·재고 격리·역분개를 하는가) | C4 초안 |
| D4 | 운영 DB 전환·rollback 실제 수행, 데이터 정리 후 `VALIDATE CONSTRAINT` | C6 실행서, B 보고서 |
| D5 | 협업·STOMP 독립 보안 검토 (코드 작성자와 다른 사람) | A 보고서 |
| D6 | 브라우저 실사용 · 다중 사용자 동시 편집 · 부하 · 사용성 검증과 기록 | 전체 |

---

## 6. 진행 순서

```
지금 ──┬─ 에이전트 B (읽기 전용, 바로 시작 가능)
       ├─ 에이전트 C (C1~C3 먼저; Gradle test는 다른 에이전트와 시간 겹치지 않게)
       └─ 에이전트 A (collab/서비스 계층부터; websocket 파일은 선행 조건 확인 후)

B·C 보고서 완료 ─▶ 사람 D2·D3 검토 ─▶ 세션 1이 필요한 수정 반영
A·C5 완료 ─────▶ 사람 D1·D5
C6 + B 완료 ───▶ 사람 D4
전부 완료 ─────▶ 사람 D6
```

---

## 7. 붙여 넣을 지시문

### 에이전트 A

```
E:\projects\git\FlowMat 저장소에서 작업한다. 먼저 docs/handoff/2026-09-23-work-split.md의 §1(공통 규칙)과 §2(에이전트 A)를 읽고 그대로 따른다.
목표: 협업 방어층 A1~A6. 커밋·푸시·브랜치 금지. domain/inventory, bom, production, docs/domain, db/migration은 수정 금지.
global/websocket/** 는 다른 세션이 수정 중이므로, 내가 허락할 때까지 건드리지 말고 domain/workflow/collab 와 서비스 계층부터 진행한다.
"전체 문서 저장 vs 요소별 patch" 모델은 결정하지 말 것.
완료 후 docs/handoff/reports/A-collab-defense.md 에 바꾼 것·테스트 결과·A6 점검표·남은 위험을 적는다.
Gradle test 전에는 dev 백엔드를 끄고, 다른 에이전트가 test 중이면 기다린다.
```

### 에이전트 B

```
E:\projects\git\FlowMat 저장소에서 작업한다. 먼저 docs/handoff/2026-09-23-work-split.md의 §1(공통 규칙)과 §3(에이전트 B)을 읽고 그대로 따른다.
목표: DB·엔티티 정합성 B1~B5. 읽기 전용이다 — 소스 코드와 마이그레이션을 수정하지 않는다. 커밋·푸시·브랜치 금지.
dev DB는 localhost:5432 flowmat/flowmat/flowmat (psql: C:\Program Files\PostgreSQL\18\bin\psql.exe).
결과는 docs/handoff/reports/B-db-entity-consistency.md 에 불일치 위주 비교표와 위험도별 수정 제안(소유자 표시)으로 적는다.
```

### 에이전트 C

```
E:\projects\git\FlowMat 저장소에서 작업한다. 먼저 docs/handoff/2026-09-23-work-split.md의 §1(공통 규칙)과 §4(에이전트 C)를 읽고 그대로 따른다.
목표: 실행 검증과 문서 초안 C1~C6. 소스 코드는 수정하지 않는다. 커밋·푸시·브랜치 금지. 운영 DB 접속·마이그레이션 실행 금지.
§1의 "이미 알려진 실패"는 새 실패로 보고하지 않는다. 새 실패는 소유자를 적어서 보고만 한다.
결과는 docs/handoff/reports/ 아래 C-verification.md, C-permission-matrix.md, C-collab-model-comparison.md, C-db-migration-runbook.md 로 남긴다.
Gradle test 전에는 dev 백엔드를 끄고, 다른 에이전트가 test 중이면 기다린다.
```
