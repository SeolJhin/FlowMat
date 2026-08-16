# FlowMat 구현 백로그

작성일: 2026-08-16
작성 근거: 프론트엔드/백엔드 전수 조사(서브에이전트 2개) + 에디터/워크플로 캔버스 도메인 실사(직접, 2026-08-14~16 세션) + 기존 문서 교차 확인

## 문서 목적과 범위

이 문서는 [`flowmat_architecture_improvement_plan.md`](./flowmat_architecture_improvement_plan.md)(테이블을 범용 Flow Engine으로 재정의하는 장기 비전)과는 성격이 다르다. 그 문서가 "무엇이 되어야 하는가"라면, 이 문서는 **"지금 코드베이스에 실제로 비어있거나, 끊겨있거나, 검증이 안 된 것"**을 전수 조사해 실행 가능한 항목으로 정리한 것이다. 둘은 상호보완적이며, 아래 §5에서 서로 연결되는 지점을 짚는다.

세 가지 성격으로 나눠 정리했다: **(A) 남은 필수 작업**(버그·미완성·미검증), **(B) 개선하면 좋을 것**(품질·일관성·구조), **(C) 아이디어/설계 보충이 필요한 것**(제품 결정 필요).

---

## 요약 (가장 눈에 띄는 것부터)

1. **백엔드 도메인 6개가 컨트롤러/서비스까지 다 만들어놓고 내용이 완전히 비어있다** — BOM, Equipment, UnitMaster, LotMaster, WorkOrder(+Admin). 프론트도 이걸 호출하는 코드가 없다.
2. **스키마에는 테이블이 있는데 백엔드 코드가 아예 없는 것이 17개** — 품질검사, 불량기록, lot 추적, 시뮬레이션, CAD import, 프로젝트 파일/내보내기 등.
3. **프론트 페이지 2개는 완전 스텁**("scheduled for a future sprint" 문구만 있음) — Rules, Runs. 대응하는 백엔드 API는 이미 동작하는데(오늘 밤 라이브 검증 완료) 화면이 없다.
4. **`flowmat-canvas-prototype` 폴더는 완전한 죽은 코드** — 별도 `package.json`을 가진 독립 프로토타입 앱이 소스 트리 안에 방치되어 있다. 실제 앱 어디서도 import 안 됨.
5. **엔티티가 테이블 컬럼의 일부만 매핑하는 패턴이 전 코드베이스에 반복됨** — `Item`은 24개 컬럼 중 8개만, `Inventory`도 24개 중 8개만 매핑. 오늘 밤 고친 `deleted_yn`/jsonb 버그들의 근본 원인과 같은 계열의 더 큰 패턴.
6. **`bom`/`catalog`/`inventory`/`payment`/`production` 5개 도메인 전체에 테스트가 0개** — `Item`/`Inventory`처럼 이미 운영 중인 기능도 포함.

---

## 1. 프론트엔드

### 1.1 완전히 비어있는 페이지 (스텁)

| 경로 | 파일 | 상태 |
|---|---|---|
| `/projects/:id/rules` | `src/pages/rules/ui/RulesRoute.tsx:13` | "This page is scheduled for a future sprint." 문구만 있음. 대응 API(`useFlowRulesQuery`, `useCreateFlowRuleMutation`, `useDeleteFlowRuleMutation`)는 이미 구현되어 있고 오늘 밤 라이브로 정상 작동 확인함(`POST /flow-rules` 200 OK) — **백엔드는 준비됐고 화면만 없는 상태**. |
| `/projects/:id/runs` | `src/pages/runs/ui/RunsRoute.tsx:13` | 동일 문구. `useProductionRunsQuery`/`useStartProductionRunMutation` 이미 구현, 오늘 밤 라이브 검증 완료(`POST /production-runs/start` 200 OK) — 역시 백엔드는 준비됐고 화면만 없음. |
| `/projects/:id/runs/:runId` | `src/pages/runs/ui/RunDetailRoute.tsx:15` | 동일. |

**(A) 남은 작업**: 위 두 페이지(3개 라우트)는 백엔드가 이미 동작하므로 프론트 화면만 만들면 즉시 기능이 완성된다 — 이 백로그에서 가장 ROI가 높은 항목.

### 1.2 부분 구현

