package org.myweb.flowmat.domain.production.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.production.api.dto.request.WorkOrderCreateRequest;
import org.myweb.flowmat.domain.production.api.dto.request.WorkOrderUpdateRequest;
import org.myweb.flowmat.domain.production.api.dto.response.WorkOrderResponse;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.production.domain.enums.WorkOrderStatus;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.production.repository.WorkOrderRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.workflow.repository.WorkflowRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;

@ExtendWith(MockitoExtension.class)
class WorkOrderServiceImplTest {

    @Mock private WorkOrderRepository workOrderRepository;
    @Mock private ProductionRunRepository productionRunRepository;
    @Mock private WorkflowRepository workflowRepository;
    @Mock private ItemRepository itemRepository;
    @Mock private ProjectAccessService projectAccessService;
    @Mock private IdGenerator idGenerator;

    @InjectMocks
    private WorkOrderServiceImpl workOrderService;

    @ParameterizedTest(name = "{0} -> {1} allowed={2}")
    @CsvSource({
        "DRAFT, APPROVED, true",
        "DRAFT, CANCELLED, true",
        "DRAFT, IN_PROGRESS, false",
        "APPROVED, IN_PROGRESS, true",
        "APPROVED, CANCELLED, true",
        "IN_PROGRESS, COMPLETED, true",
        "IN_PROGRESS, CANCELLED, false",
        "COMPLETED, CANCELLED, false",
        "CANCELLED, APPROVED, false",
    })
    void stateMachine(WorkOrderStatus from, WorkOrderStatus to, boolean allowed) {
        assertThat(from.canTransitionTo(to)).isEqualTo(allowed);
    }

    @Test
    void createStartsAsNormalPriorityDraft() {
        when(idGenerator.generate()).thenReturn("wo-1");
        when(projectAccessService.requireCurrentUserId()).thenReturn("editor-1");
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WorkOrderResponse created = workOrderService.createWorkOrder(createRequest(null, null, null));

        assertThat(created.workOrderStatus()).isEqualTo("draft");
        assertThat(created.priority()).isEqualTo("normal");
        assertThat(created.workOrderNumber()).startsWith("WO-");
        assertThat(created.runCount()).isZero();
    }

    @Test
    void createRejectsPlannedEndBeforeStart() {
        OffsetDateTime start = OffsetDateTime.parse("2026-10-01T09:00:00+09:00");

        assertThatThrownBy(() -> workOrderService.createWorkOrder(createRequest(null, start, start.minusHours(1))))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Planned end");
        verify(workOrderRepository, never()).save(any());
    }

    @Test
    void createRejectsUnknownPriority() {
        assertThatThrownBy(() -> workOrderService.createWorkOrder(createRequest("asap", null, null)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Priority");
    }

    @Test
    void approvedOrdersAreFrozen() {
        givenOrder("approved");

        assertThatThrownBy(() -> workOrderService.updateWorkOrder("wo-1",
            new WorkOrderUpdateRequest("New title", null, null, null, null, null, null, null, null)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Only draft");
        verify(workOrderRepository, never()).save(any());
    }

    @Test
    void approveRequiresProjectOwner() {
        givenOrder("draft");
        when(projectAccessService.requireProjectOwnerAccess("project-1"))
            .thenThrow(new BusinessException(ErrorCode.FORBIDDEN, "Project owner access is required."));

        assertThatThrownBy(() -> workOrderService.approveWorkOrder("wo-1")).isInstanceOf(BusinessException.class);
        verify(workOrderRepository, never()).save(any());
    }

    @Test
    void approveRecordsApprover() {
        WorkOrder order = givenOrder("draft");
        when(projectAccessService.requireCurrentUserId()).thenReturn("owner-1");
        when(workOrderRepository.save(order)).thenReturn(order);
        when(productionRunRepository.findAllByWorkOrderIdInAndDeletedYn(anyCollection(), eq("N"))).thenReturn(List.of());

        WorkOrderResponse approved = workOrderService.approveWorkOrder("wo-1");

        assertThat(approved.workOrderStatus()).isEqualTo("approved");
        assertThat(approved.approvedBy()).isEqualTo("owner-1");
        assertThat(approved.approvedAt()).isNotNull();
    }

    @Test
    void cannotCancelCompletedOrder() {
        givenOrder("completed");

        assertThatThrownBy(() -> workOrderService.cancelWorkOrder("wo-1"))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("cannot move from completed to cancelled");
    }

    @Test
    void completeWaitsForOpenRuns() {
        givenOrder("in_progress");
        when(productionRunRepository.findAllByWorkOrderIdInAndDeletedYn(anyCollection(), eq("N")))
            .thenReturn(List.of(run("finished", "10"), run("running", "0")));

        assertThatThrownBy(() -> workOrderService.completeWorkOrder("wo-1"))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Finish every production run");
        verify(workOrderRepository, never()).save(any());
    }

    @Test
    void completeSumsProducedQuantity() {
        WorkOrder order = givenOrder("in_progress");
        when(productionRunRepository.findAllByWorkOrderIdInAndDeletedYn(anyCollection(), eq("N")))
            .thenReturn(List.of(run("finished", "10"), run("finished", "2.5")));
        when(workOrderRepository.save(order)).thenReturn(order);

        WorkOrderResponse completed = workOrderService.completeWorkOrder("wo-1");

        assertThat(completed.workOrderStatus()).isEqualTo("completed");
        assertThat(completed.producedQuantity()).isEqualByComparingTo("12.5");
        assertThat(completed.runCount()).isEqualTo(2);
        assertThat(completed.actualEndAt()).isNotNull();
    }

    private WorkOrder givenOrder(String status) {
        WorkOrder order = new WorkOrder();
        order.setWorkOrderId("wo-1");
        order.setWorkOrderNumber("WO-1");
        order.setProjectId("project-1");
        order.setWorkOrderTitle("Batch 1");
        order.setWorkOrderStatus(status);
        order.setDeletedYn("N");
        when(workOrderRepository.findByWorkOrderIdAndDeletedYn("wo-1", "N")).thenReturn(Optional.of(order));
        return order;
    }

    private static ProductionRun run(String status, String actualOutput) {
        ProductionRun run = new ProductionRun();
        run.setWorkOrderId("wo-1");
        run.setRunStatus(status);
        run.setActualOutputQty(new BigDecimal(actualOutput));
        return run;
    }

    private static WorkOrderCreateRequest createRequest(String priority, OffsetDateTime start, OffsetDateTime end) {
        return new WorkOrderCreateRequest("project-1", "Batch 1", null, null, null, new BigDecimal("100"),
            priority, start, end, null, null);
    }
}
