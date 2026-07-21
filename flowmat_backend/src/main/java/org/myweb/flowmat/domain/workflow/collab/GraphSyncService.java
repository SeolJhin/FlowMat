package org.myweb.flowmat.domain.workflow.collab;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.workflow.collab.dto.GraphChangeMessage;
import org.myweb.flowmat.domain.workflow.collab.dto.GraphChangeMessage.Type;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GraphSyncService {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcast(Type type, String workflowId, String entityId) {
        broadcast(type, workflowId, entityId, null);
    }

    public void broadcast(Type type, String workflowId, String entityId, String userId) {
        messagingTemplate.convertAndSend(
            "/topic/workflow/" + workflowId + "/graph",
            GraphChangeMessage.of(type, workflowId, entityId, userId)
        );
    }
}
