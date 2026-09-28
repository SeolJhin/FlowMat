package org.myweb.flowmat.domain.production.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.catalog.application.UnitConverter;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRunItem;
import org.myweb.flowmat.domain.production.repository.ProductionRunItemRepository;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;

@ExtendWith(MockitoExtension.class)
class OpenRunInputsTest {

    @Mock private ProductionRunRepository productionRunRepository;
    @Mock private ProductionRunItemRepository productionRunItemRepository;
    @Mock private ItemRepository itemRepository;
    @Mock private UnitConverter unitConverter;
    @InjectMocks private OpenRunInputs openRunInputs;

    @Test
    void simulatedInputsAreNotReportedAsConsumedMaterial() {
        ProductionRun simulation = new ProductionRun();
        simulation.setProductionRunId("simulation-1");
        simulation.setWorkOrderId("order-1");
        simulation.setRunStatus("running");
        simulation.setRunType("simulation");
        ProductionRun actual = new ProductionRun();
        actual.setProductionRunId("actual-1");
        actual.setWorkOrderId("order-1");
        actual.setRunStatus("running");
        actual.setRunType("actual");
        ProductionRunItem input = new ProductionRunItem();
        input.setProductionRunId("simulation-1");
        input.setItemId("material-1");
        input.setDirection("input");
        input.setActualQty(BigDecimal.ONE);
        input.setUnit("kg");
        lenient().when(productionRunItemRepository.findAllByProductionRunIdOrderByProductionRunItemIdAsc("simulation-1"))
            .thenReturn(List.of(input));
        ProductionRunItem actualInput = new ProductionRunItem();
        actualInput.setProductionRunId("actual-1");
        actualInput.setItemId("material-1");
        actualInput.setDirection("input");
        actualInput.setActualQty(BigDecimal.ONE);
        actualInput.setUnit("kg");
        when(productionRunItemRepository.findAllByProductionRunIdOrderByProductionRunItemIdAsc("actual-1"))
            .thenReturn(List.of(actualInput));
        Item item = new Item();
        item.setItemId("material-1");
        item.setUnitId("unit-kg");
        when(itemRepository.findAllById(any())).thenReturn(List.of(item));
        when(unitConverter.toItemUnit(BigDecimal.ONE, "kg", "unit-kg"))
            .thenReturn(new UnitConverter.Conversion(BigDecimal.ONE, "kg", "kg", false));

        assertThat(openRunInputs.byOrder(List.of(simulation, actual)).get("order-1"))
            .containsEntry("material-1", BigDecimal.ONE);
    }
}
