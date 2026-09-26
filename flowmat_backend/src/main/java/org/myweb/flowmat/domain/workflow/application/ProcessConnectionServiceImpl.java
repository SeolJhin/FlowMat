package org.myweb.flowmat.domain.workflow.application;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessConnectionCreateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessConnectionUpdateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.response.ProcessConnectionResponse;
import org.myweb.flowmat.domain.workflow.domain.entity.Process;
import org.myweb.flowmat.domain.workflow.domain.entity.ProcessConnection;
import org.myweb.flowmat.domain.workflow.domain.entity.ProcessIo;
import org.myweb.flowmat.domain.workflow.domain.entity.Workflow;
import org.myweb.flowmat.domain.workflow.domain.contract.PortSchema;
import org.myweb.flowmat.domain.workflow.domain.expression.ConditionExpression;
import org.myweb.flowmat.domain.workflow.collab.GraphSyncService;
import org.myweb.flowmat.domain.workflow.collab.dto.GraphChangeMessage.Type;
import org.myweb.flowmat.domain.workflow.repository.ProcessConnectionRepository;
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
public class ProcessConnectionServiceImpl implements ProcessConnectionService {

    private static final String NOT_DELETED = "N";
    private static final String DELETED = "Y";
    private static final Set<String> FAILURE_POLICIES = Set.of("stop", "skip", "retry");

    private final ProcessConnectionRepository processConnectionRepository;
    private final WorkflowRepository workflowRepository;
    private final ProcessRepository processRepository;
    private final ProcessIoRepository processIoRepository;
    private final ItemRepository itemRepository;
    private final UnitMasterRepository unitMasterRepository;
    private final EntityManager entityManager;
    private final IdGenerator idGenerator;
    private final GraphSyncService graphSyncService;
    private final ProjectAccessService projectAccessService;

