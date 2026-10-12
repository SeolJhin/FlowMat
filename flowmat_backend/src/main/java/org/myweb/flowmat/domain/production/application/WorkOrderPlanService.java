package org.myweb.flowmat.domain.production.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.OptionalInt;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogEquipmentView;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogQuery;
import org.myweb.flowmat.domain.catalog.application.publicapi.EquipmentSlot;
import org.myweb.flowmat.domain.production.api.dto.request.WorkOrderBatchPlanRequest;
import org.myweb.flowmat.domain.production.api.dto.response.WorkOrderBatchPlanResponse;
import org.myweb.flowmat.domain.production.api.dto.response.WorkOrderPlanSuggestionResponse;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.production.domain.enums.WorkOrderStatus;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.production.repository.WorkOrderRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;

/**
 * Suggests a work order's planned start and end from its equipment's calendar (docs/domain/equipment-schedule.md
 * "계획 기간 제안"): the earliest stretch from a given time that holds what is still to produce at the equipment's
 * capacity per hour, plus the changeover from the order before it, and does not overlap an approved or running order
 * planned on the same equipment. Read only, like readiness; the order is not changed. Several orders can be planned in
 * one go, each after the ones before it (P8-P12).
 */
@Service
@RequiredArgsConstructor
public class WorkOrderPlanService {

    private static final String NOT_DELETED = "N";
    private static final BigDecimal SECONDS_PER_HOUR = BigDecimal.valueOf(3600);
    private static final BigDecimal MINUTES_PER_HOUR = BigDecimal.valueOf(60);
    private static final int MAX_BATCH = 50;

    private final WorkOrderRepository workOrderRepository;
    private final ProductionRunRepository productionRunRepository;
    private final CatalogQuery catalogQuery;
    private final ProjectAccessService projectAccessService;

