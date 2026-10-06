package org.myweb.flowmat.global.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class CsvDecimalParserTest {

    @Test
    void parsesPlainAndCorrectlyGroupedNumbers() {
        assertEquals(new BigDecimal("1234.50"), CsvDecimalParser.parse("1234.50"));
        assertEquals(new BigDecimal("1234.50"), CsvDecimalParser.parse("1,234.50"));
        assertEquals(new BigDecimal("-1234567"), CsvDecimalParser.parse("-1,234,567"));
        assertEquals(new BigDecimal("1E+3"), CsvDecimalParser.parse("1e3"));
    }

    @Test
    void rejectsMalformedThousandsSeparatorsInsteadOfChangingTheValue() {
        assertThrows(NumberFormatException.class, () -> CsvDecimalParser.parse("1,2"));
        assertThrows(NumberFormatException.class, () -> CsvDecimalParser.parse("12,34"));
        assertThrows(NumberFormatException.class, () -> CsvDecimalParser.parse("1,234,56"));
        assertThrows(NumberFormatException.class, () -> CsvDecimalParser.parse("1,234.5,6"));
    }

    @Test
    void checksIntegerDigitsWithoutRescalingExtremeExponents() {
        assertTrue(CsvDecimalParser.hasMoreThanIntegerDigits(CsvDecimalParser.parse("1e2147483647"), 10));
        assertFalse(CsvDecimalParser.hasMoreThanIntegerDigits(CsvDecimalParser.parse("0e2147483647"), 10));
        assertFalse(CsvDecimalParser.hasMoreThanIntegerDigits(new BigDecimal("9999999999.9999"), 10));
    }
}
