package org.myweb.flowmat.global.logging;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestCorrelationFilterTest {
    private final RequestCorrelationFilter filter = new RequestCorrelationFilter();

    @Test
    void keepsSafeClientIdAndReplacesOversizedOrUnsafeValues() throws Exception {
        assertEquals("run-request_25", responseId("run-request_25"));
        String oversized = "x".repeat(101);
        String replacement = responseId(oversized);
        assertNotEquals(oversized, replacement);
        assertEquals(32, replacement.length());
        assertTrue(replacement.matches("[0-9a-f]{32}"));
        assertEquals(32, responseId("unsafe value").length());
    }

    private String responseId(String supplied) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
        request.addHeader("X-Request-Id", supplied);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response.getHeader("X-Request-Id");
    }
}
