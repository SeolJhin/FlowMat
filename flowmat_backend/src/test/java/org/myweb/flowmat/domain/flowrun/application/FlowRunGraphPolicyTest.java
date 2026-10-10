package org.myweb.flowmat.domain.flowrun.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.global.exception.BusinessException;

/** Node execution policy read from a published snapshot (docs/domain/flow-run-execution-policy.md EP3-EP4). */
class FlowRunGraphPolicyTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void retryDelaysAreFixedOrDoubledUpToTheCap() {
        FlowRunGraph.NodePolicy fixed = new FlowRunGraph.NodePolicy(null, 3, 60, false, null, null);
        assertEquals(60, fixed.delayBeforeRetry(1));
        assertEquals(60, fixed.delayBeforeRetry(3));
        FlowRunGraph.NodePolicy capped = new FlowRunGraph.NodePolicy(null, 5, 10, true, 35, null);
        assertEquals(10, capped.delayBeforeRetry(1));
        assertEquals(20, capped.delayBeforeRetry(2));
        assertEquals(35, capped.delayBeforeRetry(3));
        FlowRunGraph.NodePolicy uncapped = new FlowRunGraph.NodePolicy(null, 10, 86_400, true, null, null);
        assertEquals(86_400L * 512, uncapped.delayBeforeRetry(10));
        assertEquals(0, FlowRunGraph.NodePolicy.DEFAULT.delayBeforeRetry(1));
    }

    @Test
    void nodesWithoutAPolicyKeepTheDefaultBehavior() throws Exception {
        FlowRunGraph old = FlowRunGraph.from(snapshot(null));
        assertEquals(FlowRunGraph.NodePolicy.DEFAULT, old.policy("a"));
        FlowRunGraph graph = FlowRunGraph.from(snapshot("[{\"processId\":\"b\",\"retryLimit\":0,\"timeoutSeconds\":30,"
            + "\"retryDelaySeconds\":5,\"retryBackoff\":\"exponential\",\"maxRetryDelaySeconds\":20,\"concurrencyLimit\":2}]"));
        assertEquals(FlowRunGraph.NodePolicy.DEFAULT, graph.policy("a"));
        assertEquals(new FlowRunGraph.NodePolicy(30, 0, 5, true, 20, 2), graph.policy("b"));
        FlowRunGraph partial = FlowRunGraph.from(snapshot("[{\"processId\":\"b\",\"concurrencyLimit\":1}]"));
        assertEquals(3, partial.policy("b").retryLimit());
        assertNull(partial.policy("b").timeoutSeconds());
    }

    @Test
    void anInvalidStoredPolicyIsRefused() {
        for (String policies : new String[] {
            "{}",
            "[{\"processId\":\"missing\"}]",
            "[{\"processId\":\"b\",\"retryLimit\":11}]",
            "[{\"processId\":\"b\",\"timeoutSeconds\":0}]",
            "[{\"processId\":\"b\",\"retryBackoff\":\"random\"}]",
            "[{\"processId\":\"b\",\"concurrencyLimit\":1.5}]",
            "[{\"processId\":\"b\"},{\"processId\":\"b\"}]",
        }) {
            assertThrows(BusinessException.class, () -> FlowRunGraph.from(snapshot(policies)), policies);
        }
    }

    private JsonNode snapshot(String nodePolicies) throws Exception {
        return mapper.readTree("{\"processes\":[{\"processId\":\"a\"},{\"processId\":\"b\"}],"
            + "\"connections\":[{\"connectionId\":\"c\",\"fromProcessId\":\"a\",\"toProcessId\":\"b\"}]"
            + (nodePolicies == null ? "" : ",\"nodePolicies\":" + nodePolicies) + "}");
    }
}
