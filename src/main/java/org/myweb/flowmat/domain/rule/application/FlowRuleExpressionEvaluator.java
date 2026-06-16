package org.myweb.flowmat.domain.rule.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class FlowRuleExpressionEvaluator {

    private static final Pattern COMPARISON_PATTERN =
        Pattern.compile("^\\s*(.+?)\\s*(==|!=|>=|<=|>|<)\\s*(.+?)\\s*$");

    private final ObjectMapper objectMapper;

    public FlowRuleExpressionEvaluator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public boolean evaluate(String conditionType, String conditionExpression, Map<String, Object> facts) {
        String normalizedType = normalize(conditionType);
        if ("always".equals(normalizedType)) {
            return true;
        }
        if ("never".equals(normalizedType)) {
            return false;
        }

        Matcher matcher = COMPARISON_PATTERN.matcher(conditionExpression == null ? "" : conditionExpression);
        if (!matcher.matches()) {
            return false;
        }

        Object left = resolveToken(matcher.group(1), facts);
        Object right = resolveToken(matcher.group(3), facts);
        return compare(left, matcher.group(2), right);
    }

    private Object resolveToken(String token, Map<String, Object> facts) {
        String trimmed = token.trim();
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
            return trimmed.substring(1, trimmed.length() - 1);
        }
        if ("null".equalsIgnoreCase(trimmed)) {
            return null;
        }
        if ("true".equalsIgnoreCase(trimmed) || "false".equalsIgnoreCase(trimmed)) {
            return Boolean.parseBoolean(trimmed);
        }
        if (isNumeric(trimmed)) {
            return new BigDecimal(trimmed);
        }

        Object resolved = resolvePath(facts, trimmed);
        return resolved != null ? resolved : trimmed;
    }

    private Object resolvePath(Map<String, Object> facts, String path) {
        String[] segments = path.split("\\.");
        Object current = facts.get(segments[0]);
        if (current == null) {
            return null;
        }

        for (int i = 1; i < segments.length; i++) {
            if (current == null) {
                return null;
            }
            if (current instanceof Map<?, ?> map) {
                current = map.get(segments[i]);
                continue;
            }
            Map<String, Object> valueMap = objectMapper.convertValue(current, new TypeReference<Map<String, Object>>() {
            });
            current = valueMap.get(segments[i]);
        }
        return current;
    }

    private boolean compare(Object left, String operator, Object right) {
        if ("==".equals(operator)) {
            return compareEquality(left, right);
        }
        if ("!=".equals(operator)) {
            return !compareEquality(left, right);
        }

        BigDecimal leftNumber = toBigDecimal(left);
        BigDecimal rightNumber = toBigDecimal(right);
        if (leftNumber == null || rightNumber == null) {
            return false;
        }

        int compareResult = leftNumber.compareTo(rightNumber);
        return switch (operator) {
            case ">" -> compareResult > 0;
            case ">=" -> compareResult >= 0;
            case "<" -> compareResult < 0;
            case "<=" -> compareResult <= 0;
            default -> false;
        };
    }

    private boolean compareEquality(Object left, Object right) {
        BigDecimal leftNumber = toBigDecimal(left);
        BigDecimal rightNumber = toBigDecimal(right);
        if (leftNumber != null && rightNumber != null) {
            return leftNumber.compareTo(rightNumber) == 0;
        }
        if (left == null || right == null) {
            return left == right;
        }
        return String.valueOf(left).equals(String.valueOf(right));
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        if (value instanceof String stringValue && isNumeric(stringValue.trim())) {
            return new BigDecimal(stringValue.trim());
        }
        return null;
    }

    private boolean isNumeric(String value) {
        try {
            new BigDecimal(value);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private String normalize(String value) {
        return value == null ? "expression" : value.trim().toLowerCase();
    }
}
