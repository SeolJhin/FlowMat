package org.myweb.flowmat.domain.workflow.annotation.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class FractionalIndexServiceTest {

    private final FractionalIndexService fractionalIndexService = new FractionalIndexService();

    @Test
    void bothNullReturnsDefaultOrigin() {
        String result = fractionalIndexService.between(null, null);

        assertThat(result).isEqualTo("1024");
    }

    @Test
    void leftNullReturnsValueBelowRight() {
        String result = fractionalIndexService.between(null, "10");

        assertThat(new BigDecimal(result)).isLessThan(new BigDecimal("10"));
    }

    @Test
    void rightNullReturnsValueAboveLeft() {
        String result = fractionalIndexService.between("10", null);

        assertThat(new BigDecimal(result)).isGreaterThan(new BigDecimal("10"));
    }

    @Test
    void betweenTwoValuesReturnsMidpoint() {
        String result = fractionalIndexService.between("10", "20");

        assertThat(new BigDecimal(result)).isEqualByComparingTo("15");
    }

    @Test
    void resultAlwaysStaysStrictlyBetweenBounds() {
        String left = "1";
        String right = "2";

        String first = fractionalIndexService.between(left, right);
        String second = fractionalIndexService.between(left, first);

        assertThat(new BigDecimal(second)).isGreaterThan(new BigDecimal(left));
        assertThat(new BigDecimal(second)).isLessThan(new BigDecimal(first));
    }
}
