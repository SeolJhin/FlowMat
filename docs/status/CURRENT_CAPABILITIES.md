# FlowMat 현재 기능 기준선

확인일: 2026-09-24. 코드 기준 커밋 `e2c0aff`와 확인 당시 작업 트리를 함께 읽었다. 작업 트리에 다른 세션의 미커밋 변경이 있어 이 문서는 특정 배포 버전의 보증서가 아니다. 기능 상태를 바꿀 때는 근거 코드와 검증 결과를 함께 갱신한다.

상태: **IMPLEMENTED**는 코드와 대응 경로가 있음, **PARTIAL**은 일부 흐름만 있음, **PLANNED**는 제안만 있음. 이 표의 상태는 설계 범위 기준이며 운영 환경 검증을 뜻하지 않는다.

| 기능 | 상태 | 현재 근거 | 남은 범위 |
|---|---|---|---|
| 재고 명령·멱등성·역분개 | IMPLEMENTED | [`InventoryTransactionServiceImpl`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/application/InventoryTransactionServiceImpl.java), [`InventoryTransactionController`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/api/InventoryTransactionController.java), [`InventoryTransaction`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/InventoryTransaction.java) | 현장 실사용·부하 검증 |
| BOM 승인·revision·실행 시 고정 | IMPLEMENTED | [`BomServiceImpl`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/bom/application/BomServiceImpl.java), [`ProductionRunServiceImpl`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/application/ProductionRunServiceImpl.java), [`ProductionRun`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRun.java) | 다단계 BOM은 후속 범위 |
| LOT 상태·격리·계보 | IMPLEMENTED | [`LotServiceImpl`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/application/LotServiceImpl.java), [`LotTrace`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/inventory/domain/entity/LotTrace.java) | 실제 현장 추적 검증 |
| 워크플로 정의와 캔버스 | IMPLEMENTED | [`Workflow`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/domain/entity/Workflow.java), [`WorkflowCanvasServiceImpl`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/application/WorkflowCanvasServiceImpl.java), [`WorkflowCanvasPage`](../../flowmat_frontend/src/pages/workspace/ui/WorkflowCanvasPage.tsx) | 발행된 불변 revision 없음 |
| 공정 IO·연결 | PARTIAL | [`ProcessIo`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/domain/entity/ProcessIo.java), [`ProcessConnection`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/domain/entity/ProcessConnection.java) | 타입·스키마·호환성·실행 조건 계약 필요 |
| 제조 생산 실행 | PARTIAL | [`ProductionRun`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRun.java), [`ProductionRunItem`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/ProductionRunItem.java), [`RunStateSnapshot`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/production/domain/entity/RunStateSnapshot.java) | 일반 Flow Run, 노드별 Step/Attempt, 실행 이벤트 원장 없음 |
| 그래픽 편집 문서와 협업 | PARTIAL | [`WorkflowEditorDocumentService`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/editor/application/WorkflowEditorDocumentService.java), [`GraphSyncService`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/collab/GraphSyncService.java) | 다중 사용자 실사용 검증과 충돌 모델 결정 |
| Workflow Revision 발행·폐기 | PARTIAL | [`WorkflowRevisionService`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/application/WorkflowRevisionService.java), [`WorkflowRevisionController`](../../flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/api/WorkflowRevisionController.java), [`V20`](../../flowmat_backend/src/main/resources/db/migration/V20__workflow_revision.sql), [`통합 테스트`](../../flowmat_backend/src/test/java/org/myweb/flowmat/WorkflowRevisionIntegrationTest.java) | 워크플로 draft를 별도 불변 snapshot으로 발행·조회하고 상태를 폐기할 수 있음. 생산 Run의 revision 참조와 화면 조작은 후속 범위 |
| 범용 Flow Run·Step·Attempt·Event | PLANNED | [벤치마크 FM-RUN-002~006](../FlowMat_GitHub_Benchmark_2026-09-24.md#fm-run-002--flow-run-일반화) | 제조 run과 연결, 상태 전이·멱등성·실패 복구 결정 |
| 재시도·시간 제한·실행 전 검증 | PLANNED | [벤치마크 P0](../FlowMat_GitHub_Benchmark_2026-09-24.md#10-최종적으로-가져올-기능-백로그) | 권한·자원·BOM·LOT 조건과 정책 모델 결정 |
| 용량·달력·setup·최적화 | PLANNED | [벤치마크 P1/P2](../FlowMat_GitHub_Benchmark_2026-09-24.md#12-p1--simulation--planning) | Runtime/Port 계약 이후 단계 |

## 구현 순서와 결정 경계

1. 기존 `workflow`를 정의의 식별자로 유지하고, 발행된 스냅샷을 별도 revision으로 다루는 Sprint 1 설계를 먼저 확정한다. `production_run`의 BOM 스냅샷은 유지한다.
2. 실행이 어떤 revision을 참조할지와 노드 Step 상태 전이를 정한 뒤 Sprint 2의 저장 구조·API·화면을 함께 구현한다.
3. Attempt·Event·retry/timeout 정책은 Step의 멱등성과 복구 규칙을 정한 후 추가한다. 그 뒤 Port/Connection 계약, 계획·자원 기능 순으로 간다.

`docs/handoff/2026-09-24-agent-brief.md` §6 D7의 Workflow Revision 방향은 사용자 지시에 따라 진행했다. V20은 새 마이그레이션이며 기존 V1~V19 파일은 이 작업에서 수정하지 않았다. 생산 Run 파일은 다른 세션이 수정 중이라 이번 단계에서 revision 참조를 붙이지 않았다. 커밋·푸시는 하지 않았다.
