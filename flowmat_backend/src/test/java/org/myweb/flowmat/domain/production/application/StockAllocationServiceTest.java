package org.myweb.flowmat.domain.production.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.bom.api.dto.response.BomRequirementResponse;
import org.myweb.flowmat.domain.bom.application.BomService;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.inventory.application.InventoryCommandService;
import org.myweb.flowmat.domain.inventory.application.InventoryMovement;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.production.api.dto.request.StockAllocationRequest;
import org.myweb.flowmat.domain.production.api.dto.response.StockAllocationResponse;
import org.myweb.flowmat.domain.production.domain.entity.StockAllocation;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.production.repository.StockAllocationRepository;
import org.myweb.flowmat.domain.production.repository.WorkOrderRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.id.IdGenerator;

@ExtendWith(MockitoExtension.class)
class StockAllocationServiceTest {

    @Mock private StockAllocationRepository allocationRepository;
    @Mock private WorkOrderRepository workOrderRepository;
    @Mock private ProductionRunRepository productionRunRepository;
    @Mock private BomService bomService;
    @Mock private OpenRunInputs openRunInputs;
    @Mock private ProductionPlanningReferences references;
    @Mock private org.myweb.flowmat.domain.project.application.publicapi.ProjectCalendarQuery projectCalendar;
    @Mock private InventoryCommandService inventoryCommandService;
    @Mock private ProjectAccessService projectAccessService;
    @Mock private IdGenerator idGenerator;
    @InjectMocks private StockAllocationService service;

    private WorkOrder order;

    @BeforeEach
    void anApprovedOrderWithFreeStock() {
        order = new WorkOrder();
        order.setWorkOrderId("order");
        order.setWorkOrderNumber("WO-1");
        order.setProjectId("project");
        order.setWorkOrderStatus("approved");
        Item item = new Item();
        item.setItemId("item");
        item.setProjectId("project");
        item.setItemCode("FLOUR");
        Inventory stock = new Inventory();
        stock.setInventoryId("stock");
        stock.setProjectId("project");
        stock.setItemId("item");
        stock.setInventoryStatus("available");
        stock.setQuantity(BigDecimal.TEN);
        stock.setReservedQuantity(BigDecimal.ZERO);
        stock.setAvailableQuantity(BigDecimal.TEN);
        lenient().when(workOrderRepository.findForUpdate("order")).thenReturn(Optional.of(order));
        lenient().when(references.item("item")).thenReturn(Optional.of(item));
        lenient().when(references.lockItemStock("project", "item")).thenReturn(List.of(stock));
        lenient().when(projectCalendar.today("project")).thenReturn(java.time.LocalDate.of(2026,10,9));
        lenient().when(allocationRepository.saveAndFlush(any(StockAllocation.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @ParameterizedTest
    @CsvSource({"0.00005, 0.0001", "1.23454, 1.2345", "1.23455, 1.2346"})
    void allocationAndStockMovementUseTheSameStoredQuantity(String requested, String stored) {
        StockAllocationResponse response = service.allocate("order", request(requested));

        assertReservation(response, stored);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.00001", "0.000049"})
    void anAmountThatRoundsToZeroCannotCreateAnEmptyReservation(String quantity) {
        assertThatThrownBy(() -> service.allocate("order", request(quantity)))
            .isInstanceOf(BusinessException.class).hasMessageContaining("lines.quantity").hasMessageContaining("0.0001");
        verify(allocationRepository, never()).saveAndFlush(any());
        verifyNoInteractions(inventoryCommandService);
    }

    @Test
    void repeatedLinesAreAddedBeforeRoundingTheirItemTotal() {
        StockAllocationResponse response = service.allocate("order", new StockAllocationRequest(List.of(
            new StockAllocationRequest.Line("item", new BigDecimal("0.000025")),
            new StockAllocationRequest.Line("item", new BigDecimal("0.000025")))));

        assertReservation(response, "0.0001");
    }

    @Test
    void bomDemandAfterAConvertedInputUsesTheStoredStockPrecision() {
        givenBomWithRecordedInput("0.0001234");

        StockAllocationResponse response = service.allocate("order", null);

        assertReservation(response, "0.0009");
    }

    @Test
    void aBomRemainderThatRoundsToZeroDoesNotCreateAnEmptyReservation() {
        givenBomWithRecordedInput("0.00096");

        StockAllocationResponse response = service.allocate("order", null);

        assertThat(response.plan()).isEmpty();
        verify(allocationRepository, never()).saveAndFlush(any());
        verifyNoInteractions(inventoryCommandService);
    }

    private void givenBomWithRecordedInput(String used) {
        order.setBomId("bom");
        order.setTargetItemId("product");
        order.setTargetQuantity(BigDecimal.ONE);
        BigDecimal required = new BigDecimal("0.001");
        when(bomService.requirementsForRun("bom", "project", "product", BigDecimal.ONE, null)).thenReturn(
            new BomRequirementResponse("bom", 1, "product", BigDecimal.ONE, BigDecimal.ONE,
                List.of(new BomRequirementResponse.Line("line", "item", required, "kg", required,
                    "kg", required, BigDecimal.ONE, null, null)), null, false, List.of()));
        when(openRunInputs.forOrder("order")).thenReturn(Map.of("item", new BigDecimal(used)));
    }

    private StockAllocationRequest request(String quantity) {
        return new StockAllocationRequest(List.of(new StockAllocationRequest.Line("item", new BigDecimal(quantity))));
    }

    private void assertReservation(StockAllocationResponse response, String expected) {
        ArgumentCaptor<StockAllocation> allocation = ArgumentCaptor.forClass(StockAllocation.class);
        ArgumentCaptor<InventoryMovement> movement = ArgumentCaptor.forClass(InventoryMovement.class);
        verify(allocationRepository).saveAndFlush(allocation.capture());
        verify(inventoryCommandService).apply(movement.capture());
        assertThat(allocation.getValue().getQuantity()).isEqualByComparingTo(expected);
        assertThat(movement.getValue().reservedDelta()).isEqualByComparingTo(expected);
        assertThat(response.plan()).hasSize(1);
        assertThat(response.plan().getFirst().needed()).isEqualByComparingTo(expected);
        assertThat(response.plan().getFirst().allocatedNow()).isEqualByComparingTo(expected);
        assertThat(response.plan().getFirst().shortage()).isZero();
    }
}
