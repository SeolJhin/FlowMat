package org.myweb.flowmat.domain.inventory.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class StockImportQuantityTest {

    @Test
    void storesConvertedPurchaseQuantitiesAtInventoryPrecision() {
        List<String> problems = new ArrayList<>();

        BigDecimal quantity = StockImportService.storedQuantity(
            new BigDecimal("2.5").multiply(new BigDecimal("2")),
            "Quantity",
            problems);

        assertEquals(new BigDecimal("5.0000"), quantity);
        assertEquals(List.of(), problems);
    }

    @Test
    void refusesConvertedPurchaseQuantitiesThatRoundToZeroOrExceedTheColumn() {
        List<String> tooSmall = new ArrayList<>();
        assertNull(StockImportService.storedQuantity(new BigDecimal("0.00004"), "Quantity", tooSmall));
        assertEquals(List.of("Quantity is too small to store at four decimal places"), tooSmall);

        List<String> tooLarge = new ArrayList<>();
        assertNull(StockImportService.storedQuantity(new BigDecimal("5000000000").multiply(BigDecimal.valueOf(2)),
            "Quantity", tooLarge));
        assertEquals(List.of("Quantity is too large"), tooLarge);

        List<String> roundsOutOfRange = new ArrayList<>();
        assertNull(StockImportService.storedQuantity(new BigDecimal("9999999999.99995"), "Quantity", roundsOutOfRange));
        assertEquals(List.of("Quantity is too large"), roundsOutOfRange);
    }
}
