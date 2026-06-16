package org.myweb.flowmat.domain.workflow.application;

import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessConnectionCreateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessConnectionUpdateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.response.ProcessConnectionResponse;
import org.myweb.flowmat.domain.workflow.domain.entity.Process;
import org.myweb.flowmat.domain.workflow.domain.entity.ProcessConnection;
import org.myweb.flowmat.domain.workflow.domain.entity.ProcessIo;
import org.myweb.flowmat.domain.workflow.domain.entity.Workflow;
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

    private final ProcessConnectionRepository processConnectionRepository;
    private final WorkflowRepository workflowRepository;
    private final ProcessRepository processRepository;
    private final ProcessIoRepository processIoRepository;
    private final ItemRepository itemRepository;
    private final IdGenerator idGenerator;

    @Override
    public List<ProcessConnectionResponse> listConnections(String workflowId) {
        findActiveWorkflow(workflowId);
        return processConnectionRepository.findAllByWorkflowIdAndDeletedYnOrderByCreatedAtAsc(workflowId, NOT_DELETED)
            .stream()
            .map(ProcessConnectionServiceImpl::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public ProcessConnectionResponse createConnection(ProcessConnectionCreateRequest request) {
        Workflow workflow = findActiveWorkflow(request.workflowId());
        Process fromProcess = findActiveProcess(request.fromProcessId());
        Process toProcess = findActiveProcess(request.toProcessId());
        validateProcessMembership(workflow, fromProcess, toProcess);

        ProcessConnection connection = new ProcessConnection();
        connection.setConnectionId(idGenerator.generate());
        connection.setProjectId(workflow.getProjectId());
        connection.setWorkflowId(workflow.getWorkflowId());
        connection.setFromProcessId(fromProcess.getProcessId());
        connection.setToProcessId(toProcess.getProcessId());
        connection.setFromIoId(validateProcessIo(request.fromIoId(), fromProcess.getProcessId()));
        connection.setToIoId(validateProcessIo(request.toIoId(), toProcess.getProcessId()));
        connection.setItemId(validateItem(request.itemId(), workflow.getProjectId()));
        connection.setConnectionType(defaultIfBlank(request.connectionType(), "material"));
        connection.setConnectionLabel(trimToNull(request.connectionLabel()));
        connection.setFlowRate(request.flowRate());
        connection.setUnit(trimToNull(request.unit()));
        connection.setDelayTimeSec(defaultIfNull(request.delayTimeSec(), BigDecimal.ZERO));
        connection.setLossRate(defaultIfNull(request.lossRate(), BigDecimal.ZERO));
        connection.setPriority(request.priority() != null ? request.priority() : 0);
        connection.setDeletedYn(NOT_DELETED);
        return toResponse(processConnectionRepository.save(connection));
    }

    @Override
    public ProcessConnectionResponse getConnection(String connectionId) {
        return toResponse(findActiveConnection(connectionId));
    }

    @Override
    @Transactional
    public ProcessConnectionResponse updateConnection(String connectionId, ProcessConnectionUpdateRequest request) {
        ProcessConnection connection = findActiveConnection(connectionId);
        Process fromProcess = findActiveProcess(connection.getFromProcessId());
        Process toProcess = findActiveProcess(connection.getToProcessId());

        if (request.fromIoId() != null) {
            connection.setFromIoId(validateProcessIo(request.fromIoId(), fromProcess.getProcessId()));
        }
        if (request.toIoId() != null) {
            connection.setToIoId(validateProcessIo(request.toIoId(), toProcess.getProcessId()));
        }
        if (request.itemId() != null) {
            connection.setItemId(validateItem(request.itemId(), connection.getProjectId()));
        }
        if (hasText(request.connectionType())) {
            connection.setConnectionType(request.connectionType().trim().toLowerCase());
        }
        if (request.connectionLabel() != null) {
            connection.setConnectionLabel(trimToNull(request.connectionLabel()));
        }
        if (request.flowRate() != null) {
            connection.setFlowRate(request.flowRate());
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
        return toResponse(processConnectionRepository.save(connection));
    }

    @Override
    @Transactional
    public void deleteConnection(String connectionId) {
        ProcessConnection connection = findActiveConnection(connectionId);
        connection.setDeletedYn(DELETED);
        processConnectionRepository.save(connection);
    }

    private Workflow findActiveWorkflow(String workflowId) {
        return workflowRepository.findByWorkflowIdAndDeletedYn(workflowId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private Process findActiveProcess(String processId) {
        return processRepository.findByProcessIdAndDeletedYn(processId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private ProcessConnection findActiveConnection(String connectionId) {
        return processConnectionRepository.findByConnectionIdAndDeletedYn(connectionId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private String validateProcessIo(String processIoId, String processId) {
        if (!hasText(processIoId)) {
            return null;
        }
        ProcessIo processIo = processIoRepository.findByProcessIoIdAndDeletedYn(processIoId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!processId.equals(processIo.getProcessId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        return processIo.getProcessIoId();
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
            connection.getConnectionType(),
            connection.getConnectionLabel(),
            connection.getFlowRate(),
            connection.getUnit(),
            connection.getDelayTimeSec(),
            connection.getLossRate(),
            connection.getPriority()
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
}
