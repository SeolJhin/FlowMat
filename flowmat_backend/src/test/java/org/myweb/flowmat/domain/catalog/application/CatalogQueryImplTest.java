package org.myweb.flowmat.domain.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogItemView;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.domain.entity.UnitMaster;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;

@ExtendWith(MockitoExtension.class)
class CatalogQueryImplTest {

    @Mock private ItemRepository itemRepository;
    @Mock private UnitMasterRepository unitMasterRepository;

    @InjectMocks
    private CatalogQueryImpl catalogQuery;

    @Test
    void projectItemIsFoundOnlyInItsOwnProject() {
        when(itemRepository.findByItemIdAndDeletedYn("item-1", "N")).thenReturn(Optional.of(item("item-1", "p1", "unit_kg")));
        when(unitMasterRepository.findAllById(List.of("unit_kg"))).thenReturn(List.of(unit("unit_kg", "kg")));

        Optional<CatalogItemView> own = catalogQuery.findProjectItem("p1", "item-1");
        Optional<CatalogItemView> other = catalogQuery.findProjectItem("p2", "item-1");

        assertThat(own).get().extracting(CatalogItemView::itemCode, CatalogItemView::unitCode).containsExactly("CODE-item-1", "kg");
        assertThat(other).isEmpty();
    }

    @Test
    void itemsCarryTheirUnitCodeAndItemsWithoutAUnitHaveNone() {
        when(itemRepository.findAllById(Set.of("a", "b"))).thenReturn(List.of(item("a", "p1", "unit_kg"), item("b", "p1", null)));
        when(unitMasterRepository.findAllById(List.of("unit_kg"))).thenReturn(List.of(unit("unit_kg", "kg")));

        Map<String, CatalogItemView> items = catalogQuery.findItems(Set.of("a", "b"));

        assertThat(items).containsOnlyKeys("a", "b");
        assertThat(items.get("a").unitCode()).isEqualTo("kg");
        assertThat(items.get("a").unitCost()).isEqualByComparingTo("2.5");
        assertThat(items.get("b").unitId()).isNull();
        assertThat(items.get("b").unitCode()).isNull();
    }

    @Test
    void noIdsMeansNoQuery() {
        assertThat(catalogQuery.findItems(Set.of())).isEmpty();
        verify(itemRepository, never()).findAllById(any());
    }

    private static Item item(String id, String projectId, String unitId) {
        Item item = new Item();
        item.setItemId(id);
        item.setProjectId(projectId);
        item.setItemCode("CODE-" + id);
        item.setItemName("Name " + id);
        item.setUnitId(unitId);
        item.setUnitCost(new BigDecimal("2.5"));
        return item;
    }

    private static UnitMaster unit(String id, String code) {
        UnitMaster unit = new UnitMaster();
        unit.setUnitId(id);
        unit.setUnitCode(code);
        return unit;
    }
}
