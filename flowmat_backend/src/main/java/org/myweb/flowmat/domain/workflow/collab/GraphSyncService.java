package org.myweb.flowmat.domain.workflow.collab;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.workflow.api.dto.response.ProcessIoResponse;
import org.myweb.flowmat.domain.workflow.api.dto.response.ProcessResponse;
import org.myweb.flowmat.domain.workflow.api.dto.response.WorkflowGraphChangesResponse;
import org.myweb.flowmat.domain.workflow.application.WorkflowCanvasServiceImpl;
import org.myweb.flowmat.domain.workflow.collab.dto.GraphChangeMessage;
import org.myweb.flowmat.domain.workflow.collab.dto.GraphChangeMessage.Type;
import org.myweb.flowmat.domain.workflow.collab.dto.GraphEntityPayload;
import org.myweb.flowmat.domain.workflow.domain.entity.Process;
import org.myweb.flowmat.domain.workflow.domain.entity.ProcessIo;
import org.myweb.flowmat.domain.workflow.domain.entity.Workflow;
import org.myweb.flowmat.domain.workflow.repository.ProcessConnectionRepository;
import org.myweb.flowmat.domain.workflow.repository.ProcessIoRepository;
import org.myweb.flowmat.domain.workflow.repository.ProcessRepository;
import org.myweb.flowmat.domain.workflow.repository.WorkflowRepository;
import org.myweb.flowmat.global.security.AuthUser;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GraphSyncService {

    private static final String NOT_DELETED = "N";

    private final SimpMessagingTemplate messagingTemplate;
    private final RedisGraphChangeStore graphChangeStore;
    private final ProcessRepository processRepository;
    private final ProcessIoRepository processIoRepository;
    private final ProcessConnectionRepository processConnectionRepository;
    private final WorkflowRepository workflowRepository;
    private final ProjectAccessService projectAccessService;

    public void broadcast(Type type, String workflowId, String entityId) {
        broadcast(type, workflowId, entityId, resolveCurrentUserId());
    }

    @Transactional
    public void broadcast(Type type, String workflowId, String entityId, String userId) {
        GraphEntityPayload payload = loadPayload(type, entityId);
        GraphChangeMessage message = graphChangeStore.append(type, workflowId, entityId, userId, payload);
        messagingTemplate.convertAndSend("/topic/workflow/" + workflowId + "/graph", message);
    }

    public WorkflowGraphChangesResponse getChangesSince(String workflowId, long sinceSeq) {
        projectAccessService.requireWorkflowReadAccess(workflowId);
        return graphChangeStore.getChangesSince(workflowId, sinceSeq);
    }

    public long getCurrentSeq(String workflowId) {
        return graphChangeStore.getCurrentSeq(workflowId);
    }

    private GraphEntityPayload loadPayload(Type type, String entityId) {
        return switch (type) {
            case WORKFLOW_UPDATED -> workflowRepository.findByWorkflowIdAndDeletedYn(entityId, NOT_DELETED)
                .map(this::toWorkflowPayload)
                .orElse(null);
            case NODE_CREATED, NODE_UPDATED -> processRepository.findByProcessIdAndDeletedYn(entityId, NOT_DELETED)
                .map(this::toNodePayload)
                .orElse(null);
            case PORT_CREATED, PORT_UPDATED, PORT_DELETED -> processIoRepository.findById(entityId)
                .map(ProcessIo::getProcessId)
                .flatMap(processId -> processRepository.findByProcessIdAndDeletedYn(processId, NOT_DELETED))
                .map(this::toNodePayload)
                .orElse(null);
            case CONNECTION_CREATED, CONNECTION_UPDATED -> processConnectionRepository
                .findByConnectionIdAndDeletedYn(entityId, NOT_DELETED)
                .map(WorkflowCanvasServiceImpl::toConnectionResponse)
                .map(connection -> new GraphEntityPayload(null, null, List.of(), connection))
                .orElse(null);
            case NODE_DELETED, CONNECTION_DELETED -> null;
        };
    }

    private GraphEntityPayload toWorkflowPayload(Workflow workflow) {
        return new GraphEntityPayload(
            WorkflowCanvasServiceImpl.toWorkflowResponse(workflow),
            null,
            List.of(),
            null
        );
    }

    private GraphEntityPayload toNodePayload(Process process) {
        List<ProcessIoResponse> processIos = processIoRepository
            .findAllByProcessIdAndDeletedYnOrderByCreatedAtAsc(process.getProcessId(), NOT_DELETED)
            .stream()
            .map(WorkflowCanvasServiceImpl::toProcessIoResponse)
            .toList();
        ProcessResponse processResponse = WorkflowCanvasServiceImpl.toProcessResponse(process);
        return new GraphEntityPayload(null, processResponse, processIos, null);
    }

    private static String resolveCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof AuthUser authUser) {
            return authUser.getUserId();
        }
        return authentication.getName();
    }
}
