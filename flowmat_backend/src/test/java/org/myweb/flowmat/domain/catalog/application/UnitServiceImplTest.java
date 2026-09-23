package org.myweb.flowmat.domain.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.catalog.api.dto.request.UnitCreateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.request.UnitUpdateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.response.UnitResponse;
import org.myweb.flowmat.domain.catalog.domain.entity.UnitMaster;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.myweb.flowmat.global.rbac.PermissionService;
import org.myweb.flowmat.global.rbac.SystemPermission;

@ExtendWith(MockitoExtension.class)
class UnitServiceImplTest {

    @Mock private UnitMasterRepository unitMasterRepository;
    @Mock private PermissionService permissionService;
    @Mock private IdGenerator idGenerator;

    @InjectMocks
    private UnitServiceImpl unitService;

    @Test
    void createBaseUnitForcesRateOne() {
        when(idGenerator.generate()).thenReturn("unit-1");
        when(unitMasterRepository.save(any(UnitMaster.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UnitResponse created = unitService.createUnit(
            new UnitCreateRequest("pcs", "Pieces", "Count", null, new BigDecimal("7"))
        );

        assertThat(created.unitType()).isEqualTo("count");
        assertThat(created.baseUnitCode()).isNull();
        assertThat(created.conversionRate()).isEqualByComparingTo("1");
        assertThat(created.activeYn()).isEqualTo("Y");
    }

    @Test
    void createDerivedUnitLinksToBaseOfSameType() {
        when(unitMasterRepository.findByUnitCodeIgnoreCase("KG")).thenReturn(Optional.of(unit("kg", "mass", null)));
        when(idGenerator.generate()).thenReturn("unit-2");
        when(unitMasterRepository.save(any(UnitMaster.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UnitResponse created = unitService.createUnit(
            new UnitCreateRequest("lb", "Pound", "mass", "KG", new BigDecimal("0.45359237"))
        );

        assertThat(created.baseUnitCode()).isEqualTo("kg");
        assertThat(created.conversionRate()).isEqualByComparingTo("0.45359237");
    }

    @Test
    void rejectsDuplicateCodeIgnoringCase() {
        when(unitMasterRepository.existsByUnitCodeIgnoreCase("KG")).thenReturn(true);

        assertThatThrownBy(() -> unitService.createUnit(new UnitCreateRequest("KG", "Kilo", "mass", null, null)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("already exists");
        verify(unitMasterRepository, never()).save(any());
    }

    @Test
    void rejectsBaseUnitOfDifferentType() {
        when(unitMasterRepository.findByUnitCodeIgnoreCase("m")).thenReturn(Optional.of(unit("m", "length", null)));

        assertThatThrownBy(() -> unitService.createUnit(
            new UnitCreateRequest("oz", "Ounce", "mass", "m", new BigDecimal("0.028"))
        ))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("length unit");
    }

    @Test
    void rejectsNonPositiveRate() {
        when(unitMasterRepository.findByUnitCodeIgnoreCase("kg")).thenReturn(Optional.of(unit("kg", "mass", null)));

        assertThatThrownBy(() -> unitService.createUnit(
            new UnitCreateRequest("bad", "Bad", "mass", "kg", BigDecimal.ZERO)
        ))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("greater than 0");
    }

    @Test
    void cannotDeactivateBaseUnitWhileDerivedUnitsAreActive() {
        when(unitMasterRepository.findById("unit_kg")).thenReturn(Optional.of(unit("kg", "mass", null)));
        when(unitMasterRepository.existsByBaseUnitCodeIgnoreCaseAndActiveYn("kg", "Y")).thenReturn(true);

        assertThatThrownBy(() -> unitService.deactivateUnit("unit_kg"))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("first");
        verify(unitMasterRepository, never()).save(any());
    }

    @Test
    void cannotChangeRateOfBaseUnit() {
        when(unitMasterRepository.findById("unit_kg")).thenReturn(Optional.of(unit("kg", "mass", null)));

        assertThatThrownBy(() -> unitService.updateUnit("unit_kg", new UnitUpdateRequest(null, new BigDecimal("2"), null)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("rate 1");
    }

    @Test
    void writesRequireMasterDataPermission() {
        doThrow(new BusinessException(ErrorCode.FORBIDDEN, "Permission required: master_data:manage"))
            .when(permissionService).require(SystemPermission.MASTER_DATA_MANAGE);

        assertThatThrownBy(() -> unitService.createUnit(new UnitCreateRequest("x", "X", "count", null, null)))
            .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> unitService.deactivateUnit("unit_ea"))
            .isInstanceOf(BusinessException.class);
        verify(unitMasterRepository, never()).save(any());
    }

    private static UnitMaster unit(String code, String type, String baseUnitCode) {
        UnitMaster unit = new UnitMaster();
        unit.setUnitId("unit_" + code);
        unit.setUnitCode(code);
        unit.setUnitName(code);
        unit.setUnitType(type);
        unit.setBaseUnitCode(baseUnitCode);
        unit.setConversionRate(BigDecimal.ONE);
        unit.setActiveYn("Y");
        return unit;
    }
}
