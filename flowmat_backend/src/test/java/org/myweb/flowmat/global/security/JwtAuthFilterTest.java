package org.myweb.flowmat.global.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class JwtAuthFilterTest {

    private final JwtAuthFilter filter = new JwtAuthFilter(new JwtProvider(
        "flowmat-local-dev-secret-key-32bytes!!",
        3600,
        2592000
    ));

    @Test
    void publicAuthEndpointsSkipJwtFilter() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/refresh");
        request.setServletPath("/auth/refresh");

        assertThat(filter.shouldNotFilter(request)).isTrue();
    }

    @Test
    void websocketHandshakeSkipsJwtFilter() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/ws/websocket");
        request.setServletPath("/ws/websocket");

        assertThat(filter.shouldNotFilter(request)).isTrue();
    }

    @Test
    void protectedApiStillUsesJwtFilter() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/users/me");
        request.setServletPath("/users/me");

        assertThat(filter.shouldNotFilter(request)).isFalse();
    }
}
