package org.myweb.flowmat.domain.production.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.api.dto.response.BomRequirementResponse;
import org.myweb.flowmat.domain.bom.application.BomService;
import org.myweb.flowmat.domain.catalog.application.UnitConverter;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.inventory.application.InventoryCommandService;
import org.myweb.flowmat.domain.inventory.application.InventoryMovement;
import org.myweb.flowmat.domain.inventory.application.LotService;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.enums.InventoryTransactionType;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunFinishRequest;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunItemRecordRequest;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunStartRequest;
import org.myweb.flowmat.domain.production.api.dto.response.ProductionRunItemResponse;
import org.myweb.flowmat.domain.production.api.dto.response.ProductionRunResponse;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRunItem;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.production.domain.enums.WorkOrderStatus;
import org.myweb.flowmat.domain.production.repository.ProductionRunItemRepository;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.production.repository.WorkOrderRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.rule.application.FlowRuleEngineService;
import org.myweb.flowmat.domain.rule.application.RuleEvaluationContext;
import org.myweb.flowmat.domain.rule.application.RuleTarget;
import org.myweb.flowmat.domain.workflow.domain.entity.Process;
import org.myweb.flowmat.domain.workflow.domain.entity.ProcessIo;
import org.myweb.flowmat.domain.workflow.domain.entity.Workflow;
import org.myweb.flowmat.domain.workflow.domain.entity.WorkflowRevision;
import org.myweb.flowmat.domain.workflow.repository.ProcessIoRepository;
import org.myweb.flowmat.domain.workflow.repository.ProcessRepository;
import org.myweb.flowmat.domain.workflow.repository.WorkflowRepository;
import org.myweb.flowmat.domain.workflow.repository.WorkflowRevisionRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductionRunServiceImpl implements ProductionRunService {

    private static final String NOT_DELETED = "N";
    private static final Set<String> OPEN_RUN_STATUSES = Set.of("pending", "running");
    private static final Set<String> RUN_ITEM_DIRECTIONS = Set.of("input", "output");

    private final ProductionRunRepository productionRunRepository;
    private final ProductionRunItemRepository productionRunItemRepository;
    private final ProjectAccessService projectAccessService;
    private final WorkflowRepository workflowRepository;
    private final WorkflowRevisionRepository workflowRevisionRepository;
    private final ObjectMapper objectMapper;
    private final ProcessRepository processRepository;
    private final ProcessIoRepository processIoRepository;
    private final ItemRepository itemRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryCommandService inventoryCommandService;
    private final FlowRuleEngineService flowRuleEngineService;
    private final IdGenerator idGenerator;
    private final WorkOrderRepository workOrderRepository;
    private final UnitConverter unitConverter;
    private final BomService bomService;
    private final LotService lotService;
    private final ProductionFlowRunAdapter productionFlowRunAdapter;

    @Override
    public List<ProductionRunResponse> listRuns(String workflowId) {
        projectAccessService.requireWorkflowReadAccess(workflowId);
        return productionRunRepository.findAllByWorkflowIdAndDeletedYnOrderByCreatedAtDesc(workflowId, NOT_DELETED)
            .stream()
            .map(ProductionRunServiceImpl::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public ProductionRunResponse startRun(ProductionRunStartRequest request) {
        projectAccessService.requireProjectWriteAccess(request.projectId());
        Workflow workflow = findActiveWorkflow(request.workflowId());
        validateSameProject(request.projectId(), workflow.getProjectId());
        WorkflowRevision workflowRevision = resolveWorkflowRevision(workflow.getWorkflowId(), request.workflowRevisionId());
        WorkOrder workOrder = findRunnableWorkOrder(request.workOrderId(), request.projectId(), workflow);
        String targetItemId = trimToNull(request.targetItemId());
        if (targetItemId == null && workOrder != null) {
            targetItemId = workOrder.getTargetItemId();
        }
        Item item = null;
        if (targetItemId != null) {
            item = findActiveItem(targetItemId);
            validateSameProject(request.projectId(), item.getProjectId());
        }
        evaluateRunStartRules(request, workflow, item);

        // Freeze the BOM now: later revisions or retirement must not change what this run planned to consume.
        String bomId = trimToNull(request.bomId());
        if (bomId == null && workOrder != null) {
            bomId = trimToNull(workOrder.getBomId());
        }
        BomRequirementResponse bom = bomId == null
            ? null
            : bomService.requirementsForRun(bomId, request.projectId().trim(), targetItemId, request.plannedOutputQty());
        if (bom != null && targetItemId == null) {
            targetItemId = bom.targetItemId();
        }

        if (workOrder != null && WorkOrderServiceImpl.status(workOrder) == WorkOrderStatus.APPROVED) {
            // The first run against an approved order starts it.
            WorkOrderServiceImpl.transition(workOrder, WorkOrderStatus.IN_PROGRESS);
            workOrder.setActualStartAt(OffsetDateTime.now());
            workOrderRepository.save(workOrder);
        }

        ProductionRun run = new ProductionRun();
        run.setProductionRunId(idGenerator.generate());
        run.setProjectId(request.projectId().trim());
        run.setWorkflowId(workflow.getWorkflowId());
        run.setWorkflowRevisionId(workflowRevision != null ? workflowRevision.getWorkflowRevisionId() : null);
        run.setRunNumber(generateRunNumber());
        run.setRunType(defaultIfBlank(request.runType(), "actual"));
        run.setRunStatus("running");
        run.setTargetItemId(targetItemId);
        run.setWorkOrderId(workOrder != null ? workOrder.getWorkOrderId() : null);
        run.setPlannedOutputQty(request.plannedOutputQty());
        run.setActualOutputQty(BigDecimal.ZERO);
        // Audit fields come from the authenticated user, never from the request body.
        run.setStartedBy(projectAccessService.requireCurrentUserId());
        run.setDeletedYn(NOT_DELETED);
        if (bom != null) {
            run.setBomId(bom.bomId());
            run.setBomVersion(bom.bomVersion());
            run.setBomBaseQuantity(bom.baseQuantity());
        }
        ProductionRun savedRun = productionRunRepository.save(run);
        productionFlowRunAdapter.onStarted(savedRun);

        if (bom != null) {
            for (BomRequirementResponse.Line line : bom.lines()) {
                ProductionRunItem planned = new ProductionRunItem();
                planned.setProductionRunItemId(idGenerator.generate());
                planned.setProductionRunId(savedRun.getProductionRunId());
                planned.setItemId(line.childItemId());
                planned.setDirection("input");
                planned.setPlannedQty(line.requiredItemQuantity());
                planned.setUnit(line.itemUnit());
                planned.setConversionRate(line.conversionRate());
                planned.setQuantitySource("bom");
                productionRunItemRepository.save(planned);
            }
        }
        return toResponse(savedRun);
    }

    @Override
    public ProductionRunResponse getRun(String productionRunId) {
        ProductionRun run = findActiveRun(productionRunId);
        projectAccessService.requireProjectReadAccess(run.getProjectId());
        return toResponse(run);
    }

    @Override
    public List<ProductionRunItemResponse> listRunItems(String productionRunId) {
        ProductionRun run = findActiveRun(productionRunId);
        projectAccessService.requireProjectReadAccess(run.getProjectId());
        return productionRunItemRepository.findAllByProductionRunIdOrderByProductionRunItemIdAsc(productionRunId).stream()
            .map(ProductionRunServiceImpl::toItemResponse)
            .toList();
    }

    @Override
    @Transactional
    public ProductionRunItemResponse recordRunItem(String productionRunId, ProductionRunItemRecordRequest request) {
        ProductionRun run = findActiveRun(productionRunId);
        projectAccessService.requireProjectWriteAccess(run.getProjectId());
        requireOpenRun(run);
        requireKnownDirection(request.direction());
        Item item = findActiveItem(request.itemId());
        validateSameProject(run.getProjectId(), item.getProjectId());
        Inventory inventory = null;
        RunProcessSelection selection = resolveRunProcessSelection(run, request);
        Process process = selection.process();
        ProcessIo processIo = selection.processIo();
        if (request.inventoryId() != null && !request.inventoryId().isBlank()) {
            inventory = findActiveInventory(request.inventoryId());
            validateSameProject(run.getProjectId(), inventory.getProjectId());
            if (!item.getItemId().equals(inventory.getItemId())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "The selected stock record holds a different item.");
            }
        }
        // LOT-tracked items are only consumed or produced through an explicit LOT (its stock record).
        if ("Y".equals(item.getLotManageYn()) && inventory == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                item.getItemCode() + " is LOT-tracked; choose the stock record (LOT) this " + request.direction().trim().toLowerCase()
                    + " uses.");
        }

        // Reject incompatible units before anything is saved, even when no stock record is linked.
        BigDecimal recordedQty = request.actualQty() != null ? request.actualQty() : request.plannedQty();
        UnitConverter.Conversion conversion = unitConverter.toItemUnit(recordedQty, request.unit(), item.getUnitId());

        evaluateRunItemRules(run, request, item, process, processIo, inventory);

        ProductionRunItem runItem = new ProductionRunItem();
        runItem.setProductionRunItemId(idGenerator.generate());
        runItem.setProductionRunId(run.getProductionRunId());
        runItem.setProcessId(process != null ? process.getProcessId() : null);
        runItem.setProcessIoId(processIo != null ? processIo.getProcessIoId() : null);
        runItem.setInventoryId(trimToNull(request.inventoryId()));
        runItem.setItemId(item.getItemId());
        runItem.setDirection(request.direction().trim().toLowerCase());
        runItem.setPlannedQty(request.plannedQty());
        runItem.setActualQty(request.actualQty());
        runItem.setUnit(request.unit().trim());
        runItem.setQuantitySource("manual");
        runItem.setLotId(inventory != null ? inventory.getLotId() : null);
        ProductionRunItem savedRunItem = productionRunItemRepository.save(runItem);

        if (inventory != null) {
            applyInventoryEffect(run, savedRunItem, inventory, conversion);
        }
        if (savedRunItem.getLotId() != null) {
            linkLotGenealogy(run, savedRunItem);
        }

        return toItemResponse(savedRunItem);
    }

    @Override
    @Transactional
    public ProductionRunItemResponse cancelRunItem(String productionRunId, String productionRunItemId, String reason) {
        ProductionRun run = findActiveRun(productionRunId);
        projectAccessService.requireProjectWriteAccess(run.getProjectId());
        requireOpenRun(run);
        ProductionRunItem item = productionRunItemRepository.findById(productionRunItemId)
            .filter(found -> found.getProductionRunId().equals(run.getProductionRunId()))
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if ("bom".equals(item.getQuantitySource())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "BOM plan lines are the plan, not a recording; there is nothing to cancel.");
        }
        if (item.isCancelled()) {
            throw new BusinessException(ErrorCode.CONFLICT, "This item was already cancelled by " + item.getCancelledBy() + ".");
        }
        if (reason == null || reason.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Give a reason for cancelling the item.");
        }
        String actor = projectAccessService.requireCurrentUserId();

        // Stock first: if the produced stock was already used, the reversal fails and nothing else changes.
        inventoryCommandService.reverseMovementsOf("production_run_item", item.getProductionRunItemId(),
            "Run " + run.getRunNumber() + " item cancelled: " + reason.trim(), actor);

        item.setCancelledYn("Y");
        item.setCancelledBy(actor);
        item.setCancelledAt(OffsetDateTime.now());
        item.setCancelReason(reason.trim());
        ProductionRunItem saved = productionRunItemRepository.save(item);

        if (saved.getLotId() != null) {
            rebuildLotGenealogy(run, saved);
        }
        return toItemResponse(saved);
    }

    private void rebuildLotGenealogy(ProductionRun run, ProductionRunItem cancelled) {
        rebuildLotGenealogy(run, "output".equals(cancelled.getDirection()) ? List.of(cancelled.getLotId()) : List.of());
    }

    /**
     * Drops the run's genealogy and links the remaining (not cancelled) input and output LOTs again. LOTs the run used to
     * produce lose their "produced by this run" mark when no remaining output makes them.
     */
    @Transactional
    public void rebuildLotGenealogy(ProductionRun run, Collection<String> formerOutputLotIds) {
        lotService.clearRunTrace(run.getProductionRunId());
        List<ProductionRunItem> active = productionRunItemRepository
            .findAllByProductionRunIdOrderByProductionRunItemIdAsc(run.getProductionRunId()).stream()
            .filter(candidate -> candidate.getLotId() != null && !candidate.isCancelled())
            .toList();
        for (ProductionRunItem output : active) {
            if ("output".equals(output.getDirection())) {
                linkLotGenealogy(run, output);
            }
        }
        for (String lotId : formerOutputLotIds) {
            boolean stillProduced = active.stream()
                .anyMatch(candidate -> "output".equals(candidate.getDirection()) && candidate.getLotId().equals(lotId));
            if (!stillProduced) {
                lotService.clearProducedBy(lotId, run.getProductionRunId());
            }
        }
    }

    // ---- Finished-run corrections (ProductionRunCorrectionServiceImpl, docs/domain/production-run-correction.md) ----

    /**
     * Checks an add_item correction line like a recording (item, stock record, LOT, unit) without saving anything. Flow
     * rules are not evaluated for corrections (§9 Q7).
     */
    public void validateCorrectionRecording(ProductionRun run, String direction, String itemId, String inventoryId, BigDecimal qty,
        String unit) {
        resolveCorrectionRecording(run, direction, itemId, inventoryId, qty, unit);
    }

    /** Records an add_item line as a new run item (quantity_source = correction) and moves its stock. */
    @Transactional
    public ProductionRunItem recordCorrectionItem(ProductionRun run, String correctionId, String direction, String itemId,
        String inventoryId, BigDecimal qty, String unit) {
        CorrectionRecording resolved = resolveCorrectionRecording(run, direction, itemId, inventoryId, qty, unit);
        ProductionRunItem runItem = new ProductionRunItem();
        runItem.setProductionRunItemId(idGenerator.generate());
        runItem.setProductionRunId(run.getProductionRunId());
        runItem.setInventoryId(resolved.inventory() != null ? resolved.inventory().getInventoryId() : null);
        runItem.setItemId(resolved.item().getItemId());
        runItem.setDirection(direction.trim().toLowerCase());
        runItem.setPlannedQty(qty);
        runItem.setActualQty(qty);
        runItem.setUnit(unit.trim());
        runItem.setQuantitySource("correction");
        runItem.setProductionRunCorrectionId(correctionId);
        runItem.setLotId(resolved.inventory() != null ? resolved.inventory().getLotId() : null);
        ProductionRunItem saved = productionRunItemRepository.save(runItem);
        if (resolved.inventory() != null) {
            applyInventoryEffect(run, saved, resolved.inventory(), resolved.conversion());
        }
        return saved;
    }

    /** Voids a recording for a correction: reverses its stock movement and marks it cancelled by that correction. */
    @Transactional
    public void voidForCorrection(ProductionRun run, ProductionRunItem item, String correctionId, int correctionNo, String reason,
        String actor) {
        inventoryCommandService.reverseMovementsOf("production_run_item", item.getProductionRunItemId(),
            "Run " + run.getRunNumber() + " correction #" + correctionNo + ": " + reason, actor);
        item.setCancelledYn("Y");
        item.setCancelledBy(actor);
        item.setCancelledAt(OffsetDateTime.now());
        item.setCancelReason("Correction #" + correctionNo + ": " + reason);
        item.setCancelledByCorrectionId(correctionId);
        productionRunItemRepository.save(item);
    }

    private record CorrectionRecording(Item item, Inventory inventory, UnitConverter.Conversion conversion) {
    }

    private CorrectionRecording resolveCorrectionRecording(ProductionRun run, String direction, String itemId,
        String inventoryId, BigDecimal qty, String unit) {
        if (direction == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "direction must be 'input' or 'output'.");
        }
        requireKnownDirection(direction);
        if (qty == null || qty.signum() <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The corrected quantity must be greater than 0.");
        }
        if (unit == null || unit.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Give the unit of the corrected quantity.");
        }
        if (itemId == null || itemId.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Choose the item to record.");
        }
        Item item = findActiveItem(itemId.trim());
        validateSameProject(run.getProjectId(), item.getProjectId());
        Inventory inventory = null;
        if (inventoryId != null && !inventoryId.isBlank()) {
            inventory = findActiveInventory(inventoryId.trim());
            validateSameProject(run.getProjectId(), inventory.getProjectId());
            if (!item.getItemId().equals(inventory.getItemId())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "The selected stock record holds a different item.");
            }
        }
        if ("Y".equals(item.getLotManageYn()) && inventory == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                item.getItemCode() + " is LOT-tracked; choose the stock record (LOT) this " + direction.trim().toLowerCase()
                    + " uses.");
        }
        UnitConverter.Conversion conversion = unitConverter.toItemUnit(qty, unit.trim(), item.getUnitId());
        return new CorrectionRecording(item, inventory, conversion);
    }

    /**
     * Connects this LOT to the LOTs already recorded on the other side of the run: every input LOT is a parent of every
     * output LOT. Works in either recording order; the same edge is stored once.
     */
    private void linkLotGenealogy(ProductionRun run, ProductionRunItem recorded) {
        boolean isOutput = "output".equals(recorded.getDirection());
        if (isOutput) {
            lotService.markProducedBy(recorded.getLotId(), run.getProductionRunId());
        }
        for (ProductionRunItem other : productionRunItemRepository.findAllByProductionRunIdOrderByProductionRunItemIdAsc(
            run.getProductionRunId())) {
            if (other.getLotId() == null
                || other.isCancelled()
                || other.getProductionRunItemId().equals(recorded.getProductionRunItemId())
                || other.getDirection().equals(recorded.getDirection())) {
                continue;
            }
            ProductionRunItem input = isOutput ? other : recorded;
            ProductionRunItem output = isOutput ? recorded : other;
            lotService.recordTrace(
                run.getProjectId(),
                run.getProductionRunId(),
                output.getProcessId() != null ? output.getProcessId() : input.getProcessId(),
                input.getLotId(),
                output.getLotId(),
                recordedQuantity(input),
                recordedQuantity(output),
                input.getUnit()
            );
        }
    }

    private static BigDecimal recordedQuantity(ProductionRunItem item) {
        return item.getActualQty() != null ? item.getActualQty() : item.getPlannedQty();
    }

    @Override
    @Transactional
    public ProductionRunResponse finishRun(String productionRunId, ProductionRunFinishRequest request) {
        ProductionRun run = findActiveRun(productionRunId);
        projectAccessService.requireProjectWriteAccess(run.getProjectId());
        requireOpenRun(run);
        evaluateRunFinishRules(run, request);
        run.setRunStatus("finished");
        if (request != null && request.actualOutputQty() != null) {
            run.setActualOutputQty(request.actualOutputQty());
        }
        run.setFinishedBy(projectAccessService.requireCurrentUserId());
        ProductionRun savedRun = productionRunRepository.save(run);
        productionFlowRunAdapter.onFinished(savedRun);
        return toResponse(savedRun);
    }

    private Workflow findActiveWorkflow(String workflowId) {
        return workflowRepository.findByWorkflowIdAndDeletedYn(workflowId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private Process findActiveProcess(String processId) {
        return processRepository.findByProcessIdAndDeletedYn(processId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private ProcessIo findActiveProcessIo(String processIoId) {
        return processIoRepository.findByProcessIoIdAndDeletedYn(processIoId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private RunProcessSelection resolveRunProcessSelection(ProductionRun run, ProductionRunItemRecordRequest request) {
        String processId = trimToNull(request.processId());
        String processIoId = trimToNull(request.processIoId());
        if (processId == null && processIoId == null) {
            return new RunProcessSelection(null, null);
        }
        if (run.getWorkflowRevisionId() == null) {
            ProcessIo io = processIoId != null ? findActiveProcessIo(processIoId) : null;
            if (io != null && processId != null && !processId.equals(io.getProcessId())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "Process I/O belongs to a different process.");
            }
            Process process = findActiveProcess(processId != null ? processId : io.getProcessId());
            validateSameWorkflow(run.getWorkflowId(), process.getWorkflowId());
            return new RunProcessSelection(process, io);
        }

        WorkflowRevision revision = workflowRevisionRepository
            .findByWorkflowRevisionIdAndWorkflowId(run.getWorkflowRevisionId(), run.getWorkflowId())
            .orElseThrow(() -> new IllegalStateException("Run refers to a missing workflow revision."));
        JsonNode snapshot;
        try {
            snapshot = objectMapper.readTree(revision.getSnapshotJson());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored workflow revision snapshot is invalid.", exception);
        }
        JsonNode ioNode = processIoId == null ? null : findSnapshotEntry(snapshot.path("processIos"), "processIoId", processIoId);
        if (processIoId != null && ioNode == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Process I/O is not part of this run's workflow revision.");
        }
        if (ioNode != null) {
            String ioProcessId = ioNode.path("processId").asText();
            if (processId != null && !processId.equals(ioProcessId)) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "Process I/O belongs to a different process.");
            }
            if (!request.itemId().equals(ioNode.path("itemId").asText())
                || !request.direction().trim().equalsIgnoreCase(ioNode.path("direction").asText())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "Process I/O item or direction differs from the published revision.");
            }
            processId = ioProcessId;
        }
        JsonNode processNode = findSnapshotEntry(snapshot.path("processes"), "processId", processId);
        if (processNode == null || !run.getWorkflowId().equals(processNode.path("workflowId").asText())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Process is not part of this run's workflow revision.");
        }
        try {
            return new RunProcessSelection(objectMapper.treeToValue(processNode, Process.class),
                ioNode != null ? objectMapper.treeToValue(ioNode, ProcessIo.class) : null);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored workflow revision process is invalid.", exception);
        }
    }

    private static JsonNode findSnapshotEntry(JsonNode entries, String idField, String id) {
        if (id == null || !entries.isArray()) {
            return null;
        }
        for (JsonNode entry : entries) {
            if (id.equals(entry.path(idField).asText())) {
                return entry;
            }
        }
        return null;
    }

    private record RunProcessSelection(Process process, ProcessIo processIo) {
    }

    private Item findActiveItem(String itemId) {
        return itemRepository.findByItemIdAndDeletedYn(itemId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private Inventory findActiveInventory(String inventoryId) {
        return inventoryRepository.findByInventoryIdAndDeletedYn(inventoryId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private WorkOrder findRunnableWorkOrder(String workOrderId, String projectId, Workflow workflow) {
        String normalized = trimToNull(workOrderId);
        if (normalized == null) {
            return null;
        }
        WorkOrder workOrder = workOrderRepository.findByWorkOrderIdAndDeletedYn(normalized, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "Work order does not exist."));
        validateSameProject(projectId.trim(), workOrder.getProjectId());
        if (workOrder.getWorkflowId() != null && !workOrder.getWorkflowId().equals(workflow.getWorkflowId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "Work order " + workOrder.getWorkOrderNumber() + " belongs to a different workflow.");
        }
        if (!WorkOrderServiceImpl.status(workOrder).acceptsRuns()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "Work order " + workOrder.getWorkOrderNumber() + " is " + workOrder.getWorkOrderStatus()
                    + "; runs can only start on approved or in-progress orders.");
        }
        return workOrder;
    }

    private ProductionRun findActiveRun(String productionRunId) {
        return productionRunRepository.findByProductionRunIdAndDeletedYn(productionRunId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private static ProductionRunResponse toResponse(ProductionRun run) {
        return new ProductionRunResponse(
            run.getProductionRunId(),
            run.getProjectId(),
            run.getWorkflowId(),
            run.getWorkflowRevisionId(),
            run.getRunNumber(),
            run.getRunType(),
            run.getRunStatus(),
            run.getTargetItemId(),
            run.getPlannedOutputQty(),
            run.getActualOutputQty(),
            run.getWorkOrderId(),
            run.getBomId(),
            run.getBomVersion()
        );
    }

    private WorkflowRevision resolveWorkflowRevision(String workflowId, String requestedRevisionId) {
        if (requestedRevisionId == null || requestedRevisionId.isBlank()) {
            return workflowRevisionRepository
                .findTopByWorkflowIdAndStatusOrderByRevisionNoDesc(workflowId, "published")
                .orElse(null);
        }
        WorkflowRevision revision = workflowRevisionRepository
            .findByWorkflowRevisionIdAndWorkflowId(requestedRevisionId.trim(), workflowId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND,
                "Workflow revision was not found for this workflow."));
        if (!"published".equals(revision.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Retired workflow revisions cannot start new runs.");
        }
        return revision;
    }

    private static ProductionRunItemResponse toItemResponse(ProductionRunItem item) {
        return new ProductionRunItemResponse(
            item.getProductionRunItemId(),
            item.getProductionRunId(),
            item.getProcessId(),
            item.getProcessIoId(),
            item.getInventoryId(),
            item.getItemId(),
            item.getDirection(),
            item.getPlannedQty(),
            item.getActualQty(),
            item.getUnit(),
            item.getQuantitySource(),
            item.getConversionRate(),
            item.getLotId(),
            item.isCancelled(),
            item.getCancelledBy(),
            item.getCancelledAt(),
            item.getCancelReason(),
            item.getProductionRunCorrectionId(),
            item.getCancelledByCorrectionId()
        );
    }

    private static void requireOpenRun(ProductionRun run) {
        String status = run.getRunStatus() == null ? "" : run.getRunStatus().trim().toLowerCase();
        if (!OPEN_RUN_STATUSES.contains(status)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Run " + run.getRunNumber() + " is already " + status + ".");
        }
    }

    private static void requireKnownDirection(String direction) {
        if (!RUN_ITEM_DIRECTIONS.contains(direction.trim().toLowerCase())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "direction must be 'input' or 'output'.");
        }
    }

    private static void validateSameProject(String expectedProjectId, String actualProjectId) {
        if (!expectedProjectId.equals(actualProjectId)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
    }

    private static void validateSameWorkflow(String expectedWorkflowId, String actualWorkflowId) {
        if (!expectedWorkflowId.equals(actualWorkflowId)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
    }

    private static String trimToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }

    private static String defaultIfBlank(String value, String defaultValue) {
        return value != null && !value.isBlank() ? value.trim().toLowerCase() : defaultValue;
    }

    private void applyInventoryEffect(
        ProductionRun run,
        ProductionRunItem runItem,
        Inventory inventory,
        UnitConverter.Conversion conversion
    ) {
        // Stock is kept in the item's unit; inventory columns hold 4 decimals.
        BigDecimal actualQty = conversion.quantity() == null
            ? BigDecimal.ZERO
            : conversion.quantity().setScale(4, RoundingMode.HALF_UP);

        InventoryTransactionType type;
        BigDecimal quantityDelta;
        if ("input".equals(runItem.getDirection())) {
            type = InventoryTransactionType.PRODUCTION_INPUT;
            quantityDelta = actualQty.negate();
        } else if ("output".equals(runItem.getDirection())) {
            type = InventoryTransactionType.PRODUCTION_OUTPUT;
            quantityDelta = actualQty;
        } else {
            return;
        }
        if (quantityDelta.signum() == 0) {
            return;
        }

        // Conditional atomic UPDATE: concurrent runs cannot lose updates, and consuming more than is available
        // (or quarantined stock) is refused instead of driving the record negative.
        inventoryCommandService.apply(new InventoryMovement(
            inventory.getInventoryId(),
            type,
            quantityDelta,
            BigDecimal.ZERO,
            "production_run_item",
            runItem.getProductionRunItemId(),
            conversion.converted()
                ? "Recorded from run " + run.getRunNumber() + " ("
                    + (runItem.getActualQty() != null ? runItem.getActualQty() : runItem.getPlannedQty()).stripTrailingZeros().toPlainString()
                    + " " + conversion.fromUnitCode() + " = " + actualQty.stripTrailingZeros().toPlainString()
                    + " " + conversion.toUnitCode() + ")"
                : "Recorded from run " + run.getRunNumber(),
            null,
            projectAccessService.requireCurrentUserId()
        ));
    }

    private static BigDecimal defaultIfNull(BigDecimal value, BigDecimal defaultValue) {
        return value != null ? value : defaultValue;
    }

    private static String generateRunNumber() {
        long timestamp = System.currentTimeMillis();
        int suffix = ThreadLocalRandom.current().nextInt(1000, 9999);
        return "RUN-" + timestamp + "-" + suffix;
    }

    private void evaluateRunStartRules(ProductionRunStartRequest request, Workflow workflow, Item item) {
        List<RuleTarget> targets = new ArrayList<>();
        targets.add(new RuleTarget("project", request.projectId()));
        targets.add(new RuleTarget("workflow", workflow.getWorkflowId()));
        if (item != null) {
            targets.add(new RuleTarget("item", item.getItemId()));
        }

        Map<String, Object> facts = new LinkedHashMap<>();
        facts.put("operation", "run_start");
        facts.put("request", request);
        facts.put("workflow", workflow);
        facts.put("item", item);
        facts.put("plannedOutputQty", request.plannedOutputQty());
        facts.put("runType", defaultIfBlank(request.runType(), "actual"));

        flowRuleEngineService.validateRules(new RuleEvaluationContext(request.projectId().trim(), targets, facts));
    }

    private void evaluateRunItemRules(
        ProductionRun run,
        ProductionRunItemRecordRequest request,
        Item item,
        Process process,
        ProcessIo processIo,
        Inventory inventory
    ) {
        List<RuleTarget> targets = new ArrayList<>();
        targets.add(new RuleTarget("project", run.getProjectId()));
        targets.add(new RuleTarget("workflow", run.getWorkflowId()));
        targets.add(new RuleTarget("run", run.getProductionRunId()));
        targets.add(new RuleTarget("item", item.getItemId()));
        if (process != null) {
            targets.add(new RuleTarget("process", process.getProcessId()));
        }
        if (processIo != null) {
            targets.add(new RuleTarget("process_io", processIo.getProcessIoId()));
        }
        if (inventory != null) {
            targets.add(new RuleTarget("inventory", inventory.getInventoryId()));
        }

        BigDecimal requestQuantity = request.actualQty() != null ? request.actualQty() : request.plannedQty();
        Map<String, Object> facts = new LinkedHashMap<>();
        facts.put("operation", "run_item_record");
        facts.put("run", run);
        facts.put("request", request);
        facts.put("item", item);
        facts.put("process", process);
        facts.put("processIo", processIo);
        facts.put("inventory", inventory);
        facts.put("requestQuantity", requestQuantity);
        facts.put("direction", request.direction().trim().toLowerCase());

        flowRuleEngineService.validateRules(new RuleEvaluationContext(run.getProjectId(), targets, facts));
    }

    private void evaluateRunFinishRules(ProductionRun run, ProductionRunFinishRequest request) {
        List<RuleTarget> targets = List.of(
            new RuleTarget("project", run.getProjectId()),
            new RuleTarget("workflow", run.getWorkflowId()),
            new RuleTarget("run", run.getProductionRunId())
        );

        Map<String, Object> facts = new LinkedHashMap<>();
        facts.put("operation", "run_finish");
        facts.put("run", run);
        facts.put("request", request);
        if (request != null) {
            facts.put("actualOutputQty", request.actualOutputQty());
            facts.put("finishedBy", request.finishedBy());
        }

        flowRuleEngineService.validateRules(new RuleEvaluationContext(run.getProjectId(), new ArrayList<>(targets), facts));
    }
}
