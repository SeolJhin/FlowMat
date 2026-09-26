package org.myweb.flowmat.domain.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentCreateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentDetails;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentUpdateRequest;
import org.myweb.flowmat.domain.catalog.domain.entity.Equipment;
import org.myweb.flowmat.domain.catalog.repository.EquipmentRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;

@ExtendWith(MockitoExtension.class)
class EquipmentServiceImplTest {
    @Mock EquipmentRepository repository;
    @Mock ProjectAccessService access;
    @Mock IdGenerator ids;
    @InjectMocks EquipmentServiceImpl service;

    @Test
    void createsEquipmentOnlyInWritableProject() {
        when(ids.generate()).thenReturn("eq-1");
        when(access.requireCurrentUserId()).thenReturn("user-1");
        when(repository.save(any(Equipment.class))).thenAnswer(call -> call.getArgument(0));

        var result = service.createEquipment(new EquipmentCreateRequest(" project-1 ", " mixer ", " Mixer ", " machine ", null));

        verify(access).requireProjectWriteAccess("project-1");
        assertThat(result.projectId()).isEqualTo("project-1");
        assertThat(result.equipmentCode()).isEqualTo("mixer");
        assertThat(result.equipmentStatus()).isEqualTo("active");
    }

    @Test
    void rejectsDuplicateCodeWithinProject() {
        when(repository.existsByProjectIdAndEquipmentCodeIgnoreCaseAndDeletedYn("p", "mixer", "N")).thenReturn(true);
        assertThatThrownBy(() -> service.createEquipment(new EquipmentCreateRequest("p", "mixer", "Mixer", "machine", null)))
            .isInstanceOf(BusinessException.class).hasMessageContaining("already exists");
        verify(repository, never()).save(any());
    }

    @Test
    void readAndUpdateCheckProjectPermission() {
        Equipment equipment = equipment();
        when(repository.findAllByProjectIdAndDeletedYnOrderByCreatedAtDesc("p", "N")).thenReturn(List.of(equipment));
        when(repository.findByEquipmentIdAndDeletedYn("eq-1", "N")).thenReturn(Optional.of(equipment));
        when(repository.save(any(Equipment.class))).thenAnswer(call -> call.getArgument(0));

        assertThat(service.listEquipment("p")).hasSize(1);
        assertThat(service.getEquipment("eq-1").equipmentName()).isEqualTo("Old");
        assertThat(service.updateEquipment("eq-1", new EquipmentUpdateRequest("New", null, "maintenance", null))
            .equipmentStatus()).isEqualTo("maintenance");
        verify(access, times(2)).requireProjectReadAccess("p");
        verify(access).requireProjectWriteAccess("p");
    }

    @Test
    void deleteNeedsOwnerAndSoftDeletes() {
        Equipment equipment = equipment();
        when(repository.findByEquipmentIdAndDeletedYn("eq-1", "N")).thenReturn(Optional.of(equipment));
        service.deleteEquipment("eq-1");
        verify(access).requireProjectOwnerAccess("p");
        assertThat(equipment.getDeletedYn()).isEqualTo("Y");
        verify(repository).save(equipment);
    }

    @Test
    void forbiddenWriteDoesNotSave() {
        org.mockito.Mockito.doThrow(new BusinessException(ErrorCode.FORBIDDEN)).when(access).requireProjectWriteAccess("p");
        assertThatThrownBy(() -> service.createEquipment(new EquipmentCreateRequest("p", null, "Mixer", "machine", null)))
            .isInstanceOf(BusinessException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void rejectsUnknownStatus() {
        when(repository.findByEquipmentIdAndDeletedYn("eq-1", "N")).thenReturn(Optional.of(equipment()));
        assertThatThrownBy(() -> service.updateEquipment("eq-1", new EquipmentUpdateRequest(null, null, "unknown", null)))
            .isInstanceOf(BusinessException.class).hasMessageContaining("Invalid equipmentStatus");
        verify(repository, never()).save(any());
    }

    @Test
    void detailsAreReplacedWholeAndOmittedDetailsStay() {
        Equipment equipment = equipment();
        equipment.setManufacturer("Acme");
        equipment.setPowerKwh(new BigDecimal("3.5"));
        when(repository.findByEquipmentIdAndDeletedYn("eq-1", "N")).thenReturn(Optional.of(equipment));
        when(repository.save(any(Equipment.class))).thenAnswer(call -> call.getArgument(0));

        assertThat(service.updateEquipment("eq-1", new EquipmentUpdateRequest("Renamed", null, null, null)).details().manufacturer())
            .isEqualTo("Acme");
        var details = service.updateEquipment("eq-1", new EquipmentUpdateRequest(null, null, null,
            new EquipmentDetails(" ", " M-200 ", null, new BigDecimal("40"), null, null, " Line 2 "))).details();
        assertThat(details.manufacturer()).isNull();
        assertThat(details.modelName()).isEqualTo("M-200");
        assertThat(details.capacityPerHour()).isEqualByComparingTo("40");
        assertThat(details.powerKwh()).isNull();
        assertThat(details.location()).isEqualTo("Line 2");
    }

    @Test
    void rejectsNegativeDetailNumbers() {
        when(repository.findByEquipmentIdAndDeletedYn("eq-1", "N")).thenReturn(Optional.of(equipment()));
        assertThatThrownBy(() -> service.updateEquipment("eq-1", new EquipmentUpdateRequest(null, null, null,
            new EquipmentDetails(null, null, null, null, new BigDecimal("-1"), null, null))))
            .isInstanceOf(BusinessException.class).hasMessageContaining("powerKwh must not be negative");
        verify(repository, never()).save(any());
    }

    private static Equipment equipment() {
        Equipment equipment = new Equipment();
        equipment.setEquipmentId("eq-1");
        equipment.setProjectId("p");
        equipment.setEquipmentName("Old");
        equipment.setEquipmentType("machine");
        return equipment;
    }
}
