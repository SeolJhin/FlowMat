package org.myweb.flowmat.domain.production.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.EquipmentChangeoverService;
import org.myweb.flowmat.domain.catalog.application.EquipmentScheduleService;
import org.myweb.flowmat.domain.catalog.domain.entity.Equipment;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.EquipmentRepository;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.production.api.dto.response.EquipmentLoadResponse;
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
 * The equipment load board (docs/domain/equipment-load.md): per equipment, the hours its calendar leaves in a window
 * against what its draft, approved and running orders need there. An order that runs past the window counts in proportion
 * to its equipment's available time inside the window. Read only, like readiness, so it has no transaction of its own.
 */
@Service
@RequiredArgsConstructor
public class EquipmentLoadService {

    /** The longest window the board covers. */
    static final Duration LONGEST_WINDOW = Duration.ofDays(92);
    private static final String NOT_DELETED = "N";
    private static final String FINISHED_RUN = "finished";
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final EquipmentRepository equipmentRepository;
    private final WorkOrderRepository workOrderRepository;
    private final ProductionRunRepository productionRunRepository;
    private final ItemRepository itemRepository;
    private final EquipmentScheduleService equipmentScheduleService;
    private final EquipmentChangeoverService equipmentChangeoverService;
    private final ProjectAccessService projectAccessService;

