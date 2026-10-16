package org.myweb.flowmat;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogEquipmentView;

class CatalogEquipmentEfficiencyPrecisionTest {
    @ParameterizedTest
    @CsvSource({"0.0001,50,0.00005", "0.0001,0.01,0.00000001", "0.0003,50,0.00015",
        "10,80,8", "0.0001,,0.0001", "0.0001,100,0.0001"})
    void legalRatesKeepTheExactCapacityTimesEfficiency(String capacity, String efficiency, String expected) {
        CatalogEquipmentView view = view(new BigDecimal(capacity), efficiency == null ? null : new BigDecimal(efficiency));
        assertThat(view.effectiveCapacityPerHour()).isEqualByComparingTo(expected);
    }

    @Test
    void anUnsetCapacityStaysUnset() {
        assertThat(view(null, new BigDecimal("50")).effectiveCapacityPerHour()).isNull();
    }

    private static CatalogEquipmentView view(BigDecimal capacity, BigDecimal efficiency) {
        Map<String, Object> fields = new HashMap<>();
        fields.put("capacityPerHour", capacity);
        fields.put("efficiencyPercent", efficiency);
        return new ObjectMapper().convertValue(fields, CatalogEquipmentView.class);
    }
}
