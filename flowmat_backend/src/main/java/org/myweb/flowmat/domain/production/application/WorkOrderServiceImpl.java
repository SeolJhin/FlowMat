package org.myweb.flowmat.domain.production.application;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.domain.entity.BomHeader;
import org.myweb.flowmat.domain.bom.domain.enums.BomStatus;
import org.myweb.flowmat.domain.bom.repository.BomHeaderRepository;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.production.api.dto.request.WorkOrderCreateRequest;
import org.myweb.flowmat.domain.production.api.dto.request.WorkOrderUpdateRequest;
import org.myweb.flowmat.domain.production.api.dto.response.WorkOrderResponse;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.production.domain.enums.WorkOrderStatus;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.production.repository.WorkOrderRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.workflow.domain.entity.Workflow;
import org.myweb.flowmat.domain.workflow.repository.WorkflowRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Work orders follow {@link WorkOrderStatus}: editors create and edit drafts and complete running orders,
 * project owners approve or cancel them. The approved → in_progress step happens when the first production
 * run is started against the order (see ProductionRunServiceImpl).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkOrderServiceImpl implements WorkOrderService {

    private static final String NOT_DELETED = "N";
    private static final String FINISHED_RUN = "finished";
    private static final Set<String> PRIORITIES = Set.of("low", "normal", "high", "urgent");
    private static final DateTimeFormatter NUMBER_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final WorkOrderRepository workOrderRepository;
    private final ProductionRunRepository productionRunRepository;
    private final WorkflowRepository workflowRepository;
    private final ItemRepository itemRepository;
    private final ProjectAccessService projectAccessService;
    private final IdGenerator idGenerator;
    private final BomHeaderRepository bomHeaderRepository;

    @Override
    public List<WorkOrderResponse> listWorkOrders(String projectId) {
        projectAccessService.requireProjectReadAccess(projectId);
        List<WorkOrder> orders = workOrderRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtDesc(projectId, NOT_DELETED);
        Map<String, List<ProductionRun>> runsByOrder = runsByWorkOrder(orders.stream().map(WorkOrder::getWorkOrderId).toList());
        return orders.stream()
            .map(order -> toResponse(order, runsByOrder.getOrDefault(order.getWorkOrderId(), List.of())))
            .toList();
    }

    @Override
    public WorkOrderResponse getWorkOrder(String workOrderId) {
        WorkOrder order = findActiveOrder(workOrderId);
        projectAccessService.requireProjectReadAccess(order.getProjectId());
        return toResponse(order);
    }

    @Override
    @Transactional
    public WorkOrderResponse createWorkOrder(WorkOrderCreateRequest request) {
        String projectId = request.projectId().trim();
        projectAccessService.requireProjectWriteAccess(projectId);

        WorkOrder order = new WorkOrder();
        order.setWorkOrderId(idGenerator.generate());
        order.setProjectId(projectId);
        order.setWorkOrderNumber(generateWorkOrderNumber());
        order.setWorkOrderStatus(WorkOrderStatus.DRAFT.code());
        applyEditableFields(order, request.workOrderTitle(), request.workflowId(), request.targetItemId(),
            request.targetQuantity(), request.priority(), request.plannedStartAt(), request.plannedEndAt(),
            request.instruction(), request.assignedTo(), request.bomId());
        order.setCreatedBy(projectAccessService.requireCurrentUserId());
        order.setDeletedYn(NOT_DELETED);
        return toResponse(workOrderRepository.save(order), List.of());
    }

    @Override
    @Transactional
    public WorkOrderResponse updateWorkOrder(String workOrderId, WorkOrderUpdateRequest request) {
        WorkOrder order = findActiveOrder(workOrderId);
        projectAccessService.requireProjectWriteAccess(order.getProjectId());
        if (status(order) != WorkOrderStatus.DRAFT) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "Only draft work orders can be edited; " + order.getWorkOrderNumber() + " is " + order.getWorkOrderStatus() + ".");
        }
        String title = request.workOrderTitle() != null && !request.workOrderTitle().isBlank()
            ? request.workOrderTitle()
            : order.getWorkOrderTitle();
        applyEditableFields(order, title, request.workflowId(), request.targetItemId(), request.targetQuantity(),
            request.priority(), request.plannedStartAt(), request.plannedEndAt(), request.instruction(), request.assignedTo(),
            request.bomId());
        order.setUpdatedBy(projectAccessService.requireCurrentUserId());
        return toResponse(workOrderRepository.save(order));
    }

    @Override
    @Transactional
    public WorkOrderResponse approveWorkOrder(String workOrderId) {
        WorkOrder order = findActiveOrder(workOrderId);
        projectAccessService.requireProjectOwnerAccess(order.getProjectId());
        // An approved order must be runnable: its BOM (if any) has to be approved too.
        if (order.getBomId() != null) {
            BomHeader bom = findBom(order, order.getBomId());
            if (!BomStatus.APPROVED.code().equals(bom.getBomStatus())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "BOM " + bom.getBomName() + " v" + bom.getBomVersion() + " is " + bom.getBomStatus()
                        + "; approve it or pick an approved revision before approving the work order.");
            }
        }
        transition(order, WorkOrderStatus.APPROVED);
        String userId = projectAccessService.requireCurrentUserId();
        OffsetDateTime now = OffsetDateTime.now();
        order.setApprovedBy(userId);
        order.setApprovedAt(now);
        order.setIssuedBy(userId);
        order.setIssuedAt(now);
        return toResponse(workOrderRepository.save(order));
    }

    @Override
    @Transactional
    public WorkOrderResponse cancelWorkOrder(String workOrderId) {
        WorkOrder order = findActiveOrder(workOrderId);
        projectAccessService.requireProjectOwnerAccess(order.getProjectId());
        transition(order, WorkOrderStatus.CANCELLED);
        order.setUpdatedBy(projectAccessService.requireCurrentUserId());
        return toResponse(workOrderRepository.save(order));
    }

    @Override
    @Transactional
    public WorkOrderResponse completeWorkOrder(String workOrderId) {
        WorkOrder order = findActiveOrder(workOrderId);
        projectAccessService.requireProjectWriteAccess(order.getProjectId());
        List<ProductionRun> runs = productionRunRepository.findAllByWorkOrderIdInAndDeletedYn(List.of(workOrderId), NOT_DELETED);
        if (runs.stream().anyMatch(run -> !FINISHED_RUN.equalsIgnoreCase(run.getRunStatus()))) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Finish every production run of this work order first.");
        }
        transition(order, WorkOrderStatus.COMPLETED);
        order.setActualEndAt(OffsetDateTime.now());
        order.setUpdatedBy(projectAccessService.requireCurrentUserId());
        return toResponse(workOrderRepository.save(order), runs);
    }

    private void applyEditableFields(
        WorkOrder order,
        String title,
        String workflowId,
        String targetItemId,
        BigDecimal targetQuantity,
        String priority,
        OffsetDateTime plannedStartAt,
        OffsetDateTime plannedEndAt,
        String instruction,
        String assignedTo,
        String bomId
    ) {
        if (title == null || title.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Work order title is required.");
        }
        order.setWorkOrderTitle(title.trim());

        String normalizedWorkflowId = trimToNull(workflowId);
        if (normalizedWorkflowId != null) {
            Workflow workflow = workflowRepository.findByWorkflowIdAndDeletedYn(normalizedWorkflowId, NOT_DELETED)
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "Workflow does not exist."));
            requireSameProject(order, workflow.getProjectId());
        }
        order.setWorkflowId(normalizedWorkflowId);

        String normalizedItemId = trimToNull(targetItemId);
        if (normalizedItemId != null) {
            Item item = itemRepository.findByItemIdAndDeletedYn(normalizedItemId, NOT_DELETED)
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "Target item does not exist."));
            requireSameProject(order, item.getProjectId());
        }
        order.setTargetItemId(normalizedItemId);

        // The BOM must make the order's product; an order without a product takes the BOM's.
        String normalizedBomId = trimToNull(bomId);
        if (normalizedBomId != null) {
            BomHeader bom = findBom(order, normalizedBomId);
            if (BomStatus.RETIRED.code().equals(bom.getBomStatus())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "BOM " + bom.getBomName() + " v" + bom.getBomVersion() + " is retired; pick a current revision.");
            }
            if (normalizedItemId == null) {
                order.setTargetItemId(bom.getTargetItemId());
            } else if (!normalizedItemId.equals(bom.getTargetItemId())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "The BOM produces a different item than this work order.");
            }
        }
        order.setBomId(normalizedBomId);

        if (targetQuantity != null && targetQuantity.signum() <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Target quantity must be greater than 0.");
        }
        order.setTargetQuantity(targetQuantity);

        String normalizedPriority = priority == null || priority.isBlank() ? "normal" : priority.trim().toLowerCase();
        if (!PRIORITIES.contains(normalizedPriority)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Priority must be one of low, normal, high, urgent.");
        }
        order.setPriority(normalizedPriority);

        if (plannedStartAt != null && plannedEndAt != null && plannedEndAt.isBefore(plannedStartAt)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Planned end must not be before planned start.");
        }
        order.setPlannedStartAt(plannedStartAt);
        order.setPlannedEndAt(plannedEndAt);
        order.setInstruction(trimToNull(instruction));
        order.setAssignedTo(trimToNull(assignedTo));
    }

    static void transition(WorkOrder order, WorkOrderStatus next) {
        WorkOrderStatus current = status(order);
        if (!current.canTransitionTo(next)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "Work order " + order.getWorkOrderNumber() + " cannot move from " + current.code() + " to " + next.code() + ".");
        }
        order.setWorkOrderStatus(next.code());
    }

    static WorkOrderStatus status(WorkOrder order) {
        return WorkOrderStatus.fromCode(order.getWorkOrderStatus());
    }

    private static void requireSameProject(WorkOrder order, String projectId) {
        if (!order.getProjectId().equals(projectId)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Referenced records must belong to the same project.");
        }
    }

    private BomHeader findBom(WorkOrder order, String bomId) {
        BomHeader bom = bomHeaderRepository.findByBomIdAndDeletedYn(bomId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "BOM does not exist."));
        requireSameProject(order, bom.getProjectId());
        return bom;
    }

    private WorkOrder findActiveOrder(String workOrderId) {
        return workOrderRepository.findByWorkOrderIdAndDeletedYn(workOrderId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private Map<String, List<ProductionRun>> runsByWorkOrder(Collection<String> workOrderIds) {
        if (workOrderIds.isEmpty()) {
            return Map.of();
        }
        return productionRunRepository.findAllByWorkOrderIdInAndDeletedYn(workOrderIds, NOT_DELETED).stream()
            .collect(Collectors.groupingBy(ProductionRun::getWorkOrderId));
    }

    private String generateWorkOrderNumber() {
        String prefix = "WO-" + OffsetDateTime.now().format(NUMBER_DATE) + "-";
        for (int attempt = 0; attempt < 5; attempt++) {
            String candidate = prefix + ThreadLocalRandom.current().nextInt(1000, 10000);
            if (!workOrderRepository.existsByWorkOrderNumber(candidate)) {
                return candidate;
            }
        }
        return prefix + idGenerator.generate().substring(0, 8);
    }

    private WorkOrderResponse toResponse(WorkOrder order) {
        return toResponse(order, runsByWorkOrder(List.of(order.getWorkOrderId())).getOrDefault(order.getWorkOrderId(), List.of()));
    }

    static WorkOrderResponse toResponse(WorkOrder order, List<ProductionRun> runs) {
        BigDecimal produced = runs.stream()
            .filter(run -> FINISHED_RUN.equalsIgnoreCase(run.getRunStatus()))
            .map(ProductionRun::getActualOutputQty)
            .filter(qty -> qty != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new WorkOrderResponse(
            order.getWorkOrderId(),
            order.getProjectId(),
            order.getWorkflowId(),
            order.getWorkOrderNumber(),
            order.getWorkOrderTitle(),
            order.getWorkOrderStatus(),
            order.getPriority(),
            order.getTargetItemId(),
            order.getTargetQuantity(),
            order.getPlannedStartAt(),
            order.getPlannedEndAt(),
            order.getActualStartAt(),
            order.getActualEndAt(),
            order.getInstruction(),
            order.getAssignedTo(),
            order.getApprovedBy(),
            order.getApprovedAt(),
            produced,
            runs.size(),
            order.getBomId()
        );
    }

    private static String trimToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }
}
