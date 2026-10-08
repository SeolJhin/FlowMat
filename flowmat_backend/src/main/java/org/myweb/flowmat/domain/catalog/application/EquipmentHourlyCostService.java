package org.myweb.flowmat.domain.catalog.application;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentHourlyCostRequest;
import org.myweb.flowmat.domain.catalog.api.dto.response.EquipmentHourlyCostResponse;
import org.myweb.flowmat.domain.catalog.application.publicapi.EquipmentCostQuery;
import org.myweb.flowmat.domain.catalog.domain.entity.Equipment;
import org.myweb.flowmat.domain.catalog.domain.entity.EquipmentHourlyCost;
import org.myweb.flowmat.domain.catalog.repository.EquipmentRepository;
import org.myweb.flowmat.domain.catalog.repository.EquipmentHourlyCostRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EquipmentHourlyCostService implements EquipmentCostQuery {
    private final EquipmentRepository equipment;
    private final EquipmentHourlyCostRepository costs;
    private final ProjectAccessService access;
    private final EntityManager entities;

    public EquipmentHourlyCostResponse get(String equipmentId) {
        Equipment found = live(equipmentId);
        access.requireProjectReadAccess(found.getProjectId());
        return costs.findById(equipmentId).map(EquipmentHourlyCostService::response)
            .orElse(new EquipmentHourlyCostResponse(equipmentId, null, 0, null, null));
    }

    @Transactional
    public EquipmentHourlyCostResponse set(String equipmentId, EquipmentHourlyCostRequest request) {
        Equipment found = live(equipmentId);
        access.requireProjectWriteAccess(found.getProjectId());
        entities.refresh(found, LockModeType.PESSIMISTIC_WRITE);
        if (!"N".equals(found.getDeletedYn())) throw new BusinessException(ErrorCode.NOT_FOUND);
        BigDecimal cost = request.hourlyCost();
        if (cost != null) {
            BigDecimal normalized = cost.stripTrailingZeros();
            if (cost.signum() < 0 || normalized.scale() > 4 || normalized.precision() - normalized.scale() > 10)
                throw new BusinessException(ErrorCode.BAD_REQUEST, "hourlyCost must be nonnegative, with at most 10 whole digits and 4 decimals.");
            cost = cost.setScale(4);
        }
        if (request.expectedVersion() < 0)
            throw new BusinessException(ErrorCode.BAD_REQUEST, "expectedVersion must be a nonnegative integer.");
        String actor = access.requireCurrentUserId();
        EquipmentHourlyCost current = costs.findById(equipmentId).orElse(null);
        long version = current == null ? 0 : current.getVersion();
        if (version != request.expectedVersion()) {
            // Repeating the same acknowledged state change by its author is harmless after a lost response.
            if (current != null && version > 0 && request.expectedVersion() == version - 1
                && actor.equals(current.getUpdatedBy()) && same(cost, current.getHourlyCost())) return response(current);
            throw new BusinessException(ErrorCode.CONFLICT, "expectedVersion changed; reload the current hourlyCost before saving a different rate.");
        }
        if (version == Long.MAX_VALUE) throw new BusinessException(ErrorCode.CONFLICT, "expectedVersion has reached its limit.");
        if (current == null) { current = new EquipmentHourlyCost(); current.setEquipmentId(equipmentId); }
        current.setHourlyCost(cost);
        current.setVersion(version + 1);
        current.setUpdatedBy(actor);
        current.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return response(costs.save(current));
    }

    @Override
    public Map<String, BigDecimal> findHourlyCosts(String projectId, Collection<String> equipmentIds) {
        if (equipmentIds == null || equipmentIds.isEmpty()) return Collections.emptyMap();
        Set<String> allowed = equipment.findAllById(equipmentIds).stream()
            .filter(one -> Objects.equals(projectId, one.getProjectId()) && "N".equals(one.getDeletedYn()))
            .map(Equipment::getEquipmentId).collect(Collectors.toSet());
        Map<String, BigDecimal> result = new HashMap<>();
        costs.findAllById(allowed).forEach(one -> { if (one.getHourlyCost() != null) result.put(one.getEquipmentId(), one.getHourlyCost()); });
        return result;
    }

    private Equipment live(String id) {
        return equipment.findByEquipmentIdAndDeletedYn(id, "N").orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
    private static boolean same(BigDecimal a, BigDecimal b) { return a == null ? b == null : b != null && a.compareTo(b) == 0; }
    private static EquipmentHourlyCostResponse response(EquipmentHourlyCost cost) {
        return new EquipmentHourlyCostResponse(cost.getEquipmentId(), cost.getHourlyCost(), cost.getVersion(), cost.getUpdatedBy(), cost.getUpdatedAt());
    }
}
