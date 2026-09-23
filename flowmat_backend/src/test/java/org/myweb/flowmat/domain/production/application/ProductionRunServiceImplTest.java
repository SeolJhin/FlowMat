package org.myweb.flowmat.domain.production.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.bom.application.BomService;
import org.myweb.flowmat.domain.catalog.application.UnitConverter;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRunItem;
import org.myweb.flowmat.domain.inventory.application.InventoryCommandService;
import org.myweb.flowmat.domain.inventory.domain.enums.InventoryTransactionType;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunFinishRequest;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunItemRecordRequest;
import org.myweb.flowmat.domain.production.api.dto.response.ProductionRunResponse;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.repository.ProductionRunItemRepository;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.production.repository.WorkOrderRepository;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunStartRequest;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.workflow.domain.entity.Workflow;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.rule.application.FlowRuleEngineService;
import org.myweb.flowmat.domain.workflow.repository.ProcessIoRepository;
import org.myweb.flowmat.domain.workflow.repository.ProcessRepository;
import org.myweb.flowmat.domain.workflow.repository.WorkflowRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;

@ExtendWith(MockitoExtension.class)
class ProductionRunServiceImplTest {

    @Mock private ProductionRunRepository productionRunRepository;
    @Mock private ProductionRunItemRepository productionRunItemRepository;
    @Mock private ProjectAccessService projectAccessService;
    @Mock private WorkflowRepository workflowRepository;
    @Mock private ProcessRepository processRepository;
    @Mock private ProcessIoRepository processIoRepository;
    @Mock private ItemRepository itemRepository;
    @Mock private InventoryRepository inventoryRepository;
    @Mock private InventoryCommandService inventoryCommandService;
    @Mock private FlowRuleEngineService flowRuleEngineService;
    @Mock private IdGenerator idGenerator;
    @Mock private WorkOrderRepository workOrderRepository;
    @Mock private UnitConverter unitConverter;
    @Mock private BomService bomService;

    @InjectMocks
    private ProductionRunServiceImpl productionRunService;

