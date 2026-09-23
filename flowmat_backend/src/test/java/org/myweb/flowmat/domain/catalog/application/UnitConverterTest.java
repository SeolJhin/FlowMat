package org.myweb.flowmat.domain.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.catalog.domain.entity.UnitMaster;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;
import org.myweb.flowmat.global.exception.BusinessException;

@ExtendWith(MockitoExtension.class)
class UnitConverterTest {

    @Mock private UnitMasterRepository unitMasterRepository;

    @InjectMocks
    private UnitConverter unitConverter;

    @BeforeEach
    void seedUnits() {
        // Mirrors the V15 seed: kg is the mass base unit, g and t convert to it.
        register(unit("unit_kg", "kg", "mass", null, "1"));
        register(unit("unit_g", "g", "mass", "kg", "0.001"));
        register(unit("unit_t", "t", "mass", "kg", "1000"));
        register(unit("unit_m", "m", "length", null, "1"));
    }

    @Test
    void convertsGramsIntoKilogramItem() {
        UnitConverter.Conversion conversion = unitConverter.toItemUnit(new BigDecimal("500"), "g", "unit_kg");

        assertThat(conversion.quantity()).isEqualByComparingTo("0.5");
        assertThat(conversion.converted()).isTrue();
        assertThat(conversion.toUnitCode()).isEqualTo("kg");
    }

    @Test
    void convertsBetweenTwoDerivedUnits() {
        assertThat(unitConverter.toItemUnit(new BigDecimal("2"), "t", "unit_g").quantity()).isEqualByComparingTo("2000000");
    }

    @Test
    void recordingInTheItemsOwnUnitIsUnchanged() {
        UnitConverter.Conversion conversion = unitConverter.toItemUnit(new BigDecimal("3"), "KG", "unit_kg");

        assertThat(conversion.quantity()).isEqualByComparingTo("3");
        assertThat(conversion.converted()).isFalse();
    }

    @Test
    void rejectsUnitsOfAnotherType() {
        assertThatThrownBy(() -> unitConverter.toItemUnit(BigDecimal.ONE, "m", "unit_kg"))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Cannot record m (length) for an item measured in kg (mass)");
    }

    @Test
    void rejectsUnknownUnitsForItemsThatHaveAUnit() {
        assertThatThrownBy(() -> unitConverter.toItemUnit(BigDecimal.ONE, "ea", "unit_kg"))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Unknown unit 'ea'");
    }

    @Test
    void itemsWithoutAUnitKeepTheRecordedQuantity() {
        UnitConverter.Conversion conversion = unitConverter.toItemUnit(new BigDecimal("7"), "whatever", null);

        assertThat(conversion.quantity()).isEqualByComparingTo("7");
        assertThat(conversion.converted()).isFalse();
    }

    private void register(UnitMaster unit) {
        lenient().when(unitMasterRepository.findById(unit.getUnitId())).thenReturn(Optional.of(unit));
        lenient().when(unitMasterRepository.findByUnitCodeIgnoreCase(unit.getUnitCode())).thenReturn(Optional.of(unit));
        lenient().when(unitMasterRepository.findByUnitCodeIgnoreCase(unit.getUnitCode().toUpperCase())).thenReturn(Optional.of(unit));
    }

    private static UnitMaster unit(String id, String code, String type, String baseCode, String rate) {
        UnitMaster unit = new UnitMaster();
        unit.setUnitId(id);
        unit.setUnitCode(code);
        unit.setUnitName(code);
        unit.setUnitType(type);
        unit.setBaseUnitCode(baseCode);
        unit.setConversionRate(new BigDecimal(rate));
        unit.setActiveYn("Y");
        return unit;
    }
}
