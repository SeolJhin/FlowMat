package org.myweb.flowmat.domain.workflow.application;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessCreateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessUpdateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.response.ProcessResponse;
import org.myweb.flowmat.domain.workflow.domain.entity.Process;
import org.myweb.flowmat.domain.workflow.domain.entity.Workflow;
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
public class ProcessServiceImpl implements ProcessService {

    private static final String NOT_DELETED = "N";
    private static final String DELETED = "Y";
    private static final String DEFAULT_COLOR_SCHEME = "slate";

    private final ProcessRepository processRepository;
    private final WorkflowRepository workflowRepository;
    private final IdGenerator idGenerator;

    @Override
    public List<ProcessResponse> listProcesses(String workflowId) {
        findActiveWorkflow(workflowId);
        return processRepository.findAllByWorkflowIdAndDeletedYnOrderByCreatedAtAsc(workflowId, NOT_DELETED).stream()
            .map(ProcessServiceImpl::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public ProcessResponse createProcess(ProcessCreateRequest request) {
        Workflow workflow = findActiveWorkflow(request.workflowId());

        Process process = new Process();
        process.setProcessId(idGenerator.generate());
        process.setProjectId(workflow.getProjectId());
        process.setWorkflowId(workflow.getWorkflowId());
        process.setProcessName(request.processName().trim());
        process.setProcessType(defaultIfBlank(request.processType(), "generic"));
        process.setNodeType(defaultIfBlank(request.nodeType(), "process"));
        process.setProcessStatus("active");
        process.setColorScheme(defaultColorScheme(request.colorScheme(), DEFAULT_COLOR_SCHEME));
        process.setPosX(defaultIfNull(request.posX(), 0.0));
        process.setPosY(defaultIfNull(request.posY(), 0.0));
        process.setWidth(defaultIfNull(request.width(), 120.0));
        process.setHeight(defaultIfNull(request.height(), 60.0));
        process.setProcessDesc(trimToNull(request.processDesc()));
        process.setDeletedYn(NOT_DELETED);
        return toResponse(processRepository.save(process));
    }

    @Override
    public ProcessResponse getProcess(String processId) {
        return toResponse(findActiveProcess(processId));
    }

    @Override
    @Transactional
    public ProcessResponse updateProcess(String processId, ProcessUpdateRequest request) {
        Process process = findActiveProcess(processId);
        if (hasText(request.processName())) {
            process.setProcessName(request.processName().trim());
        }
        if (hasText(request.processType())) {
            process.setProcessType(request.processType().trim().toLowerCase());
        }
        if (hasText(request.nodeType())) {
            process.setNodeType(request.nodeType().trim().toLowerCase());
        }
        if (hasText(request.processStatus())) {
            process.setProcessStatus(request.processStatus().trim().toLowerCase());
        }
        if (request.colorScheme() != null) {
            process.setColorScheme(defaultColorScheme(request.colorScheme(), process.getColorScheme()));
        }
        if (request.posX() != null) {
            process.setPosX(request.posX());
        }
        if (request.posY() != null) {
            process.setPosY(request.posY());
        }
        if (request.width() != null) {
            process.setWidth(request.width());
        }
        if (request.height() != null) {
            process.setHeight(request.height());
        }
        if (request.processDesc() != null) {
            process.setProcessDesc(trimToNull(request.processDesc()));
        }
        return toResponse(processRepository.save(process));
    }

    @Override
    @Transactional
    public void deleteProcess(String processId) {
        Process process = findActiveProcess(processId);
        process.setDeletedYn(DELETED);
        process.setProcessStatus("deleted");
        processRepository.save(process);
    }

    private Workflow findActiveWorkflow(String workflowId) {
        return workflowRepository.findByWorkflowIdAndDeletedYn(workflowId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private Process findActiveProcess(String processId) {
        return processRepository.findByProcessIdAndDeletedYn(processId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private static ProcessResponse toResponse(Process process) {
        return new ProcessResponse(
            process.getProcessId(),
            process.getProjectId(),
            process.getWorkflowId(),
            process.getProcessName(),
            process.getProcessType(),
            process.getNodeType(),
            process.getProcessStatus(),
            process.getColorScheme(),
            process.getPosX(),
            process.getPosY(),
            process.getWidth(),
            process.getHeight(),
            process.getProcessDesc()
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

    private static Double defaultIfNull(Double value, Double defaultValue) {
        return value != null ? value : defaultValue;
    }

    static String defaultColorScheme(String value, String defaultValue) {
        return hasText(value) ? value.trim().toLowerCase() : defaultValue;
    }
}
