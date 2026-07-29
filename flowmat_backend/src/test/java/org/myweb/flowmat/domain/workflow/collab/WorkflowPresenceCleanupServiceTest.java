package org.myweb.flowmat.domain.workflow.collab;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.workflow.collab.dto.PresenceMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class WorkflowPresenceCleanupServiceTest {

    @Mock
    private WorkflowSessionRegistry sessionRegistry;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private WorkflowCollabProperties collabProperties;

    @InjectMocks
    private WorkflowPresenceCleanupService cleanupService;

    @Test
    void cleanupBroadcastsLeaveForRemovedStaleSession() {
        WorkflowSessionRecord staleSession = new WorkflowSessionRecord(
            "session-1",
            "user-1",
            "workflow-1",
            "client-1",
            null,
            null,
            null,
            1L
        );

        when(sessionRegistry.findStaleSessions(anyLong())).thenReturn(List.of(staleSession));
        when(sessionRegistry.removeIfStale(org.mockito.ArgumentMatchers.eq("session-1"), anyLong())).thenReturn(staleSession);
        WorkflowCollabProperties.Presence presence = new WorkflowCollabProperties.Presence();
        presence.setHeartbeatTimeout(Duration.ofSeconds(45));
        when(collabProperties.getPresence()).thenReturn(presence);

        cleanupService.cleanupStaleSessions();

        ArgumentCaptor<PresenceMessage> captor = ArgumentCaptor.forClass(PresenceMessage.class);
        verify(messagingTemplate).convertAndSend(org.mockito.ArgumentMatchers.eq("/topic/workflow/workflow-1/presence"), captor.capture());

        PresenceMessage leave = captor.getValue();
        assertThat(leave.type()).isEqualTo(PresenceMessage.Type.LEAVE);
        assertThat(leave.userId()).isEqualTo("user-1");
        assertThat(leave.clientId()).isNull();
        assertThat(leave.workflowId()).isEqualTo("workflow-1");
    }
}
