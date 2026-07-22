package org.myweb.flowmat.global.websocket;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.security.AuthUser;
import org.myweb.flowmat.global.security.JwtProvider;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * STOMP CONNECT 프레임의 Authorization 헤더에서 토큰을 추출해 Principal 을 설정한다.
 * JwtProvider 가 실제 JWT 검증을 담당하며, 현재는 pass-through 스텁 상태.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern WORKFLOW_DESTINATION =
        Pattern.compile("^/(?:topic|app)/workflow/([^/]+)/(?:presence|node-move|graph)$");

    private final JwtProvider jwtProvider;
    private final ProjectAccessService projectAccessService;

    public StompAuthChannelInterceptor(JwtProvider jwtProvider, ProjectAccessService projectAccessService) {
        this.jwtProvider = jwtProvider;
        this.projectAccessService = projectAccessService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authorization = accessor.getFirstNativeHeader("Authorization");
            if (authorization == null || !authorization.startsWith("Bearer ")) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Missing STOMP Authorization header.");
            }

            String token = authorization.substring(7).trim();
            jwtProvider.validate(token);
            if (!jwtProvider.isAccessToken(token)) {
                throw new BusinessException(ErrorCode.TOKEN_TYPE_INVALID);
            }

            String userId = jwtProvider.resolveUserId(token);
            if (userId == null || userId.isBlank()) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Unable to resolve authenticated STOMP user.");
            }

            AuthUser authUser = new AuthUser(userId);
            UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(authUser, null, authUser.getAuthorities());
            accessor.setUser(authentication);
        }

        boolean workflowFrame =
            accessor.getDestination() != null
                && (
                    accessor.getDestination().startsWith("/topic/workflow/")
                        || accessor.getDestination().startsWith("/app/workflow/")
                );
        if ((StompCommand.SEND.equals(accessor.getCommand()) || StompCommand.SUBSCRIBE.equals(accessor.getCommand()))
            && workflowFrame) {
            if (accessor.getUser() == null) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Unauthenticated STOMP frame.");
            }
            Matcher matcher = WORKFLOW_DESTINATION.matcher(accessor.getDestination());
            if (matcher.matches()) {
                String workflowId = matcher.group(1);
                String userId;
                if (accessor.getUser() instanceof UsernamePasswordAuthenticationToken auth
                    && auth.getPrincipal() instanceof AuthUser authUser) {
                    userId = authUser.getUserId();
                } else {
                    userId = accessor.getUser().getName();
                }
                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    projectAccessService.requireWorkflowReadAccess(workflowId, userId);
                } else {
                    projectAccessService.requireWorkflowWriteAccess(workflowId, userId);
                }
            }
        }

        return message;
    }
}
