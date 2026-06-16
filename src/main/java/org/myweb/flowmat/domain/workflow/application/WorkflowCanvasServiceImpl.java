package org.myweb.flowmat.domain.workflow.application;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.workflow.api.dto.response.ProcessConnectionResponse;
import org.myweb.flowmat.domain.workflow.api.dto.response.ProcessIoResponse;
import org.myweb.flowmat.domain.workflow.api.dto.response.ProcessResponse;
import org.myweb.flowmat.domain.workflow.api.dto.response.WorkflowCanvasResponse;
import org.myweb.flowmat.domain.workflow.api.dto.response.WorkflowResponse;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkflowCanvasServiceImpl implements WorkflowCanvasService {

    private static final String NOT_DELETED = "N";

    private final WorkflowRepository workflowRepository;
    private final ProcessRepository processRepository;
    private final ProcessIoRepository processIoRepository;
    private final ProcessConnectionRepository processConnectionRepository;

    @Override
    public WorkflowCanvasResponse getCanvas(String workflowId) {
        Workflow workflow = workflowRepository.findByWorkflowIdAndDeletedYn(workflowId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        List<Process> processes = processRepository.findAllByWorkflowIdAndDeletedYnOrderByCreatedAtAsc(
            workflow.getWorkflowId(),
            NOT_DELETED
        );
        List<String> processIds = processes.stream().map(Process::getProcessId).toList();
        List<ProcessIo> processIos = processIds.isEmpty()
            ? List.of()
            : processIoRepository.findAllByProcessIdInAndDeletedYnOrderByCreatedAtAsc(processIds, NOT_DELETED);
        List<ProcessConnection> connections = processConnectionRepository
            .findAllByWorkflowIdAndDeletedYnOrderByCreatedAtAsc(workflow.getWorkflowId(), NOT_DELETED);

        return new WorkflowCanvasResponse(
            toWorkflowResponse(workflow),
            processes.stream().map(WorkflowCanvasServiceImpl::toProcessResponse).toList(),
            processIos.stream().map(WorkflowCanvasServiceImpl::toProcessIoResponse).toList(),
            connections.stream().map(WorkflowCanvasServiceImpl::toConnectionResponse).toList()
        );
    }

    private static WorkflowResponse toWorkflowResponse(Workflow workflow) {
        return new WorkflowResponse(
            workflow.getWorkflowId(),
            workflow.getProjectId(),
            workflow.getWorkflowName(),
            workflow.getWorkflowDesc(),
            workflow.getWorkflowType(),
            workflow.getWorkflowStatus()
        );
    }

    private static ProcessResponse toProcessResponse(Process process) {
        return new ProcessResponse(
            process.getProcessId(),
            process.getProjectId(),
            process.getWorkflowId(),
            process.getProcessName(),
            process.getProcessType(),
            process.getNodeType(),
            process.getProcessStatus(),
            process.getPosX(),
            process.getPosY(),
            process.getWidth(),
            process.getHeight(),
            process.getProcessDesc()
        );
    }

    private static ProcessIoResponse toProcessIoResponse(ProcessIo processIo) {
        return new ProcessIoResponse(
            processIo.getProcessIoId(),
            processIo.getProcessId(),
            processIo.getItemId(),
            processIo.getIoName(),
            processIo.getDirection(),
            processIo.getIoType(),
            processIo.getQuantity(),
            processIo.getUnit(),
            processIo.getFormula(),
            processIo.getRequiredYn(),
            processIo.getAllowShortageYn()
        );
    }

    private static ProcessConnectionResponse toConnectionResponse(ProcessConnection connection) {
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
}
