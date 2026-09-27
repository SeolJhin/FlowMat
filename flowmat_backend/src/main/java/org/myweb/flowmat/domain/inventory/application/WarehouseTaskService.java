package org.myweb.flowmat.domain.inventory.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.api.dto.response.BomRequirementResponse;
import org.myweb.flowmat.domain.bom.application.BomService;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.inventory.api.dto.request.InventoryTransferRequest;
import org.myweb.flowmat.domain.inventory.api.dto.request.PickListRequest;
import org.myweb.flowmat.domain.inventory.api.dto.request.WarehouseTaskCreateRequest;
import org.myweb.flowmat.domain.inventory.api.dto.response.PickListResponse;
import org.myweb.flowmat.domain.inventory.api.dto.response.WarehouseTaskResponse;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.myweb.flowmat.domain.inventory.domain.entity.WarehouseTask;
import org.myweb.flowmat.domain.inventory.domain.enums.LotStatus;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.LotMasterRepository;
import org.myweb.flowmat.domain.inventory.repository.WarehouseTaskRepository;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.production.domain.enums.WorkOrderStatus;
import org.myweb.flowmat.domain.production.repository.WorkOrderRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Warehouse tasks (docs/domain/warehouse-task.md, benchmark FM-WMS-002): putaways and picks plan moving part of a stock
 * record to a place; doing one records an ordinary transfer ({@link InventoryTransferService}), so quantities still
 * change only through the stock commands. A pick list plans picks to a staging place for a work order's materials,
 * first-expiring LOTs first, leaving out stock already at the staging place or already planned.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WarehouseTaskService {

    private static final String OPEN = "open";
    private static final String NOT_DELETED = "N";
    private static final String AVAILABLE = "available";

    private final WarehouseTaskRepository taskRepository;
    private final InventoryRepository inventoryRepository;
    private final ItemRepository itemRepository;
    private final LotMasterRepository lotMasterRepository;
    private final WorkOrderRepository workOrderRepository;
    private final BomService bomService;
    private final StorageLocationService storageLocationService;
    private final InventoryTransferService inventoryTransferService;
    private final ProjectAccessService projectAccessService;
    private final IdGenerator idGenerator;

    /** Newest first; one status and one work order only when asked. */
    public List<WarehouseTaskResponse> list(String projectId, String status, String workOrderId) {
        String project = required(projectId, "projectId");
        projectAccessService.requireProjectReadAccess(project);
        String statusFilter = trimToNull(status);
        String orderFilter = trimToNull(workOrderId);
        return responses(taskRepository.findAllByProjectIdOrderByCreatedAtDesc(project).stream()
            .filter(task -> statusFilter == null || statusFilter.equals(task.getStatus()))
            .filter(task -> orderFilter == null || orderFilter.equals(task.getWorkOrderId()))
            .toList());
    }

    @Transactional
    public WarehouseTaskResponse create(WarehouseTaskCreateRequest request) {
        String projectId = required(request.projectId(), "projectId");
        projectAccessService.requireProjectWriteAccess(projectId);
        String type = trimToNull(request.taskType()) == null ? "putaway" : request.taskType().trim().toLowerCase(Locale.ROOT);
        if (!type.equals("putaway") && !type.equals("pick")) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "taskType must be putaway or pick.");
        }
        taskRepository.lockKey("warehouse-task|" + projectId);
        Inventory row = inventoryRepository.findByInventoryIdAndDeletedYn(required(request.inventoryId(), "inventoryId"), NOT_DELETED)
            .filter(found -> projectId.equals(found.getProjectId()))
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "The stock record was not found in this project."));
        String to = destination(projectId, request.toLocation());
        if (to.equalsIgnoreCase(Objects.toString(trimToNull(row.getLocation()), ""))) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The stock is already at " + to + ".");
        }
        BigDecimal planned = plannedByRecord(projectId).getOrDefault(row.getInventoryId(), BigDecimal.ZERO);
        BigDecimal free = row.getAvailableQuantity().subtract(planned);
        if (request.quantity().compareTo(free) > 0) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only " + plain(free.max(BigDecimal.ZERO)) + " of this record is free to move ("
                + plain(row.getAvailableQuantity()) + " available, " + plain(planned) + " already in open tasks).");
        }
        WarehouseTask task = task(projectId, type, row, request.quantity(), to, null, trimToNull(request.note()));
        return responses(List.of(taskRepository.saveAndFlush(task))).get(0);
    }

    @Transactional
    public PickListResponse pickList(PickListRequest request) {
        String projectId = required(request.projectId(), "projectId");
        projectAccessService.requireProjectWriteAccess(projectId);
        taskRepository.lockKey("warehouse-task|" + projectId);
        String staging = destination(projectId, request.stagingLocation());
        WorkOrder order = null;
        Map<String, BigDecimal> needs = new LinkedHashMap<>();
        List<PickListRequest.Line> lines = request.lines() == null ? List.of() : request.lines();
        if (trimToNull(request.workOrderId()) != null) {
            if (!lines.isEmpty()) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "Give a work order or lines to pick, not both.");
            }
            order = workOrderRepository.findByWorkOrderIdAndDeletedYn(request.workOrderId().trim(), NOT_DELETED)
                .filter(found -> projectId.equals(found.getProjectId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "The work order was not found in this project."));
            if (!WorkOrderStatus.fromCode(order.getWorkOrderStatus()).acceptsRuns()) {
                throw new BusinessException(ErrorCode.CONFLICT, "Work order " + order.getWorkOrderNumber() + " is "
                    + order.getWorkOrderStatus() + "; pick for an approved or started order.");
            }
            if (order.getBomId() == null || order.getTargetQuantity() == null) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "Work order " + order.getWorkOrderNumber() + " has no BOM and quantity to pick for.");
            }
            BigDecimal quantity = request.quantity() != null ? request.quantity() : order.getTargetQuantity();
            BomRequirementResponse requirement = bomService.requirementsForRun(order.getBomId(), projectId, order.getTargetItemId(), quantity);
            for (BomRequirementResponse.Line line : requirement.lines()) {
                needs.merge(line.childItemId(), line.requiredItemQuantity(), BigDecimal::add);
            }
        } else {
            if (lines.isEmpty()) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "Give a work order or the lines to pick.");
            }
            for (PickListRequest.Line line : lines) {
                needs.merge(line.itemId().trim(), line.quantity(), BigDecimal::add);
            }
        }

        Map<String, BigDecimal> plannedByRecord = plannedByRecord(projectId);
        List<WarehouseTask> openPicks = taskRepository.findAllByProjectIdAndStatus(projectId, OPEN).stream()
            .filter(task -> "pick".equals(task.getTaskType()) && staging.equalsIgnoreCase(task.getToLocation()))
            .toList();
        String note = trimToNull(request.note());
        List<WarehouseTask> created = new ArrayList<>();
        List<PickListResponse.Line> summary = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (Map.Entry<String, BigDecimal> need : needs.entrySet()) {
            Item item = itemRepository.findByItemIdAndDeletedYn(need.getKey(), NOT_DELETED)
                .filter(found -> projectId.equals(found.getProjectId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "An item to pick was not found in this project."));
            // Locked in id order, so a movement that would drain a record this plan counts on waits for it.
            List<Inventory> rows = inventoryRepository.findAllById(inventoryRepository.lockItemStock(projectId, item.getItemId()));
            BigDecimal atStaging = rows.stream()
                .filter(row -> staging.equalsIgnoreCase(Objects.toString(trimToNull(row.getLocation()), "")))
                .filter(row -> AVAILABLE.equals(row.getInventoryStatus()))
                .map(Inventory::getAvailableQuantity).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal alreadyPlanned = openPicks.stream().filter(task -> item.getItemId().equals(task.getItemId()))
                .map(WarehouseTask::getQuantity).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal remaining = need.getValue().subtract(atStaging).subtract(alreadyPlanned);
            BigDecimal plannedNow = BigDecimal.ZERO;
            for (Inventory row : candidates(rows, staging, today)) {
                if (remaining.signum() <= 0) {
                    break;
                }
                BigDecimal free = row.getAvailableQuantity().subtract(plannedByRecord.getOrDefault(row.getInventoryId(), BigDecimal.ZERO));
                if (free.signum() <= 0) {
                    continue;
                }
                BigDecimal piece = free.min(remaining);
                created.add(taskRepository.saveAndFlush(task(projectId, "pick", row, piece, staging,
                    order == null ? null : order.getWorkOrderId(), note)));
                plannedByRecord.merge(row.getInventoryId(), piece, BigDecimal::add);
                plannedNow = plannedNow.add(piece);
                remaining = remaining.subtract(piece);
            }
            summary.add(new PickListResponse.Line(item.getItemId(), item.getItemCode(), need.getValue(), atStaging, alreadyPlanned,
                plannedNow, remaining.max(BigDecimal.ZERO)));
        }
        return new PickListResponse(responses(created), summary);
    }

    /** Does the task: an ordinary transfer of its quantity to its place, which it then points to. */
    @Transactional
    public WarehouseTaskResponse complete(String taskId) {
        WarehouseTask task = lockOpen(taskId);
        String transferId = inventoryTransferService.transfer(new InventoryTransferRequest(
            task.getInventoryId(), task.getToLocation(), task.getQuantity(), "warehouse-task:" + task.getTaskId(),
            "Task " + task.getTaskNo())).transferId();
        task.setStatus("done");
        task.setTransferId(transferId);
        task.setFinishedBy(projectAccessService.requireCurrentUserId());
        task.setFinishedAt(OffsetDateTime.now());
        return responses(List.of(taskRepository.saveAndFlush(task))).get(0);
    }

    @Transactional
    public WarehouseTaskResponse cancel(String taskId, String reason) {
        WarehouseTask task = lockOpen(taskId);
        String text = trimToNull(reason);
        if (text == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Say why the task is cancelled.");
        }
        task.setStatus("cancelled");
        task.setCancelReason(text);
        task.setFinishedBy(projectAccessService.requireCurrentUserId());
        task.setFinishedAt(OffsetDateTime.now());
        return responses(List.of(taskRepository.saveAndFlush(task))).get(0);
    }

    /**
     * Records to pick from, best first: usable (available status, stock free, LOT open and not expired), not already at
     * the staging place; LOTs expiring first, then the oldest record.
     */
    private List<Inventory> candidates(List<Inventory> rows, String staging, LocalDate today) {
        Map<String, LotMaster> lots = lotMasterRepository.findAllById(rows.stream().map(Inventory::getLotId).filter(Objects::nonNull).distinct().toList())
            .stream().collect(Collectors.toMap(LotMaster::getLotId, Function.identity()));
        return rows.stream()
            .filter(row -> !staging.equalsIgnoreCase(Objects.toString(trimToNull(row.getLocation()), "")))
            .filter(row -> AVAILABLE.equals(row.getInventoryStatus()))
            .filter(row -> row.getAvailableQuantity() != null && row.getAvailableQuantity().signum() > 0)
            .filter(row -> {
                LotMaster lot = row.getLotId() == null ? null : lots.get(row.getLotId());
                return row.getLotId() == null || (lot != null && LotStatus.fromCode(lot.getLotStatus()).usable() && !lot.isExpiredOn(today));
            })
            .sorted(Comparator
                .comparing((Inventory row) -> row.getLotId() == null ? null : lots.get(row.getLotId()).getExpiryDate(),
                    Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(Inventory::getCreatedAt, Comparator.nullsLast(Comparator.<OffsetDateTime>naturalOrder()))
                .thenComparing(Inventory::getInventoryId))
            .toList();
    }

    private WarehouseTask task(String projectId, String type, Inventory row, BigDecimal quantity, String to, String workOrderId, String note) {
        WarehouseTask task = new WarehouseTask();
        task.setTaskId(idGenerator.generate());
        task.setProjectId(projectId);
        task.setTaskNo(String.format(Locale.ROOT, "WT-%04d", taskRepository.countByProjectId(projectId) + 1));
        task.setTaskType(type);
        task.setStatus(OPEN);
        task.setInventoryId(row.getInventoryId());
        task.setItemId(row.getItemId());
        task.setLotId(row.getLotId());
        task.setQuantity(quantity);
        task.setFromLocation(trimToNull(row.getLocation()));
        task.setToLocation(to);
        task.setWorkOrderId(workOrderId);
        task.setNote(note);
        task.setCreatedBy(projectAccessService.requireCurrentUserId());
        task.setCreatedAt(OffsetDateTime.now());
        return task;
    }

    /** A place is needed; with a location list it must be an active listed place, spelled as listed. */
    private String destination(String projectId, String location) {
        String to = storageLocationService.resolveForStock(projectId, location);
        if (to == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Say where the stock goes.");
        }
        return to;
    }

    private Map<String, BigDecimal> plannedByRecord(String projectId) {
        Map<String, BigDecimal> planned = new HashMap<>();
        for (WarehouseTask task : taskRepository.findAllByProjectIdAndStatus(projectId, OPEN)) {
            planned.merge(task.getInventoryId(), task.getQuantity(), BigDecimal::add);
        }
        return planned;
    }

    private WarehouseTask lockOpen(String taskId) {
        WarehouseTask task = taskRepository.findForUpdate(required(taskId, "taskId"))
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        projectAccessService.requireProjectWriteAccess(task.getProjectId());
        if (!OPEN.equals(task.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Task " + task.getTaskNo() + " is already " + task.getStatus() + ".");
        }
        return task;
    }

    private List<WarehouseTaskResponse> responses(List<WarehouseTask> tasks) {
        Map<String, Item> items = byId(itemRepository.findAllById(distinct(tasks.stream().map(WarehouseTask::getItemId))), Item::getItemId);
        Map<String, LotMaster> lots = byId(lotMasterRepository.findAllById(distinct(tasks.stream().map(WarehouseTask::getLotId))), LotMaster::getLotId);
        Map<String, WorkOrder> orders = byId(workOrderRepository.findAllById(distinct(tasks.stream().map(WarehouseTask::getWorkOrderId))),
            WorkOrder::getWorkOrderId);
        return tasks.stream().map(task -> {
            Item item = items.get(task.getItemId());
            LotMaster lot = lots.get(task.getLotId());
            WorkOrder order = orders.get(task.getWorkOrderId());
            return new WarehouseTaskResponse(
                task.getTaskId(), task.getProjectId(), task.getTaskNo(), task.getTaskType(), task.getStatus(), task.getInventoryId(),
                task.getItemId(), item == null ? null : item.getItemCode(), item == null ? null : item.getItemName(),
                task.getLotId(), lot == null ? null : lot.getLotNo(), task.getQuantity(), task.getFromLocation(), task.getToLocation(),
                task.getWorkOrderId(), order == null ? null : order.getWorkOrderNumber(), task.getNote(), task.getCreatedBy(),
                task.getCreatedAt(), task.getFinishedBy(), task.getFinishedAt(), task.getTransferId(), task.getCancelReason());
        }).toList();
    }

    private static <T> Map<String, T> byId(Iterable<T> found, Function<T, String> id) {
        return StreamSupport.stream(found.spliterator(), false).collect(Collectors.toMap(id, Function.identity(), (a, b) -> a));
    }

    private static Collection<String> distinct(Stream<String> ids) {
        return ids.filter(Objects::nonNull).collect(Collectors.toSet());
    }

    private static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private static String required(String value, String field) {
        String text = trimToNull(value);
        if (text == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, field + " is required.");
        }
        return text;
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