    public WorkOrderPlanSuggestionResponse suggest(String workOrderId, String from) {
        WorkOrder order = workOrderRepository.findByWorkOrderIdAndDeletedYn(workOrderId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        projectAccessService.requireProjectReadAccess(order.getProjectId());
        OffsetDateTime requested = parseFrom(from);
        return place(order, requested != null ? requested : defaultStart(order), Set.of(order.getWorkOrderId()), List.of());
    }

    /**
     * Suggestions for several orders in the order given (P8-P11). Each is placed like a single suggestion, except that the
     * orders of the request do not count where they stand now (they are being planned again), and each one placed counts
     * as approved work in its suggested dates for the ones after it, changeover included. An order that cannot be placed
     * says why; the others go on.
     */
    public WorkOrderBatchPlanResponse suggestAll(WorkOrderBatchPlanRequest request) {
        List<WorkOrder> orders = batchOrders(request);
        OffsetDateTime requested = parseFrom(request.from());
        Set<String> batch = orders.stream().map(WorkOrder::getWorkOrderId).collect(Collectors.toUnmodifiableSet());
        List<WorkOrder> placed = new ArrayList<>();
        List<WorkOrderBatchPlanResponse.Line> lines = new ArrayList<>();
        for (WorkOrder order : orders) {
            try {
                WorkOrderPlanSuggestionResponse suggestion =
                    place(order, requested != null ? requested : defaultStart(order), batch, placed);
                placed.add(asPlanned(order, suggestion));
                lines.add(new WorkOrderBatchPlanResponse.Line(order.getWorkOrderId(), order.getWorkOrderNumber(),
                    order.getWorkOrderStatus(), suggestion, null));
            } catch (BusinessException refused) {
                if (refused.getErrorCode() != ErrorCode.CONFLICT) {
                    throw refused;
                }
                lines.add(new WorkOrderBatchPlanResponse.Line(order.getWorkOrderId(), order.getWorkOrderNumber(),
                    order.getWorkOrderStatus(), null, refused.getMessage()));
            }
        }
        return new WorkOrderBatchPlanResponse(requested, List.copyOf(lines));
    }

    /**
     * The orders of a batch request in the order given, after the project read check (P8): 1 to 50 distinct orders of the
     * project. The order suggestion (P13) takes the same request.
     */
    List<WorkOrder> batchOrders(WorkOrderBatchPlanRequest request) {
        String projectId = request == null ? null : ProductionText.trimToNull(request.projectId(), "projectId");
        if (projectId == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "projectId is required.");
        }
        projectAccessService.requireProjectReadAccess(projectId);
        List<String> ids = request.workOrderIds() == null ? List.of() : request.workOrderIds();
        if (ids.isEmpty() || ids.size() > MAX_BATCH) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Choose 1 to " + MAX_BATCH + " work orders.");
        }
        if (ids.stream().anyMatch(id -> id == null || id.isBlank()) || new HashSet<>(ids).size() != ids.size()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Name each work order once.");
        }
        List<WorkOrder> orders = new ArrayList<>();
        for (String id : ids) {
            orders.add(workOrderRepository.findByWorkOrderIdAndDeletedYn(id, NOT_DELETED)
                .filter(order -> projectId.equals(order.getProjectId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND)));
        }
        return orders;
    }

    /**
     * Places one order from {@code start} (P1-P6). Orders in {@code excluded} do not count where they stand; orders in
     * {@code placed} (suggested earlier in a batch, not saved) count as planned work on their equipment.
     */
    private WorkOrderPlanSuggestionResponse place(WorkOrder order, OffsetDateTime start, Set<String> excluded,
                                                  List<WorkOrder> placed) {
        WorkOrderStatus status = WorkOrderServiceImpl.status(order);
        if (status == WorkOrderStatus.COMPLETED || status == WorkOrderStatus.CANCELLED) {
            throw conflict(order.getWorkOrderNumber() + " is " + order.getWorkOrderStatus() + "; it is not planned any more.");
        }
        if (order.getEquipmentId() == null) {
            throw conflict("Assign equipment first; the dates follow its calendar.");
        }
        CatalogEquipmentView equipment = catalogQuery.findProjectEquipment(order.getProjectId(), order.getEquipmentId())
            .orElseThrow(() -> conflict("The assigned equipment no longer exists; assign other equipment."));
        String name = "Equipment " + equipment.label();
        if ("inactive".equals(equipment.equipmentStatus())) {
            throw conflict(name + " is inactive; assign other equipment.");
        }
        BigDecimal rate = equipment.capacityPerHour();
        if (rate == null || rate.signum() <= 0) {
            throw conflict(name + " has no capacity per hour, so how long the order takes is unknown.");
        }
        BigDecimal remaining = remainingQuantity(order);
        if (remaining == null) {
            throw conflict("Set a target quantity first.");
        }
        if (remaining.signum() <= 0) {
            throw conflict("The target quantity has already been produced.");
        }
        BigDecimal productionHours = remaining.divide(rate, 2, RoundingMode.UP);

        List<WorkOrder> others = Stream.concat(
                workOrderRepository.findAllByEquipmentIdAndDeletedYn(equipment.equipmentId(), NOT_DELETED).stream()
                    .filter(other -> !excluded.contains(other.getWorkOrderId())),
                placed.stream().filter(other -> equipment.equipmentId().equals(other.getEquipmentId())))
            .toList();
        // Drafts are not planned work yet, as in readiness's "schedule" check.
        List<WorkOrder> planned = others.stream()
            .filter(other -> WorkOrderServiceImpl.status(other).acceptsRuns())
            .filter(other -> other.getPlannedStartAt() != null && other.getPlannedEndAt() != null
                && other.getPlannedEndAt().isAfter(other.getPlannedStartAt()))
            .toList();
        List<String> movedPast = new ArrayList<>();
        OffsetDateTime cursor = start;
        // Every round moves past at least one planned order or settles the changeover, so this many rounds are enough.
        for (int round = 0; round <= 2 * planned.size() + 2; round++) {
            BigDecimal changeoverHours = changeoverHours(order, equipment, EquipmentSequence.previous(cursor, others));
            BigDecimal needed = productionHours.add(changeoverHours);
            OffsetDateTime searchFrom = cursor;
            EquipmentSlot slot = catalogQuery.earliestSlot(equipment.equipmentId(), searchFrom, seconds(needed))
                .orElseThrow(() -> conflict(name + " does not have " + plain(needed) + " h available in the 366 days from "
                    + searchFrom + "."));
            // The order before the slot can differ from the one before the search start; its changeover then decides.
            WorkOrder before = EquipmentSequence.previous(slot.start(), others);
            if (changeoverHours(order, equipment, before).compareTo(changeoverHours) != 0) {
                cursor = slot.start();
                continue;
            }
            OffsetDateTime end = wholeMinute(slot.end());
            List<WorkOrder> clashes = planned.stream()
                .filter(other -> other.getPlannedStartAt().isBefore(end) && other.getPlannedEndAt().isAfter(slot.start()))
                .sorted(Comparator.comparing(WorkOrder::getPlannedStartAt))
                .toList();
            if (clashes.isEmpty()) {
                return new WorkOrderPlanSuggestionResponse(order.getWorkOrderId(), equipment.equipmentId(), start, slot.start(),
                    end, remaining, rate, productionHours, changeoverHours, needed,
                    changeoverHours.signum() > 0 ? before.getWorkOrderNumber() : null, List.copyOf(movedPast));
            }
            clashes.stream()
                .map(WorkOrder::getWorkOrderNumber)
                .filter(number -> !movedPast.contains(number))
                .forEach(movedPast::add);
            cursor = clashes.stream().map(WorkOrder::getPlannedEndAt).max(Comparator.naturalOrder()).orElseThrow();
        }
        throw conflict("No free time found on " + name + " around the orders already planned on it.");
    }

    /** {@code from} as an instant; null when not given. */
    static OffsetDateTime parseFrom(String from) {
        if (from == null || from.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(from.trim());
        } catch (DateTimeParseException exception) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "from must be a date and time with an offset, such as 2030-01-07T09:00:00+09:00.");
        }
    }

    /** Without {@code from}: the planned start if it is still ahead, or the next whole minute. */
    private static OffsetDateTime defaultStart(WorkOrder order) {
        OffsetDateTime now = wholeMinute(OffsetDateTime.now(ZoneOffset.UTC));
        OffsetDateTime planned = order.getPlannedStartAt();
        return planned != null && planned.isAfter(now) ? planned : now;
    }

    /** An order placed in a batch, as approved work in its suggested dates for the orders placed after it (P9). Not saved. */
    private static WorkOrder asPlanned(WorkOrder order, WorkOrderPlanSuggestionResponse suggestion) {
        WorkOrder planned = new WorkOrder();
        planned.setWorkOrderId(order.getWorkOrderId());
        planned.setWorkOrderNumber(order.getWorkOrderNumber());
        planned.setProjectId(order.getProjectId());
        planned.setTargetItemId(order.getTargetItemId());
        planned.setEquipmentId(suggestion.equipmentId());
        planned.setWorkOrderStatus(WorkOrderStatus.APPROVED.code());
        planned.setPlannedStartAt(suggestion.plannedStartAt());
        planned.setPlannedEndAt(suggestion.plannedEndAt());
        return planned;
    }

    /** The changeover from what {@code previous} makes to what this order makes; zero without either item or a rule. */
    private BigDecimal changeoverHours(WorkOrder order, CatalogEquipmentView equipment, WorkOrder previous) {
        if (previous == null || order.getTargetItemId() == null) {
            return BigDecimal.ZERO;
        }
        OptionalInt minutes = catalogQuery.changeoverMinutes(equipment.equipmentId(), previous.getTargetItemId(),
            order.getTargetItemId());
        return minutes.isPresent()
            ? BigDecimal.valueOf(minutes.getAsInt()).divide(MINUTES_PER_HOUR, 2, RoundingMode.UP)
            : BigDecimal.ZERO;
    }

    /** Target quantity minus what finished runs that move stock produced; null without a target quantity. */
    private BigDecimal remainingQuantity(WorkOrder order) {
        if (order.getTargetQuantity() == null) {
            return null;
        }
        BigDecimal produced = productionRunRepository.findAllByWorkOrderIdInAndDeletedYn(List.of(order.getWorkOrderId()), NOT_DELETED)
            .stream()
            .filter(run -> run.affectsPhysicalState() && "finished".equalsIgnoreCase(run.getRunStatus()))
            .map(ProductionRun::getActualOutputQty)
            .filter(qty -> qty != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return order.getTargetQuantity().subtract(produced).max(BigDecimal.ZERO);
    }

    private static long seconds(BigDecimal hours) {
        return hours.multiply(SECONDS_PER_HOUR).setScale(0, RoundingMode.UP).longValueExact();
    }

    /** Rounded up to the minute, so the end fits a date-time field and still holds the needed time. */
    private static OffsetDateTime wholeMinute(OffsetDateTime time) {
        OffsetDateTime minute = time.truncatedTo(ChronoUnit.MINUTES);
        return minute.equals(time) ? time : minute.plusMinutes(1);
    }

    private static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private static BusinessException conflict(String message) {
        return new BusinessException(ErrorCode.CONFLICT, message);
    }
}
