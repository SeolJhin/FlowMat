package org.myweb.flowmat.domain.inventory.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** ABC classes by value used (docs/domain/stock-analysis.md). */
class StockMovementAnalysisServiceTest {

    @Test
    void theItemsThatMakeUpTheFirstEightyPercentAreA() {
        // 70 + 15 + 10 + 5 = 100: FLOUR starts at 0%, SUGAR at 70%, both A; SALT at 85% is B; YEAST at 95% is C.
        Map<String, String> classes = StockMovementAnalysisService.abcClasses(Map.of(
            "flour", new BigDecimal("70"),
            "sugar", new BigDecimal("15"),
            "salt", new BigDecimal("10"),
            "yeast", new BigDecimal("5"),
            "idle", BigDecimal.ZERO
        ));

        assertThat(classes).containsEntry("flour", "A").containsEntry("sugar", "A").containsEntry("salt", "B")
            .containsEntry("yeast", "C").containsEntry("idle", "C");
    }

    @Test
    void oneItemCarryingEverythingIsAAndNothingUsedIsAllC() {
        assertThat(StockMovementAnalysisService.abcClasses(Map.of("oil", new BigDecimal("95"), "salt", new BigDecimal("5"))))
            .containsEntry("oil", "A").containsEntry("salt", "C");
        assertThat(StockMovementAnalysisService.abcClasses(Map.of("oil", BigDecimal.ZERO, "salt", BigDecimal.ZERO)))
            .containsEntry("oil", "C").containsEntry("salt", "C");
        assertThat(StockMovementAnalysisService.abcClasses(Map.of())).isEmpty();
    }
}