    public EquipmentLoadResponse load(String projectId, String from, String to) {
        if (projectId == null || projectId.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "projectId is required.");
        }
        projectAccessService.requireProjectReadAccess(projectId);
        OffsetDateTime start = dateTime(from, "from");
        OffsetDateTime end = dateTime(to, "to");
        if (!end.isAfter(start)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "to must be after from.");
        }
        if (Duration.between(start, end).compareTo(LONGEST_WINDOW) > 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The load board covers at most 92 days.");
        }

        List<WorkOrder> orders = workOrderRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtDesc(projectId, NOT_DELETED).stream()
            .filter(order -> order.getEquipmentId() != null)
            .toList();
        Map<String, BigDecimal> produced = produced(orders);
        Map<String, String> itemCodes = itemRepository.findAllById(orders.stream()
                .map(WorkOrder::getTargetItemId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet()))
            .stream().collect(Collectors.toMap(Item::getItemId, Item::getItemCode));
        Map<String, List<WorkOrder>> byEquipment = orders.stream().collect(Collectors.groupingBy(WorkOrder::getEquipmentId));

        List<EquipmentLoadResponse.Row> rows = equipmentRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtDesc(projectId, NOT_DELETED)
            .stream()
            .sorted(Comparator.comparing(EquipmentLoadService::label, String.CASE_INSENSITIVE_ORDER))
            .map(equipment -> row(equipment, byEquipment.getOrDefault(equipment.getEquipmentId(), List.of()), start, end, produced, itemCodes))
            .toList();
        return new EquipmentLoadResponse(start, end, rows);
    }

    private EquipmentLoadResponse.Row row(
        Equipment equipment,
        List<WorkOrder> mine,
        OffsetDateTime from,
        OffsetDateTime to,
        Map<String, BigDecimal> produced,
        Map<String, String> itemCodes
    ) {
        EquipmentScheduleService.Availability window = equipmentScheduleService.window(equipment, from, to);
        BigDecimal rate = equipment.getCapacityPerHour() != null && equipment.getCapacityPerHour().signum() > 0
            ? equipment.getCapacityPerHour()
            : null;
        BigDecimal planned = BigDecimal.ZERO;
        BigDecimal drafts = BigDecimal.ZERO;
        int unplanned = 0;
        int unmeasured = 0;
        List<EquipmentLoadResponse.Order> shown = new ArrayList<>();
        List<WorkOrder> sorted = mine.stream()
            .sorted(Comparator.comparing(WorkOrder::getPlannedStartAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();
        for (WorkOrder order : sorted) {
            WorkOrderStatus status = WorkOrderServiceImpl.status(order);
            if (status == WorkOrderStatus.COMPLETED || status == WorkOrderStatus.CANCELLED) {
                continue;
            }
            OffsetDateTime start = order.getPlannedStartAt();
            OffsetDateTime end = order.getPlannedEndAt();
            if (start == null || end == null || !end.isAfter(start)) {
                unplanned++;
                continue;
            }
            if (!start.isBefore(to) || !end.isAfter(from)) {
                continue;
            }
            BigDecimal remaining = order.getTargetQuantity() == null
                ? null
                : order.getTargetQuantity().subtract(produced.getOrDefault(order.getWorkOrderId(), BigDecimal.ZERO));
            Integer changeover = changeoverMinutes(equipment, order, mine);
            BigDecimal needed = neededHours(remaining, rate, changeover);
            BigDecimal inWindow = needed == null ? null : inWindow(equipment, needed, start, end, from, to);
            if (inWindow == null) {
                unmeasured++;
            } else if (status == WorkOrderStatus.DRAFT) {
                drafts = drafts.add(inWindow);
            } else {
                planned = planned.add(inWindow);
            }
            shown.add(new EquipmentLoadResponse.Order(order.getWorkOrderId(), order.getWorkOrderNumber(), order.getWorkOrderTitle(),
                order.getWorkOrderStatus(), order.getTargetItemId(), itemCodes.get(order.getTargetItemId()), start, end, remaining,
                changeover, needed, inWindow));
        }
        BigDecimal available = window.availableHours();
        BigDecimal percent = available.signum() > 0 ? planned.multiply(HUNDRED).divide(available, 1, RoundingMode.HALF_UP) : null;
        return new EquipmentLoadResponse.Row(equipment.getEquipmentId(), equipment.getEquipmentCode(), equipment.getEquipmentName(),
            equipment.getEquipmentStatus(), equipment.getCapacityPerHour(), window.calendarSet(), available, window.downtimeHours(),
            planned, drafts, percent, planned.compareTo(available) > 0, unplanned, unmeasured, shown);
    }

    /** Production time for what is left plus the changeover; null without a quantity or a capacity per hour. */
    private static BigDecimal neededHours(BigDecimal remaining, BigDecimal rate, Integer changeoverMinutes) {
        if (remaining == null || rate == null) {
            return null;
        }
        BigDecimal production = remaining.signum() > 0 ? remaining.divide(rate, 2, RoundingMode.UP) : BigDecimal.ZERO;
        BigDecimal changeover = changeoverMinutes == null
            ? BigDecimal.ZERO
            : BigDecimal.valueOf(changeoverMinutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.UP);
        return production.add(changeover);
    }

    /**
     * The part of {@code needed} that falls in [from, to): all of it when the order lies inside, otherwise in proportion to
     * the equipment's available time (or, when the order's own window has none, to clock time).
     */
    private BigDecimal inWindow(Equipment equipment, BigDecimal needed, OffsetDateTime start, OffsetDateTime end,
                                OffsetDateTime from, OffsetDateTime to) {
        if (!start.isBefore(from) && !end.isAfter(to)) {
            return needed;
        }
        OffsetDateTime partStart = start.isBefore(from) ? from : start;
        OffsetDateTime partEnd = end.isAfter(to) ? to : end;
        if (Duration.between(start, end).compareTo(EquipmentScheduleService.LONGEST_WINDOW) <= 0) {
            BigDecimal whole = equipmentScheduleService.window(equipment, start, end).availableHours();
            if (whole.signum() > 0) {
                BigDecimal part = equipmentScheduleService.window(equipment, partStart, partEnd).availableHours();
                return needed.multiply(part).divide(whole, 2, RoundingMode.HALF_UP);
            }
        }
        BigDecimal wholeSeconds = BigDecimal.valueOf(Duration.between(start, end).getSeconds());
        BigDecimal partSeconds = BigDecimal.valueOf(Duration.between(partStart, partEnd).getSeconds());
        return needed.multiply(partSeconds).divide(wholeSeconds, 2, RoundingMode.HALF_UP);
    }

    private Integer changeoverMinutes(Equipment equipment, WorkOrder order, List<WorkOrder> mine) {
        if (order.getTargetItemId() == null) {
            return null;
        }
        List<WorkOrder> others = mine.stream().filter(other -> !other.getWorkOrderId().equals(order.getWorkOrderId())).toList();
        WorkOrder previous = EquipmentSequence.previous(order.getPlannedStartAt(), others);
        if (previous == null) {
            return null;
        }
        return equipmentChangeoverService.changeover(equipment.getEquipmentId(), previous.getTargetItemId(), order.getTargetItemId())
            .map(EquipmentChangeoverService.Match::minutes)
            .orElse(null);
    }

    /** What finished runs of each order produced, the same measure as the work order list. */
    private Map<String, BigDecimal> produced(Collection<WorkOrder> orders) {
        if (orders.isEmpty()) {
            return Map.of();
        }
        Map<String, BigDecimal> produced = new HashMap<>();
        for (ProductionRun run : productionRunRepository.findAllByWorkOrderIdInAndDeletedYn(
            orders.stream().map(WorkOrder::getWorkOrderId).toList(), NOT_DELETED)) {
            if (FINISHED_RUN.equalsIgnoreCase(run.getRunStatus()) && run.getActualOutputQty() != null) {
                produced.merge(run.getWorkOrderId(), run.getActualOutputQty(), BigDecimal::add);
            }
        }
        return produced;
    }

    private static String label(Equipment equipment) {
        return equipment.getEquipmentCode() != null ? equipment.getEquipmentCode() : equipment.getEquipmentName();
    }

    private static OffsetDateTime dateTime(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, name + " is required.");
        }
        try {
            return OffsetDateTime.parse(value.trim());
        } catch (DateTimeParseException exception) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                name + " must be a date and time with an offset, such as 2030-01-07T00:00:00+09:00.");
        }
    }
}