- **Templates 페이지**(`src/pages/templates/ui/TemplatesRoute.tsx`): 전역 프로세스 템플릿 읽기 전용 목록 + "Apply to Canvas"만 있음. 템플릿 생성/수정/삭제 API 클라이언트 자체가 없다 — 템플릿 관리는 현재 백엔드 시딩으로만 가능.
- **Inventory 아이템 폼**(`src/pages/inventory/ui/InventoryRoute.tsx`): `ItemDto`/`CreateItemInput`에 `itemType`, `unitId` 필드가 있는데 폼에는 입력창이 없음 — UI로는 단위(unit) 지정이 불가능.
- **Invite 수락 플로우**(`src/pages/invite/ui/InviteAcceptRoute.tsx`): 토큰으로 초대 상세정보(프로젝트명/역할/초대자)를 미리 조회하는 API 호출이 없음 — 사용자가 뭘 수락하는지 모른 채 버튼만 누름.
- **Admin 페이지**(`src/pages/admin/ui/AdminRoute.tsx`): 역할 부여/회수, 사용자 검색만 있음. 이름은 "Admin"이지만 시스템 설정/감사로그 등 다른 관리 기능은 없음.

**(B) 개선**: 위 4개 모두 기존 화면의 자연스러운 확장이라 설계 부담이 적다.

### 1.3 죽은 코드 제거 후보

- **`src/features/flowmat-canvas-prototype/`** — 독립적인 `package.json`(React 18.3.1, 실제 앱은 19.2.6), 자체 `vite.config.js`/`index.html`/`main.jsx`를 가진 완전히 별도의 프로토타입 앱. 실제 앱 소스 어디서도 import되지 않음(자기 자신의 `package.json`/`package-lock.json` 문자열 매치만 나옴). `CanvasEdge.jsx`/`CanvasNode.jsx`/`WorkflowCanvasPage.jsx` 등 실제 구현체와 이름이 겹치는 `.jsx` 사본들이 들어있어 혼동 위험도 있음.
- **`src/router/Router.jsx`** — 3줄짜리 미사용 스텁 컴포넌트(`<div>Router</div>`만 반환). 실제 라우터는 `src/app/router/index.tsx`. 어디서도 import 안 됨.

**(B) 개선**: 둘 다 삭제해도 안전(참조 없음 확인됨). 신규 합류자가 실제 구현체로 착각할 위험을 없앤다.

---

## 2. 백엔드

### 2.1 완전히 비어있는 도메인 (엔티티·리포지토리는 있는데 서비스·컨트롤러가 빈 껍데기)

| 도메인 | 비어있는 파일 |
|---|---|
| BOM | `bom/api/BomController.java`, `bom/application/BomService(Impl).java`, `bom/application/BomApprovalService(Impl).java` |
| Equipment | `catalog/api/EquipmentController.java`, `catalog/application/EquipmentService(Impl).java` |
| UnitMaster | `catalog/api/UnitController.java`, `catalog/application/UnitService(Impl).java` |
| LotMaster | `inventory/api/LotController.java`, `inventory/application/LotService(Impl).java` |
| WorkOrder | `production/api/WorkOrderController.java`, `production/api/admin/AdminWorkOrderController.java`, `production/application/WorkOrderService(Impl).java` |

모두 `@RestController`/`@Service` + 생성자 주입만 있고 메서드가 0개인 4~15줄짜리 파일. 대응하는 Request DTO(`BomCreateRequest`, `EquipmentCreateRequest`, `LotCreateRequest`, `WorkOrderCreateRequest` 등)는 이미 만들어져 있지만 어디서도 쓰이지 않는다.

**(A) 남은 작업**: 이 5개 도메인은 스키마·DTO·엔티티까지는 준비됐고 비즈니스 로직만 없는 상태 — 새 기능 추가가 아니라 "이미 설계된 것을 채우는" 작업에 가깝다.

### 2.2 읽기 전용만 구현된 도메인

- **Payment**(`payment/api/PaymentController.java`, `PlanController.java`): GET 3개씩만 있고 생성/수정 API가 없음. `PaymentCreateRequest`/`PlanCreateRequest`/`SubscriptionCreateRequest` DTO는 존재하지만 미사용.
- **Coupon/Promotion**: 엔티티+리포지토리만 있고 서비스/컨트롤러 자체가 없음. `CouponCreateRequest` DTO도 미사용.

**(C) 아이디어 보충 필요**: 결제/구독 도메인을 실제로 언제 붙일지, 붙인다면 외부 PG 연동 방식이 정해져야 함 — 지금은 스키마만 있고 제품 방향이 없다.

### 2.3 스키마엔 있지만 백엔드 코드가 전혀 없는 테이블 (17개)

`cad_import_job`, `defect_log`, `lot_trace`, `notification`, `payment_discount`, `project_activity_log`, `project_comment`, `project_export`, `project_file`, `project_permission`, `quality_inspection`, `resource_types`, `resource_usage`, `resources`, `simulation_run`, `simulation_step`, `stock_alert`

엔티티도, 리포지토리도, 서비스도, 컨트롤러도 없다 — 프론트에서도 전혀 참조 안 됨. `flowmat_architecture_improvement_plan.md`가 이 테이블들 상당수를 "미래 방향"으로 이미 언급하고 있어(§6.3, §6.4), 의도적으로 먼저 스키마만 파둔 것으로 보인다.

