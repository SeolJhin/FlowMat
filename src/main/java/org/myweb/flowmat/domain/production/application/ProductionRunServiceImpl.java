package org.myweb.flowmat.domain.production.application;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunFinishRequest;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunItemRecordRequest;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunStartRequest;
import org.myweb.flowmat.domain.production.api.dto.response.ProductionRunItemResponse;
import org.myweb.flowmat.domain.production.api.dto.response.ProductionRunResponse;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRunItem;
import org.myweb.flowmat.domain.production.repository.ProductionRunItemRepository;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.project.repository.ProjectRepository;
import org.myweb.flowmat.domain.workflow.domain.entity.Process;
import org.myweb.flowmat.domain.workflow.domain.entity.ProcessIo;
import org.myweb.flowmat.domain.workflow.domain.entity.Workflow;
import org.myweb.flowmat.domain.workflow.repository.ProcessIoRepository;
import org.myweb.flowmat.domain.workflow.repository.ProcessRepository;
import org.myweb.flowmat.domain.workflow.repository.WorkflowRepository;
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

    private final ProductionRunRepository productionRunRepository;
    private final ProductionRunItemRepository productionRunItemRepository;
    private final ProjectRepository projectRepository;
    private final WorkflowRepository workflowRepository;
    private final ProcessRepository processRepository;
    private final ProcessIoRepository processIoRepository;
    private final ItemRepository itemRepository;
    private final InventoryRepository inventoryRepository;
    private final IdGenerator idGenerator;

    @Override
    public List<ProductionRunResponse> listRuns(String workflowId) {
        findActiveWorkflow(workflowId);
        return productionRunRepository.findAllByWorkflowIdAndDeletedYnOrderByCreatedAtDesc(workflowId, NOT_DELETED)
            .stream()
            .map(ProductionRunServiceImpl::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public ProductionRunResponse startRun(ProductionRunStartRequest request) {
        ensureProjectExists(request.projectId());
        Workflow workflow = findActiveWorkflow(request.workflowId());
        validateSameProject(request.projectId(), workflow.getProjectId());
        if (request.targetItemId() != null && !request.targetItemId().isBlank()) {
            Item item = findActiveItem(request.targetItemId());
            validateSameProject(request.projectId(), item.getProjectId());
        }

        ProductionRun run = new ProductionRun();
        run.setProductionRunId(idGenerator.generate());
        run.setProjectId(request.projectId().trim());
        run.setWorkflowId(workflow.getWorkflowId());
        run.setRunNumber(generateRunNumber());
        run.setRunType(defaultIfBlank(request.runType(), "actual"));
        run.setRunStatus("running");
        run.setTargetItemId(trimToNull(request.targetItemId()));
        run.setPlannedOutputQty(request.plannedOutputQty());
        run.setActualOutputQty(BigDecimal.ZERO);
        run.setStartedBy(trimToNull(request.startedBy()));
        run.setDeletedYn(NOT_DELETED);
        return toResponse(productionRunRepository.save(run));
    }

    @Override
    public ProductionRunResponse getRun(String productionRunId) {
        return toResponse(findActiveRun(productionRunId));
    }

    @Override
    public List<ProductionRunItemResponse> listRunItems(String productionRunId) {
        findActiveRun(productionRunId);
        return productionRunItemRepository.findAllByProductionRunIdOrderByProductionRunItemIdAsc(productionRunId).stream()
            .map(ProductionRunServiceImpl::toItemResponse)
            .toList();
    }

    @Override
    @Transactional
    public ProductionRunItemResponse recordRunItem(String productionRunId, ProductionRunItemRecordRequest request) {
        ProductionRun run = findActiveRun(productionRunId);
        Item item = findActiveItem(request.itemId());
        validateSameProject(run.getProjectId(), item.getProjectId());

        if (request.processId() != null && !request.processId().isBlank()) {
            Process process = findActiveProcess(request.processId());
            validateSameWorkflow(run.getWorkflowId(), process.getWorkflowId());
        }
        if (request.processIoId() != null && !request.processIoId().isBlank()) {
            ProcessIo processIo = findActiveProcessIo(request.processIoId());
            if (request.processId() != null && !request.processId().isBlank()) {
                if (!request.processId().equals(processIo.getProcessId())) {
                    throw new BusinessException(ErrorCode.BAD_REQUEST);
                }
            }
        }
        if (request.inventoryId() != null && !request.inventoryId().isBlank()) {
            Inventory inventory = findActiveInventory(request.inventoryId());
            validateSameProject(run.getProjectId(), inventory.getProjectId());
        }

        ProductionRunItem runItem = new ProductionRunItem();
        runItem.setProductionRunItemId(idGenerator.generate());
        runItem.setProductionRunId(run.getProductionRunId());
        runItem.setProcessId(trimToNull(request.processId()));
        runItem.setProcessIoId(trimToNull(request.processIoId()));
        runItem.setInventoryId(trimToNull(request.inventoryId()));
        runItem.setItemId(item.getItemId());
        runItem.setDirection(request.direction().trim().toLowerCase());
        runItem.setPlannedQty(request.plannedQty());
        runItem.setActualQty(request.actualQty());
        runItem.setUnit(request.unit().trim());
        return toItemResponse(productionRunItemRepository.save(runItem));
    }

    @Override
    @Transactional
    public ProductionRunResponse finishRun(String productionRunId, ProductionRunFinishRequest request) {
        ProductionRun run = findActiveRun(productionRunId);
        run.setRunStatus("finished");
        if (request != null && request.actualOutputQty() != null) {
            run.setActualOutputQty(request.actualOutputQty());
        }
        if (request != null && request.finishedBy() != null) {
            run.setFinishedBy(trimToNull(request.finishedBy()));
        }
        return toResponse(productionRunRepository.save(run));
    }

    private void ensureProjectExists(String projectId) {
        projectRepository.findByProjectIdAndDeletedYn(projectId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
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

    private Item findActiveItem(String itemId) {
        return itemRepository.findByItemIdAndDeletedYn(itemId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private Inventory findActiveInventory(String inventoryId) {
        return inventoryRepository.findByInventoryIdAndDeletedYn(inventoryId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
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
            run.getRunNumber(),
            run.getRunType(),
            run.getRunStatus(),
            run.getTargetItemId(),
            run.getPlannedOutputQty(),
            run.getActualOutputQty()
        );
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
            item.getUnit()
        );
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

    private static String generateRunNumber() {
        long timestamp = System.currentTimeMillis();
        int suffix = ThreadLocalRandom.current().nextInt(1000, 9999);
        return "RUN-" + timestamp + "-" + suffix;
    }
}