    @Override
    public List<ProcessConnectionResponse> listConnections(String workflowId) {
        projectAccessService.requireWorkflowReadAccess(workflowId);
        return processConnectionRepository.findAllByWorkflowIdAndDeletedYnOrderByCreatedAtAsc(workflowId, NOT_DELETED)
            .stream()
            .map(ProcessConnectionServiceImpl::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public ProcessConnectionResponse createConnection(ProcessConnectionCreateRequest request) {
        Workflow workflow = projectAccessService.requireWorkflowWriteAccess(request.workflowId());
        entityManager.lock(workflow, LockModeType.PESSIMISTIC_WRITE);
        Process fromProcess = projectAccessService.requireProcessWriteAccess(request.fromProcessId());
        Process toProcess = projectAccessService.requireProcessWriteAccess(request.toProcessId());
        validateProcessMembership(workflow, fromProcess, toProcess);

        ProcessConnection connection = new ProcessConnection();
        connection.setConnectionId(idGenerator.generate());
        connection.setProjectId(workflow.getProjectId());
        connection.setWorkflowId(workflow.getWorkflowId());
        connection.setFromProcessId(fromProcess.getProcessId());
        connection.setToProcessId(toProcess.getProcessId());
        connection.setFromIoId(validateProcessIo(request.fromIoId(), fromProcess.getProcessId(), "output"));
        connection.setToIoId(validateProcessIo(request.toIoId(), toProcess.getProcessId(), "input"));
        connection.setItemId(validateItem(request.itemId(), workflow.getProjectId()));
        connection.setSourceHandle(resolveHandle(request.sourceHandle(), connection.getFromIoId(), "out"));
        connection.setTargetHandle(resolveHandle(request.targetHandle(), connection.getToIoId(), "in"));
        connection.setConnectionType(defaultIfBlank(request.connectionType(), "material"));
        connection.setConnectionLabel(trimToNull(request.connectionLabel()));
        connection.setFlowRate(request.flowRate());
        connection.setConditionExpr(trimToNull(request.conditionExpr()));
        connection.setCapacity(requireNonNegativeCapacity(request.capacity()));
        connection.setFailurePolicy(normalizeFailurePolicy(request.failurePolicy()));
        connection.setUnit(trimToNull(request.unit()));
        connection.setDelayTimeSec(defaultIfNull(request.delayTimeSec(), BigDecimal.ZERO));
        connection.setLossRate(defaultIfNull(request.lossRate(), BigDecimal.ZERO));
        connection.setPriority(request.priority() != null ? request.priority() : 0);
        connection.setDeletedYn(NOT_DELETED);
        connection.setVersion(1);
        connection.setVersionNonce(ThreadLocalRandom.current().nextInt(Integer.MAX_VALUE));
        validateConnectionContract(connection, null, true);
        ProcessConnectionResponse response = toResponse(processConnectionRepository.save(connection));
        graphSyncService.broadcast(Type.CONNECTION_CREATED, response.workflowId(), response.connectionId());
        return response;
    }

    @Override
    public ProcessConnectionResponse getConnection(String connectionId) {
        return toResponse(projectAccessService.requireConnectionReadAccess(connectionId));
    }

    @Override
    @Transactional
    public ProcessConnectionResponse updateConnection(String connectionId, ProcessConnectionUpdateRequest request) {
        ProcessConnection connection = projectAccessService.requireConnectionWriteAccess(connectionId);
        Workflow workflow = projectAccessService.requireWorkflowWriteAccess(connection.getWorkflowId());
        entityManager.lock(workflow, LockModeType.PESSIMISTIC_WRITE);
        Process fromProcess = projectAccessService.requireProcessWriteAccess(connection.getFromProcessId());
        Process toProcess = projectAccessService.requireProcessWriteAccess(connection.getToProcessId());

        if (request.fromIoId() != null) {
            connection.setFromIoId(validateProcessIo(request.fromIoId(), fromProcess.getProcessId(), "output"));
        }
        if (request.toIoId() != null) {
            connection.setToIoId(validateProcessIo(request.toIoId(), toProcess.getProcessId(), "input"));
        }
        if (request.itemId() != null) {
            connection.setItemId(validateItem(request.itemId(), connection.getProjectId()));
        }
        if (request.sourceHandle() != null) {
            connection.setSourceHandle(resolveHandle(request.sourceHandle(), connection.getFromIoId(), "out"));
        } else if (connection.getSourceHandle() == null) {
            connection.setSourceHandle(resolveHandle(null, connection.getFromIoId(), "out"));
        }
        if (request.targetHandle() != null) {
            connection.setTargetHandle(resolveHandle(request.targetHandle(), connection.getToIoId(), "in"));
        } else if (connection.getTargetHandle() == null) {
            connection.setTargetHandle(resolveHandle(null, connection.getToIoId(), "in"));
        }
        if (hasText(request.connectionType())) {
            connection.setConnectionType(request.connectionType().trim().toLowerCase());
        }
        connection.setConnectionLabel(trimToNull(request.connectionLabel()));
        if (request.flowRate() != null) {
            connection.setFlowRate(request.flowRate());
        }
        if (request.conditionExpr() != null) {
            connection.setConditionExpr(trimToNull(request.conditionExpr()));
        }
        if (Boolean.TRUE.equals(request.clearCapacity())) {
            connection.setCapacity(null);
        } else if (request.capacity() != null) {
            connection.setCapacity(requireNonNegativeCapacity(request.capacity()));
        }
        if (request.failurePolicy() != null) {
            connection.setFailurePolicy(normalizeFailurePolicy(request.failurePolicy()));
        }
        if (request.unit() != null) {
            connection.setUnit(trimToNull(request.unit()));
        }
        if (request.delayTimeSec() != null) {
            connection.setDelayTimeSec(request.delayTimeSec());
        }
        if (request.lossRate() != null) {
            connection.setLossRate(request.lossRate());
        }
        if (request.priority() != null) {
            connection.setPriority(request.priority());
        }
        connection.setVersion(connection.getVersion() + 1);
        connection.setVersionNonce(ThreadLocalRandom.current().nextInt(Integer.MAX_VALUE));
        validateConnectionContract(connection, connectionId, true);
        ProcessConnectionResponse response = toResponse(processConnectionRepository.save(connection));
        graphSyncService.broadcast(Type.CONNECTION_UPDATED, response.workflowId(), response.connectionId());
        return response;
    }

    @Override
    @Transactional
    public void deleteConnection(String connectionId) {
        ProcessConnection connection = projectAccessService.requireConnectionWriteAccess(connectionId);
        String workflowId = connection.getWorkflowId();
        connection.setDeletedYn(DELETED);
        processConnectionRepository.save(connection);
        graphSyncService.broadcast(Type.CONNECTION_DELETED, workflowId, connectionId);
    }

    private String validateProcessIo(String processIoId, String processId, String direction) {
        if (!hasText(processIoId)) {
            return null;
        }
        ProcessIo processIo = processIoRepository.findByProcessIoIdAndDeletedYn(processIoId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!processId.equals(processIo.getProcessId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        if (!direction.equalsIgnoreCase(processIo.getDirection())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "Connection source must be an output port and target must be an input port.");
        }
        return processIo.getProcessIoId();
    }

    void validateConnectionContract(ProcessConnection connection, String excludedConnectionId) {
        validateConnectionContract(connection, excludedConnectionId, false);
    }

    private void validateConnectionContract(ProcessConnection connection, String excludedConnectionId, boolean inferItem) {
        ConditionExpression condition = null;
        if (hasText(connection.getConditionExpr())) {
            condition = ConditionExpression.compile(connection.getConditionExpr());
        }
        if (connection.getFromProcessId().equals(connection.getToProcessId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "A connection cannot link a process to itself.");
        }
        if (connection.getFromIoId() != null && connection.getToIoId() != null &&
            processConnectionRepository.findAllByWorkflowIdAndDeletedYnOrderByCreatedAtAsc(
                connection.getWorkflowId(), NOT_DELETED).stream().anyMatch(existing ->
                !existing.getConnectionId().equals(excludedConnectionId)
                    && connection.getFromIoId().equals(existing.getFromIoId())
                    && connection.getToIoId().equals(existing.getToIoId()))) {
            throw new BusinessException(ErrorCode.CONFLICT, "Ports are already connected.");
        }
        String fromIoId = connection.getFromIoId();
        String toIoId = connection.getToIoId();
        ProcessIo source = fromIoId == null ? null : processIoRepository.findByProcessIoIdAndDeletedYn(fromIoId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "Connection fromIoId points to a deleted port."));
        ProcessIo target = toIoId == null ? null : processIoRepository.findByProcessIoIdAndDeletedYn(toIoId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "Connection toIoId points to a deleted port."));
        if (source != null && (!source.getProcessId().equals(connection.getFromProcessId())
            || !"output".equalsIgnoreCase(source.getDirection()))) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Connection fromIoId must be an output port of fromProcessId.");
        }
        if (target != null && (!target.getProcessId().equals(connection.getToProcessId())
            || !"input".equalsIgnoreCase(target.getDirection()))) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Connection toIoId must be an input port of toProcessId.");
        }
        PortSchema sourceSchema = source == null ? null : PortSchema.parseStored(source.getSchemaJson());
        if (condition != null) {
            condition.requireDeclaredAttributes(sourceSchema == null ? null : sourceSchema.properties().keySet());
        }
        String sourceItem = source == null ? null : source.getItemId();
        String targetItem = target == null ? null : target.getItemId();
        String selectedItem = connection.getItemId();
        if (sourceItem != null && targetItem != null && !sourceItem.equals(targetItem)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Connected ports itemId must match.");
        }
        if (selectedItem != null && ((sourceItem != null && !selectedItem.equals(sourceItem))
            || (targetItem != null && !selectedItem.equals(targetItem)))) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Connection itemId must match the ports.");
        }
        if (inferItem && selectedItem == null && sourceItem != null && sourceItem.equals(targetItem)) {
            connection.setItemId(sourceItem);
        }
        if (source != null && target != null) {
            String sourceType = defaultIfBlank(source.getResourceType(), source.getIoType());
            String targetType = defaultIfBlank(target.getResourceType(), target.getIoType());
            if (!sourceType.equals(targetType)) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Connected ports resourceType must match.");
            }
            PortSchema targetSchema = PortSchema.parseStored(target.getSchemaJson());
            PortSchema.requireCompatible(sourceSchema, targetSchema);
        }
        Set<String> types = new java.util.HashSet<>();
        for (String unit : new String[] {source == null ? null : source.getUnit(),
            target == null ? null : target.getUnit(), connection.getUnit()}) {
            if (unit != null && !unit.isBlank()) {
                unitMasterRepository.findByUnitCodeIgnoreCase(unit).ifPresent(master -> types.add(master.getUnitType()));
            }
        }
        if (types.size() > 1) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Connection unit type must match port units.");
        }
    }

    private String validateItem(String itemId, String projectId) {
        if (!hasText(itemId)) {
            return null;
        }
        Item item = itemRepository.findByItemIdAndDeletedYn(itemId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!projectId.equals(item.getProjectId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        return item.getItemId();
    }

    private static void validateProcessMembership(Workflow workflow, Process fromProcess, Process toProcess) {
        if (!workflow.getWorkflowId().equals(fromProcess.getWorkflowId())
            || !workflow.getWorkflowId().equals(toProcess.getWorkflowId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
    }

    private static ProcessConnectionResponse toResponse(ProcessConnection connection) {
        return new ProcessConnectionResponse(
            connection.getConnectionId(),
            connection.getProjectId(),
            connection.getWorkflowId(),
            connection.getFromProcessId(),
            connection.getToProcessId(),
            connection.getFromIoId(),
            connection.getToIoId(),
            connection.getItemId(),
            connection.getSourceHandle(),
            connection.getTargetHandle(),
            connection.getConnectionType(),
            connection.getConnectionLabel(),
            connection.getFlowRate(),
            connection.getUnit(),
            connection.getDelayTimeSec(),
            connection.getLossRate(),
            connection.getPriority(),
            connection.getConditionExpr(),
            connection.getCapacity(),
            connection.getFailurePolicy(),
            connection.getVersion(),
            connection.getVersionNonce()
        );
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String trimToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private static String defaultIfBlank(String value, String defaultValue) {
        return hasText(value) ? value.trim().toLowerCase() : defaultValue;
    }

    private static BigDecimal defaultIfNull(BigDecimal value, BigDecimal defaultValue) {
        return value != null ? value : defaultValue;
    }

    private static BigDecimal requireNonNegativeCapacity(BigDecimal capacity) {
        if (capacity != null && capacity.signum() < 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Connection capacity cannot be negative.");
        }
        return capacity;
    }

    private static String normalizeFailurePolicy(String value) {
        String normalized = defaultIfBlank(value, "stop");
        if (!FAILURE_POLICIES.contains(normalized)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Unknown connection failure policy.");
        }
        return normalized;
    }

    private static String resolveHandle(String requestedHandle, String ioId, String defaultPrefix) {
        if (hasText(requestedHandle)) {
            return requestedHandle.trim();
        }
        if (hasText(ioId)) {
            return ioId.trim();
        }
        return defaultPrefix + "-default";
    }
}
