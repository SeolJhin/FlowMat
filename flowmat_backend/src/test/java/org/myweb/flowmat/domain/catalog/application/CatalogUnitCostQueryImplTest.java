package org.myweb.flowmat.domain.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogUnitCostView.CostBasis;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.domain.entity.ItemCostHistory;
import org.myweb.flowmat.domain.catalog.repository.ItemCostHistoryRepository;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;

@ExtendWith(MockitoExtension.class)
class CatalogUnitCostQueryImplTest {
    private static final OffsetDateTime FIRST = OffsetDateTime.parse("2026-10-03T03:00:00Z");
    private static final OffsetDateTime LAST = FIRST.plusDays(1);
    @Mock private ItemRepository items;
    @Mock private ItemCostHistoryRepository history;
    @InjectMocks private CatalogUnitCostQueryImpl query;

    @Test
    void currentPricesDoNotReadHistory() {
        when(items.findAllById(Set.of("a"))).thenReturn(List.of(item("a", "p", "30")));
        var cost = query.findUnitCostsAt("p", Set.of("a"), null).get("a");
        assertThat(cost.unitCost()).isEqualByComparingTo("30");
        assertThat(cost.costBasis()).isEqualTo(CostBasis.CURRENT);
        assertThat(cost.costBasisAt()).isNull();
        verifyNoInteractions(history);
    }

    @Test
    void finishedPricesUseTheLastChangeBeforeTheBasis() {
        seed(List.of(change("new", "a", LAST, "20", "30"), change("old", "a", FIRST, "10", "20")));
        var cost = query.findUnitCostsAt("p", Set.of("a"), FIRST.plusHours(1)).get("a");
        assertThat(cost.unitCost()).isEqualByComparingTo("20");
        assertThat(cost.costBasis()).isEqualTo(CostBasis.HISTORICAL);
        assertThat(cost.costBasisAt()).isEqualTo(FIRST.plusHours(1));
    }

    @Test
    void aChangeAtTheExactBasisAppliesIncludingAnEquivalentOffset() {
        seed(List.of(change("new", "a", LAST, "20", "30"), change("old", "a", FIRST, "10", "20")));
        var cost = query.findUnitCostsAt("p", Set.of("a"), OffsetDateTime.parse("2026-10-04T12:00:00+09:00")).get("a");
        assertThat(cost.unitCost()).isEqualByComparingTo("30");
        assertThat(cost.costBasis()).isEqualTo(CostBasis.HISTORICAL);
    }

    @Test
    void beforeHistoryUsesTheEarliestPreviousPriceAndMarksAnEstimate() {
        seed(List.of(change("new", "a", LAST, "20", "30"), change("old", "a", FIRST, "10", "20")));
        var cost = query.findUnitCostsAt("p", Set.of("a"), FIRST.minusDays(1)).get("a");
        assertThat(cost.unitCost()).isEqualByComparingTo("10");
        assertThat(cost.costBasis()).isEqualTo(CostBasis.ESTIMATED);
    }

    @Test
    void absentHistoryUsesCurrentPriceAndMarksAnEstimate() {
        seed(List.of());
        var cost = query.findUnitCostsAt("p", Set.of("a"), FIRST).get("a");
        assertThat(cost.unitCost()).isEqualByComparingTo("30");
        assertThat(cost.costBasis()).isEqualTo(CostBasis.ESTIMATED);
    }

    @Test
    void anUnknownHistoricalPriceDoesNotFallBackToTodaysKnownPrice() {
        seed(List.of(change("new", "a", LAST, "0", "30"), change("old", "a", FIRST, "10", "0")));
        var cost = query.findUnitCostsAt("p", Set.of("a"), FIRST.plusHours(1)).get("a");
        assertThat(cost.unitCost()).isNull();
        assertThat(cost.costBasis()).isEqualTo(CostBasis.HISTORICAL);
    }

    @Test
    void anUnknownPreviousPriceStaysUnknown() {
        seed(List.of(change("old", "a", FIRST, null, "30")));
        var cost = query.findUnitCostsAt("p", Set.of("a"), FIRST.minusDays(1)).get("a");
        assertThat(cost.unitCost()).isNull();
        assertThat(cost.costBasis()).isEqualTo(CostBasis.ESTIMATED);
    }

    @Test
    void currentZeroCostIsUnknown() {
        when(items.findAllById(Set.of("a"))).thenReturn(List.of(item("a", "p", "0")));
        assertThat(query.findUnitCostsAt("p", Set.of("a"), null).get("a").unitCost()).isNull();
    }

