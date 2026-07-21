package org.myweb.flowmat.global.websocket;

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

    private final JwtProvider jwtProvider;

    public StompAuthChannelInterceptor(JwtProvider jwtProvider) {
        this.jwtProvider = jwtProvider;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authorization = accessor.getFirstNativeHeader("Authorization");
            if (authorization != null && authorization.startsWith("Bearer ")) {
                String userId = jwtProvider.resolveUserId(authorization.substring(7));
                AuthUser authUser = new AuthUser(userId);
                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(authUser, null, authUser.getAuthorities());
                accessor.setUser(authentication);
            }
        }

        return message;
    }
}
