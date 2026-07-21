package org.myweb.flowmat.domain.workflow.collab;

import java.security.Principal;
import org.myweb.flowmat.domain.workflow.collab.dto.PresenceMessage;
import org.myweb.flowmat.global.security.AuthUser;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

/**
 * CURSOR_MOVED / NODE_EDITING 같은 presence 메시지를 relay 한다.
 * 클라이언트가 보낸 userId/workflowId/timestamp 를 서버가 재설정한다.
 */
@Controller
public class PresenceController {

    @MessageMapping("/workflow/{workflowId}/presence")
    @SendTo("/topic/workflow/{workflowId}/presence")
    public PresenceMessage relay(
        @DestinationVariable String workflowId,
        @Payload PresenceMessage message,
        Principal principal
    ) {
        String userId = resolveUserId(principal);
        return message.withServerValues(userId, workflowId);
    }

    private String resolveUserId(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
            && auth.getPrincipal() instanceof AuthUser authUser) {
            return authUser.getUserId();
        }
        return null;
    }
}