    @Test
    void stockMovesByTheQuantityConvertedToTheItemsUnit() {
        givenRun("running");
        givenItem();
        Inventory inventory = givenInventory("item-1", "10");
        when(unitConverter.toItemUnit(new BigDecimal("500"), "g", "unit_kg"))
            .thenReturn(new UnitConverter.Conversion(new BigDecimal("0.5"), "g", "kg", true));
        when(idGenerator.generate()).thenReturn("run-item-1");
        when(productionRunItemRepository.save(any(ProductionRunItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(projectAccessService.requireCurrentUserId()).thenReturn("user-1");

        productionRunService.recordRunItem("run-1",
            new ProductionRunItemRecordRequest(null, null, "inv-1", "item-1", "input", new BigDecimal("500"), null, "g"));

        // Stock moves only through the inventory command (conditional atomic UPDATE + history), never a direct save.
        verify(inventoryRepository, never()).save(any());
        verify(inventoryCommandService).apply(argThat(movement ->
            movement.inventoryId().equals(inventory.getInventoryId())
                && movement.type() == InventoryTransactionType.PRODUCTION_INPUT
                && movement.quantityDelta().compareTo(new BigDecimal("-0.5")) == 0
                && movement.note().contains("500 g = 0.5 kg")
                && movement.actorUserId().equals("user-1")));
    }

    @Test
    void cannotRecordAgainstAnotherItemsStock() {
        givenRun("running");
        givenItem();
        givenInventory("item-2", "10");

        BusinessException exception = assertThrows(BusinessException.class, () -> productionRunService.recordRunItem("run-1",
            new ProductionRunItemRecordRequest(null, null, "inv-1", "item-1", "input", BigDecimal.ONE, null, "kg")));

        assertEquals("The selected stock record holds a different item.", exception.getMessage());
        verify(productionRunItemRepository, never()).save(any());
    }

    private void givenItem() {
        Item item = new Item();
        item.setItemId("item-1");
        item.setProjectId("project-1");
        item.setUnitId("unit_kg");
        when(itemRepository.findByItemIdAndDeletedYn("item-1", "N")).thenReturn(Optional.of(item));
    }

    private Inventory givenInventory(String itemId, String quantity) {
        Inventory inventory = new Inventory();
        inventory.setInventoryId("inv-1");
        inventory.setProjectId("project-1");
        inventory.setItemId(itemId);
        inventory.setQuantity(new BigDecimal(quantity));
        inventory.setAvailableQuantity(new BigDecimal(quantity));
        when(inventoryRepository.findByInventoryIdAndDeletedYn("inv-1", "N")).thenReturn(Optional.of(inventory));
        return inventory;
    }

    @Test
    void firstRunMovesApprovedWorkOrderToInProgress() {
        givenWorkflow();
        WorkOrder order = givenWorkOrder("approved", null);
        when(idGenerator.generate()).thenReturn("run-9");
        when(productionRunRepository.save(any(ProductionRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductionRunResponse run = productionRunService.startRun(startRequest("wo-1"));

        assertEquals("wo-1", run.workOrderId());
        assertEquals("in_progress", order.getWorkOrderStatus());
        verify(workOrderRepository).save(order);
    }

    @Test
    void runCannotStartOnDraftWorkOrder() {
        givenWorkflow();
        givenWorkOrder("draft", null);

        BusinessException exception = assertThrows(BusinessException.class,
            () -> productionRunService.startRun(startRequest("wo-1")));

        assertEquals("Work order WO-1 is draft; runs can only start on approved or in-progress orders.", exception.getMessage());
        verify(productionRunRepository, never()).save(any());
    }

    @Test
    void runCannotUseWorkOrderOfAnotherWorkflow() {
        givenWorkflow();
        givenWorkOrder("approved", "workflow-other");

        assertThrows(BusinessException.class, () -> productionRunService.startRun(startRequest("wo-1")));
        verify(productionRunRepository, never()).save(any());
        verify(workOrderRepository, never()).save(any());
    }

    private void givenWorkflow() {
        Workflow workflow = new Workflow();
        workflow.setWorkflowId("workflow-1");
        workflow.setProjectId("project-1");
        when(workflowRepository.findByWorkflowIdAndDeletedYn("workflow-1", "N")).thenReturn(Optional.of(workflow));
    }

    private WorkOrder givenWorkOrder(String status, String workflowId) {
        WorkOrder order = new WorkOrder();
        order.setWorkOrderId("wo-1");
        order.setWorkOrderNumber("WO-1");
        order.setProjectId("project-1");
        order.setWorkflowId(workflowId);
        order.setWorkOrderStatus(status);
        when(workOrderRepository.findByWorkOrderIdAndDeletedYn("wo-1", "N")).thenReturn(Optional.of(order));
        return order;
    }

    private static ProductionRunStartRequest startRequest(String workOrderId) {
        return new ProductionRunStartRequest("project-1", "workflow-1", null, BigDecimal.TEN, null, null, workOrderId, null);
    }

    @Test
    void finishRejectsAlreadyFinishedRun() {
        givenRun("finished");

        BusinessException exception = assertThrows(
            BusinessException.class,
            () -> productionRunService.finishRun("run-1", new ProductionRunFinishRequest(BigDecimal.TEN, null))
        );

        assertEquals("Run RUN-1 is already finished.", exception.getMessage());
        verify(productionRunRepository, never()).save(any());
        verifyNoInteractions(flowRuleEngineService);
    }

    @Test
    void finishClosesRunningRun() {
        givenRun("running");
        when(productionRunRepository.save(any(ProductionRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductionRunResponse response =
            productionRunService.finishRun("run-1", new ProductionRunFinishRequest(new BigDecimal("42"), "tester"));

        assertEquals("finished", response.runStatus());
        assertEquals(new BigDecimal("42"), response.actualOutputQty());
    }

    @Test
    void finishRecordsAuthenticatedUserInsteadOfRequestValue() {
        givenRun("running");
        when(projectAccessService.requireCurrentUserId()).thenReturn("real-user");
        when(productionRunRepository.save(any(ProductionRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        productionRunService.finishRun("run-1", new ProductionRunFinishRequest(BigDecimal.ONE, "spoofed-user"));

        ArgumentCaptor<ProductionRun> saved = ArgumentCaptor.forClass(ProductionRun.class);
        verify(productionRunRepository).save(saved.capture());
        assertEquals("real-user", saved.getValue().getFinishedBy());
    }

    @Test
    void finishRequiresProjectWriteAccess() {
        givenRun("running");
        when(projectAccessService.requireProjectWriteAccess("project-1"))
            .thenThrow(new BusinessException(ErrorCode.FORBIDDEN, "Project write access is required."));

        assertThrows(
            BusinessException.class,
            () -> productionRunService.finishRun("run-1", new ProductionRunFinishRequest(BigDecimal.TEN, null))
        );

        verify(productionRunRepository, never()).save(any());
        verifyNoInteractions(flowRuleEngineService);
    }

    @Test
    void getRunRequiresProjectReadAccess() {
        givenRun("running");
        when(projectAccessService.requireProjectReadAccess("project-1"))
            .thenThrow(new BusinessException(ErrorCode.FORBIDDEN, "Project membership is required."));

        assertThrows(BusinessException.class, () -> productionRunService.getRun("run-1"));
        assertThrows(BusinessException.class, () -> productionRunService.listRunItems("run-1"));
        verifyNoInteractions(productionRunItemRepository);
    }

    @Test
    void recordItemRejectsFinishedRun() {
        givenRun("finished");

        assertThrows(
            BusinessException.class,
            () -> productionRunService.recordRunItem("run-1", recordRequest("input"))
        );

        verifyNoInteractions(itemRepository, inventoryRepository, productionRunItemRepository);
    }

    @Test
    void recordItemRejectsUnknownDirection() {
        givenRun("running");

        BusinessException exception = assertThrows(
            BusinessException.class,
            () -> productionRunService.recordRunItem("run-1", recordRequest("sideways"))
        );

        assertEquals("direction must be 'input' or 'output'.", exception.getMessage());
        verifyNoInteractions(itemRepository, productionRunItemRepository);
    }

    private void givenRun(String status) {
        ProductionRun run = new ProductionRun();
        run.setProductionRunId("run-1");
        run.setProjectId("project-1");
        run.setWorkflowId("workflow-1");
        run.setRunNumber("RUN-1");
        run.setRunStatus(status);
        run.setPlannedOutputQty(BigDecimal.TEN);
        run.setActualOutputQty(BigDecimal.ZERO);
        run.setDeletedYn("N");
        when(productionRunRepository.findByProductionRunIdAndDeletedYn("run-1", "N")).thenReturn(Optional.of(run));
    }

    private static ProductionRunItemRecordRequest recordRequest(String direction) {
        return new ProductionRunItemRecordRequest(null, null, null, "item-1", direction, BigDecimal.ONE, null, "ea");
    }
}
