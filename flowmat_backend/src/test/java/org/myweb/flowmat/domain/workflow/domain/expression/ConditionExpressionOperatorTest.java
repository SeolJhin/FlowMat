package org.myweb.flowmat.domain.workflow.domain.expression;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.myweb.flowmat.global.exception.BusinessException;

class ConditionExpressionOperatorTest {

    @ParameterizedTest
    @ValueSource(strings = {"quantity == 2", "unit == 'kg'", "attrs.approved == true"})
    void doubleEqualsIsRejectedForRecognizedOperands(String source) {
        assertThatThrownBy(() -> ConditionExpression.compile(source))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Invalid condition at position")
            .hasMessageContaining("==");
    }

    @ParameterizedTest
    @CsvSource({"=,2,true", "!=,2,false", "<,3,true", "<=,2,true", ">,1,true", ">=,2,true"})
    void theSixContractOperatorsStillEvaluateNumericComparisons(String operator, int right, boolean expected) {
        ConditionExpression expression = ConditionExpression.compile("quantity " + operator + " " + right);
        assertThat(expression.evaluate(Map.of("quantity", new BigDecimal("2.00")))).isEqualTo(expected);
    }
}