**(C) 아이디어 보충 필요**: 이 17개 중 어떤 걸 언제 구현할지 우선순위가 없다. 특히 `quality_inspection`/`defect_log`(품질), `project_file`/`project_export`(파일 관리), `notification`은 실사용 시나리오에서 곧 필요해질 가능성이 높아 보인다 — 아키텍처 플랜의 §6.3/§6.4 분류와 맞춰 로드맵화가 필요.

### 2.4 구조적 패턴: 엔티티가 테이블 컬럼의 일부만 매핑

오늘 밤 고친 `deleted_yn`/jsonb 매핑 버그들과 같은 계열이지만 훨씬 넓은 범위의 패턴이다. 이미 운영 중인 기능도 예외가 아니다:

- `Item.java`: 8개 필드만 매핑 / 테이블은 ~24개 컬럼 (누락: `item_category`, `unit`, `purchase_unit`, `conversion_rate`, `unit_cost`, `spec`, `barcode`, `sku`, `stock_managed_yn` 등)
- `Inventory.java`: 8개 필드만 매핑 / 테이블은 ~24개 컬럼 (누락: `min_threshold`, `max_threshold`, `warehouse_code`, `lot_no`, `expiry_date`, `locked_yn` 등)
- `ProductionRun.java`: 13개 필드만 매핑 / 테이블은 38개 컬럼
- 비어있는 도메인들은 더 심함: `WorkOrder`(11/26), `BomHeader`(누락 다수), `Equipment`(누락 다수), `UnitMaster`, `LotMaster` 등

**(B) 개선**: 이건 "버그"라기보다 "아직 안 끝난 매핑"에 가깝다 — 해당 도메인 서비스를 실제로 채울 때(§2.1) 자연스럽게 같이 채워질 항목들이지만, 지금 상태로는 DB에 저장된 값 중 상당수가 애플리케이션 레이어에서 아예 접근 불가능하다는 점은 인지하고 있어야 한다.

### 2.5 테스트 커버리지 격차

**테스트가 0개인 도메인**: `bom`, `catalog`(Item 포함 — 유일하게 완성도 높은 컨트롤러인데도 테스트 없음), `inventory`(Inventory/InventoryTransaction 포함 — 룰엔진 연동된 운영 기능인데도 테스트 없음), `payment`, `production`(오늘 밤 검증한 `ProductionRun`/`RunStateSnapshot` 포함).

**테스트가 있는 도메인 안에서도 빠진 것**: `ProjectServiceImpl` 및 project API 컨트롤러 전체, `FlowRuleServiceImpl`/`FlowRuleController`, `ProcessServiceImpl`/`WorkflowServiceImpl`/`ProcessConnectionServiceImpl` 등 workflow 핵심 서비스 다수.

유일한 통합 테스트는 `FlowMatSmokeTest.java`인데 `assertTrue(true)`뿐인 no-op — 실제 `@SpringBootTest` 컨텍스트 로딩 검증조차 없다.

**(A) 남은 작업**: 최소한 이미 운영 중인 기능(`Item`, `Inventory`, `ProductionRun`, project 핵심 서비스)부터 테스트를 채우는 게 우선순위가 높다. 스모크 테스트도 최소 컨텍스트 로딩 검증 정도는 되어야 한다.

### 2.6 마이그레이션 이력 특이사항

- `V4__add_graph_change_log.sql`이 생성한 걸 바로 다음 `V5__drop_graph_change_log.sql`이 되돌린다 — Redis 기반 `RedisGraphChangeStore`로 대체되며 DB 테이블 방식은 폐기된 것으로 보임. 실수는 아니고 이력이지만, 신규 합류자가 헷갈릴 수 있어 마이그레이션 파일에 짧은 설명 주석이 있으면 좋을 것.

### 2.7 스키마 명명 불일치

- `users` 테이블만 `delete_yn`(다른 모든 테이블은 `deleted_yn`)을 쓴다. `User.java`가 `@Column(name = "delete_yn")`로 명시 매핑해서 실제 버그는 아니지만, 공용 `SoftDeleteEntity` 베이스 클래스를 못 쓰는 이유이기도 하다.

---

## 3. 에디터/워크플로 캔버스 도메인 (2026-08-14~16 세션에서 집중 작업한 영역)

이 영역은 이미 [`docs/editor/current-state.md`](./docs/editor/current-state.md)와 [`docs/editor/relay/BATON.md`](./docs/editor/relay/BATON.md)에 상세히 기록되어 있다. 여기서는 요약만 한다 — 최신 상태는 항상 relay `BATON.md`를 따라간다.

### (A) 남은 필수 작업

