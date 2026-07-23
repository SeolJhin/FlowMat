package org.myweb.flowmat.domain.workflow.collab;

import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.workflow.collab.dto.PresenceMessage;
import org.myweb.flowmat.global.security.AuthUser;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

/**
 * CURSOR_MOVED / NODE_EDITING 같은 presence 메시지를 relay 한다.
 * 클라이언트가 보낸 userId/workflowId/timestamp 를 서버가 재설정한다.
 */
@Controller
@RequiredArgsConstructor
public class PresenceController {

    private final SimpMessagingTemplate messagingTemplate;
    private final WorkflowSessionRegistry sessionRegistry;

    @MessageMapping("/workflow/{workflowId}/presence")
    public void relay(
        @DestinationVariable String workflowId,
        @Payload PresenceMessage message,
        Principal principal,
        SimpMessageHeaderAccessor headerAccessor
    ) {
        String userId = resolveUserId(principal);
        String sessionId = headerAccessor.getSessionId();
        if (sessionId != null && userId != null) {
            if (message.type() == PresenceMessage.Type.LEAVE) {
                sessionRegistry.remove(sessionId);
            } else {
                sessionRegistry.touch(sessionId, userId, workflowId, message);
            }
        }

        if (message.type() == PresenceMessage.Type.HEARTBEAT) {
            return;
        }

        String destination = "/topic/workflow/" + workflowId + "/presence";
        messagingTemplate.convertAndSend(destination, message.withServerValues(userId, workflowId));
    }

    private String resolveUserId(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
            && auth.getPrincipal() instanceof AuthUser authUser) {
            return authUser.getUserId();
        }
        return null;
    }
}
