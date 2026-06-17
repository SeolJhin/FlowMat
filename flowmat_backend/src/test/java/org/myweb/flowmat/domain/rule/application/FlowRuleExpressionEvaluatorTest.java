package org.myweb.flowmat.domain.rule.application;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FlowRuleExpressionEvaluatorTest {

    private FlowRuleExpressionEvaluator evaluator;

    @BeforeEach
    void setUp() {
        evaluator = new FlowRuleExpressionEvaluator(new ObjectMapper());
    }

    @Test
    void evaluatesNumericComparisonAcrossNestedFacts() {
        Map<String, Object> facts = Map.of(
            "inventory", Map.of("availableQuantity", new BigDecimal("8")),
            "requestQuantity", new BigDecimal("10")
        );

        assertTrue(evaluator.evaluate("expression", "inventory.availableQuantity < requestQuantity", facts));
    }

    @Test
    void evaluatesStringEqualityAcrossNestedFacts() {
        Map<String, Object> facts = Map.of(
            "request", new RequestFact("input")
        );

        assertTrue(evaluator.evaluate("expression", "request.direction == input", facts));
        assertFalse(evaluator.evaluate("expression", "request.direction == output", facts));
    }

    @Test
    void supportsAlwaysConditionType() {
        assertTrue(evaluator.evaluate("always", "", Map.of()));
    }

    private record RequestFact(String direction) {
    }
}