1. 두 브라우저 세션 간 STOMP 실시간 동기화 라이브 테스트 — 코드 경로(그래프 변경 시 무조건 `invalidateEditorDocument()` 호출)만 확인했고 실제 2세션 테스트는 계속 이월 중.
2. 이번 검증 과정에서 만든 테스트 데이터(production run/snapshot/annotation 각 1건, `jsonb-audit-test-*` 표시) 정리.
3. `useWorkspaceStore()`를 셀렉터 없이 호출하는 곳이 이미 고친 3개 파일 외에 더 있는지 — 전수 검색은 리터럴 `useWorkspaceStore()` 기준으로만 했음.

### (B) 개선하면 좋을 것

4. 프로덕션 undo/redo가 `HistoryManager`를 안 쓰고 자체 딥클론 방식 — 비효율 + 주석-혼합 액션 undo 누락 버그(의도적으로 범위 밖으로 보류됨).
5. 스마트 정렬 가이드(smart snap guide)를 새 도형 엔진에 연결 — 낮은 우선순위로 보류.
6. 회전/각도 스냅 프로덕션 반영 — 낮은 우선순위로 보류.
7. 구버전 상단바/사이드바 완전 제거(리본 통합이 검증된 뒤 마무리) — nekopunch 마이그레이션 문서 Step 6의 마무리 작업.
8. `CreatedUpdatedAuditEntity` 상속 엔티티의 `deleted_yn` 커버리지 체크리스트화 — 이번에 15개 전수 확인해서 문제없었지만, 새 엔티티 추가 시 같은 실수 재발 방지용.

### (C) 아이디어/설계 보충 필요

9. 커넥터를 legacy annotation 도형에도 연결 가능하게 할지 제품 결정 필요 — 지금은 backend editor element끼리만 연결되는 의도적 제약.
10. rhwp의 꺾은선(elbow)/곡선 라우팅 — 지금은 직선 커넥터만. `routing: 'straight' | 'elbow'` 필드 추가로 확장 가능하게 설계는 되어 있음.
11. Align/Distribute 라우팅이 legacy annotation과 backend editor element가 섞여 선택된 경우의 우선순위 — 현재는 새 엔진 쪽 개수만 본다.
12. 리본에서 "Group"/"Ungroup" 이름이 editor element용과 legacy annotation용 두 그룹에 동시에 보이는 UX가 헷갈릴 수 있음 — 라벨 구분 필요할 수도.

---

## 4. 프로세스 / 개발 환경

### (B) 개선

- **STS(Eclipse)와 Gradle의 이중 컴파일 캐시**: `bin/main`(STS 자체 캐시)과 `build/`(Gradle 출력)가 별도로 관리되어, 이번 세션에서만 두 차례 `bin/main`이 stale 상태가 되어 엔티티 파일 하나가 통째로 누락된 채 실행되는 문제가 있었다. STS를 계속 쓸 거라면 이 구조 자체를 문서화하거나(예: "코드 변경 후엔 항상 Project → Clean"), 가능하면 두 출력 경로를 일치시키는 게 재발을 막는다.
- **Playwright 확장 브리지 모드의 입력 안정성**: 자동화 테스트 중 "기존 요소를 클릭해 선택"하는 동작이 간헐적으로 반응하지 않는 현상이 반복됐다(사람이 직접 하면 정상). 자동화 테스트를 앞으로 자주 할 계획이면 standalone Playwright 모드(별도 브라우저 창을 직접 띄우는 방식)가 더 안정적일 수 있음 — 대신 "이미 로그인된 실제 브라우저를 그대로 조작"하는 편의는 포기해야 한다.

---

## 5. 장기 아키텍처 방향과의 접점

[`flowmat_architecture_improvement_plan.md`](./flowmat_architecture_improvement_plan.md)는 스키마 전체를 Core/Domain/Extension 구조로 재편하는 장기 비전을 담고 있다. 이 백로그의 §2 항목들과 직접 연결되는 지점:

- §2.1의 빈 도메인(BOM/Equipment/UnitMaster/LotMaster/WorkOrder)을 채울 때, 그 문서 §6.3의 "Manufacturing Extension Tables" 분류를 먼저 참고하면 나중에 다시 뜯어고칠 필요가 줄어든다.
- §2.3의 미구현 17개 테이블 중 다수가 그 문서에서 이미 "Execution Layer"/"Integration Layer"로 위치가 잡혀 있다(§6.2, §6.4) — 순서를 정할 때 그 분류를 그대로 로드맵 우선순위로 쓸 수 있다.
- 그 문서 §16의 "권장 개선 순서"(1단계: 의미 재정의 → 2단계: 컬럼 범용화 → 3단계: 빠진 Core 테이블 추가 → 4단계: 제조 특화 테이블 분리)는 이 백로그의 (A)/(B)/(C) 분류와 시간축이 다를 뿐 상충하지 않는다 — 그 문서가 "어떤 순서로 재편할지", 이 문서는 "지금 뭐가 비어있는지"를 다룬다.
