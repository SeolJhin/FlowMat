package org.myweb.flowmat.global.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.security.AuthUser;
import org.myweb.flowmat.global.security.JwtProvider;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

@ExtendWith(MockitoExtension.class)
class StompAuthChannelInterceptorTest {

    @Mock
    private ProjectAccessService projectAccessService;

    private final JwtProvider jwtProvider = new JwtProvider(
        "flowmat-local-dev-secret-key-32bytes!!",
        3600,
        2592000
    );

    @Test
    void connectWithAccessTokenSetsAuthenticatedPrincipal() {
        StompAuthChannelInterceptor interceptor = new StompAuthChannelInterceptor(jwtProvider, projectAccessService);
        String accessToken = jwtProvider.generateAccessToken("user-1");
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.setNativeHeader("Authorization", "Bearer " + accessToken);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> intercepted = interceptor.preSend(message, null);
        StompHeaderAccessor result = StompHeaderAccessor.wrap(intercepted);

        assertThat(result.getUser()).isInstanceOf(UsernamePasswordAuthenticationToken.class);
        UsernamePasswordAuthenticationToken authentication =
            (UsernamePasswordAuthenticationToken) result.getUser();
        assertThat(authentication.getPrincipal()).isInstanceOf(AuthUser.class);
        assertThat(((AuthUser) authentication.getPrincipal()).getUserId()).isEqualTo("user-1");
    }

    @Test
    void connectRejectsRefreshToken() {
        StompAuthChannelInterceptor interceptor = new StompAuthChannelInterceptor(jwtProvider, projectAccessService);
        String refreshToken = jwtProvider.generateRefreshToken("user-1");
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.setNativeHeader("Authorization", "Bearer " + refreshToken);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, null))
            .isInstanceOf(BusinessException.class)
            .extracting("errorCode")
            .isEqualTo(ErrorCode.TOKEN_TYPE_INVALID);
    }

    @Test
    void workflowSubscribeRequiresAuthenticatedUser() {
        StompAuthChannelInterceptor interceptor = new StompAuthChannelInterceptor(jwtProvider, projectAccessService);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setLeaveMutable(true);
        accessor.setDestination("/topic/workflow/workflow-1/presence");
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, null))
            .isInstanceOf(BusinessException.class)
            .extracting("errorCode")
            .isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void workflowSendChecksWorkflowMembership() {
        StompAuthChannelInterceptor interceptor = new StompAuthChannelInterceptor(jwtProvider, projectAccessService);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setLeaveMutable(true);
        accessor.setDestination("/app/workflow/workflow-7/presence");
        accessor.setUser(new UsernamePasswordAuthenticationToken(new AuthUser("user-7"), null));
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        interceptor.preSend(message, null);

        verify(projectAccessService).requireWorkflowWriteAccess("workflow-7", "user-7");
    }

    @Test
    void workflowSubscribeChecksWorkflowReadMembership() {
        StompAuthChannelInterceptor interceptor = new StompAuthChannelInterceptor(jwtProvider, projectAccessService);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setLeaveMutable(true);
        accessor.setDestination("/topic/workflow/workflow-8/graph");
        accessor.setUser(new UsernamePasswordAuthenticationToken(new AuthUser("user-8"), null));
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        interceptor.preSend(message, null);

        verify(projectAccessService).requireWorkflowReadAccess("workflow-8", "user-8");
    }
}
