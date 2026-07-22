package org.myweb.flowmat.domain.workflow.collab;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.workflow.collab.dto.PresenceMessage;
import org.myweb.flowmat.global.security.AuthUser;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

@ExtendWith(MockitoExtension.class)
class PresenceControllerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private WorkflowSessionRegistry sessionRegistry;

    @InjectMocks
    private PresenceController presenceController;

    @Test
    void heartbeatUpdatesSessionWithoutBroadcast() {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.create();
        headers.setSessionId("session-1");
        PresenceMessage heartbeat = new PresenceMessage(
            PresenceMessage.Type.HEARTBEAT,
            null,
            "client-1",
            null,
            null,
            null,
            null,
            0L
        );

        presenceController.relay(
            "workflow-1",
            heartbeat,
            new UsernamePasswordAuthenticationToken(new AuthUser("user-1"), null),
            headers
        );

        verify(sessionRegistry).touch("session-1", "user-1", "workflow-1", heartbeat);
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void leaveRemovesSessionAndBroadcastsLeave() {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.create();
        headers.setSessionId("session-2");

        presenceController.relay(
            "workflow-9",
            new PresenceMessage(PresenceMessage.Type.LEAVE, null, "client-9", null, null, null, null, 0L),
            new UsernamePasswordAuthenticationToken(new AuthUser("user-9"), null),
            headers
        );

        verify(sessionRegistry).remove("session-2");

        ArgumentCaptor<PresenceMessage> captor = ArgumentCaptor.forClass(PresenceMessage.class);
        verify(messagingTemplate).convertAndSend(org.mockito.ArgumentMatchers.eq("/topic/workflow/workflow-9/presence"), captor.capture());

        PresenceMessage relayed = captor.getValue();
        assertThat(relayed.type()).isEqualTo(PresenceMessage.Type.LEAVE);
        assertThat(relayed.userId()).isEqualTo("user-9");
        assertThat(relayed.clientId()).isEqualTo("client-9");
        assertThat(relayed.workflowId()).isEqualTo("workflow-9");
    }
}