    @Test
    void missingAndForeignItemsAreExcludedFromTheResultAndHistoryLookup() {
        when(items.findAllById(Set.of("a", "foreign", "missing"))).thenReturn(List.of(item("a", "p", "30"), item("foreign", "other", "90")));
        when(history.findAllByProjectIdAndItemIdInOrderByChangedAtDescItemCostHistoryIdDesc("p", Set.of("a"))).thenReturn(List.of());
        assertThat(query.findUnitCostsAt("p", Set.of("a", "foreign", "missing"), FIRST)).containsOnlyKeys("a");
        verify(history).findAllByProjectIdAndItemIdInOrderByChangedAtDescItemCostHistoryIdDesc("p", Set.of("a"));
    }

    @Test
    void emptyIdsMakeNoQueriesAndPermitNullKeyLookups() {
        var costs = query.findUnitCostsAt("p", Set.of(), FIRST);
        assertThat(costs).isEmpty();
        assertThat(costs.get(null)).isNull();
        verifyNoInteractions(items, history);
    }

    @Test
    void onlyForeignItemsMakeNoHistoryLookup() {
        when(items.findAllById(Set.of("foreign"))).thenReturn(List.of(item("foreign", "other", "90")));
        assertThat(query.findUnitCostsAt("p", Set.of("foreign"), FIRST)).isEmpty();
        verifyNoInteractions(history);
    }

    @Test
    void conflictingChangesWithTheSameStoredTimestampAreNotReportedAsExact() {
        seed(List.of(change("new", "a", FIRST, "20", "30"), change("old", "a", FIRST, "10", "20")));
        var cost = query.findUnitCostsAt("p", Set.of("a"), FIRST.plusHours(1)).get("a");
        assertThat(cost.costBasis()).isEqualTo(CostBasis.ESTIMATED);
    }

    @Test
    void equalPricesWithDifferentScalesAtOneInstantAreNotAmbiguous() {
        seed(List.of(change("new", "a", FIRST, "20", "30.0"), change("old", "a", FIRST, "10", "30")));
        var cost = query.findUnitCostsAt("p", Set.of("a"), FIRST.plusHours(1)).get("a");
        assertThat(cost.unitCost()).isEqualByComparingTo("30");
        assertThat(cost.costBasis()).isEqualTo(CostBasis.HISTORICAL);
    }

    @Test
    void conflictingEarliestPreviousPricesUseTheCurrentEstimate() {
        seed(List.of(change("new", "a", FIRST, "20", "30"), change("old", "a", FIRST, "10", "20")));
        var cost = query.findUnitCostsAt("p", Set.of("a"), FIRST.minusDays(1)).get("a");
        assertThat(cost.unitCost()).isEqualByComparingTo("30");
        assertThat(cost.costBasis()).isEqualTo(CostBasis.ESTIMATED);
    }

    @Test
    void zeroAndNullPreviousPricesBothMeanUnknown() {
        seed(List.of(change("new", "a", FIRST, "0", "30"), change("old", "a", FIRST, null, "20")));
        var cost = query.findUnitCostsAt("p", Set.of("a"), FIRST.minusDays(1)).get("a");
        assertThat(cost.unitCost()).isNull();
        assertThat(cost.costBasis()).isEqualTo(CostBasis.ESTIMATED);
    }

    private void seed(List<ItemCostHistory> rows) {
        when(items.findAllById(Set.of("a"))).thenReturn(List.of(item("a", "p", "30")));
        when(history.findAllByProjectIdAndItemIdInOrderByChangedAtDescItemCostHistoryIdDesc("p", Set.of("a"))).thenReturn(rows);
    }

    private static Item item(String id, String project, String cost) {
        Item item = new Item();
        item.setItemId(id);
        item.setProjectId(project);
        item.setUnitCost(cost == null ? null : new BigDecimal(cost));
        return item;
    }

    private static ItemCostHistory change(String id, String item, OffsetDateTime at, String previous, String cost) {
        ItemCostHistory row = new ItemCostHistory();
        row.setItemCostHistoryId(id);
        row.setProjectId("p");
        row.setItemId(item);
        row.setChangedAt(at);
        row.setPreviousUnitCost(previous == null ? null : new BigDecimal(previous));
        row.setUnitCost(cost == null ? null : new BigDecimal(cost));
        return row;
    }
}
