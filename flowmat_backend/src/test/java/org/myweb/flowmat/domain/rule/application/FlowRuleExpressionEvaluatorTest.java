package org.myweb.flowmat.domain.rule.application;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.global.exception.BusinessException;

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

    @Test
    void combinesComparisonsWithAndOrNot() {
        Map<String, Object> facts = Map.of("qty", new BigDecimal("50"), "status", "draft");

        assertTrue(evaluator.evaluate("expression", "qty > 10 && status == draft", facts));
        assertFalse(evaluator.evaluate("expression", "qty > 10 and status == done", facts));
        assertTrue(evaluator.evaluate("expression", "qty > 100 || status == draft", facts));
        assertTrue(evaluator.evaluate("expression", "qty > 100 OR status == draft", facts));
        assertTrue(evaluator.evaluate("expression", "!(qty > 100)", facts));
        assertTrue(evaluator.evaluate("expression", "not status == done", facts));
        assertTrue(evaluator.evaluate("expression", "qty != 3 && !(status == done)", facts));
    }

    @Test
    void andBindsTighterThanOrAndParenthesesOverride() {
        Map<String, Object> facts = Map.of("a", new BigDecimal("1"), "b", new BigDecimal("0"), "c", new BigDecimal("0"));

        // a==1 || (b==1 && c==1)
        assertTrue(evaluator.evaluate("expression", "a == 1 || b == 1 && c == 1", facts));
        // (a==1 || b==1) && c==1
        assertFalse(evaluator.evaluate("expression", "(a == 1 || b == 1) && c == 1", facts));
    }

    @Test
    void keywordsInsideQuotesOrWordsAreNotOperators() {
        Map<String, Object> facts = Map.of("mode", "and or", "brand", "x", "orderQty", new BigDecimal("2"));

        assertTrue(evaluator.evaluate("expression", "mode == 'and or'", facts));
        assertTrue(evaluator.evaluate("expression", "brand == x && orderQty >= 2", facts));
    }

    @Test
    void malformedExpressionsNeverMatchAndFailValidation() {
        for (String bad : new String[] {"", "qty >", "qty > 1 &&", "(qty > 1", "qty > 1)", "qty", "'unclosed == 1", "&& qty > 1"}) {
            assertFalse(evaluator.evaluate("expression", bad, Map.of("qty", 5)), bad);
            assertThrows(BusinessException.class, () -> evaluator.validate(bad), bad);
        }
    }

    @Test
    void validAndLegacyExpressionsPassValidation() {
        assertDoesNotThrow(() -> evaluator.validate("processIo.quantity <= 20"));
        assertDoesNotThrow(() -> evaluator.validate("(a > 1 or b < 2) and not c == 'x'"));
    }

    private record RequestFact(String direction) {
    }
}
