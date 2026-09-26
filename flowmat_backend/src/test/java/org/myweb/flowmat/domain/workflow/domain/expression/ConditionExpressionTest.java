package org.myweb.flowmat.domain.workflow.domain.expression;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.global.exception.BusinessException;

class ConditionExpressionTest {
    @Test
    void evaluatesBooleanLogicNumbersStringsAndAttributes() {
        var expression = ConditionExpression.compile(
            "quantity >= 2 and (unit = 'kg' or attrs.approved = true) and not item = 'blocked'");
        assertTrue(expression.evaluate(Map.of("quantity", 2, "unit", "ea", "item", "allowed",
            "attrs", Map.of("approved", true))));
        assertFalse(expression.evaluate(Map.of("quantity", 1, "unit", "kg", "item", "allowed")));
        assertFalse(ConditionExpression.compile("attrs.missing = 1")
            .evaluate(Map.of("attrs", Map.of("present", 1))));
        assertFalse(ConditionExpression.compile("quantity > '2'").evaluate(Map.of("quantity", 3)));
    }

    @Test
    void rejectsFunctionsUnknownVariablesInvalidSyntaxAndOverlongInput() {
        assertThrows(BusinessException.class, () -> ConditionExpression.compile("sum(quantity) > 2"));
        assertThrows(BusinessException.class, () -> ConditionExpression.compile("approved == true"));
        assertThrows(BusinessException.class, () -> ConditionExpression.compile("quantity >"));
        assertThrows(BusinessException.class, () -> ConditionExpression.compile("a".repeat(501)));
    }
}
