package org.myweb.flowmat.domain.flowrun.application;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.myweb.flowmat.domain.workflow.domain.contract.PortSchema;
import org.myweb.flowmat.domain.workflow.domain.expression.ConditionExpression;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;

/** Runtime interpretation of a published revision; draft rows are never consulted. */
final class FlowRunGraph {
    private static final Set<String> POLICIES = Set.of("stop", "skip", "retry");

    record Route(String connectionId, String targetNodeId) {}
    record Decision(String connectionId, String targetNodeId, boolean willRoute) {}

    /**
     * A node's execution policy from its published revision; nodes without one run as before: no time limit, 3 retries
     * at once, no concurrency limit (docs/domain/flow-run-execution-policy.md EP1, EP3).
     */
    record NodePolicy(Integer timeoutSeconds, int retryLimit, int retryDelaySeconds, boolean exponential,
        Integer maxRetryDelaySeconds, Integer concurrencyLimit) {
        static final NodePolicy DEFAULT = new NodePolicy(null, 3, 0, false, null, null);

        /** Seconds to wait before retry {@code retryNumber} (1 first): fixed, or doubled each time up to the cap (EP4). */
        long delayBeforeRetry(int retryNumber) {
            if (retryDelaySeconds == 0) return 0;
            if (!exponential) return retryDelaySeconds;
            // The delay is at most 86 400 (< 2^17) and the shift at most 40, so this cannot overflow.
            long delay = (long) retryDelaySeconds << Math.min(Math.max(retryNumber - 1, 0), 40);
            return maxRetryDelaySeconds == null ? delay : Math.min(delay, maxRetryDelaySeconds);
        }
    }

    private record PortRef(String processId, String direction) {}

    private record Edge(String id, String target, String fromIoId, String toIoId,
        ConditionExpression condition, BigDecimal capacity, String unit, String failurePolicy) {}

    private final List<String> roots;
    private final Map<String, List<Edge>> outgoing;
    private final Map<String, Edge> byId;
    private final Map<String, ConditionExpression> portRules;
    private final Map<String, PortSchema> portSchemas;
    private final Map<String, NodePolicy> policies;

    private FlowRunGraph(List<String> roots, Map<String, List<Edge>> outgoing, Map<String, Edge> byId,
        Map<String, ConditionExpression> portRules, Map<String, PortSchema> portSchemas, Map<String, NodePolicy> policies) {
        this.roots = List.copyOf(roots);
        this.outgoing = outgoing;
        this.byId = byId;
        this.portRules = portRules;
        this.portSchemas = portSchemas;
        this.policies = policies;
    }

    static FlowRunGraph from(JsonNode snapshot) {
        JsonNode processes = snapshot.path("processes");
        JsonNode connections = snapshot.path("connections");
        if (!processes.isArray() || processes.isEmpty() || !connections.isArray()) {
            throw conflict("Published revision has no executable graph.");
        }
        Map<String, Integer> indegree = new LinkedHashMap<>();
        for (JsonNode process : processes) {
            String id = requiredText(process, "processId");
            if (indegree.putIfAbsent(id, 0) != null) {
                throw conflict("Published revision has duplicate process IDs.");
            }
        }
        Map<String, NodePolicy> policies = new HashMap<>();
        JsonNode nodePolicies = snapshot.path("nodePolicies");
        if (!nodePolicies.isMissingNode() && !nodePolicies.isNull()) {
            if (!nodePolicies.isArray()) {
                throw conflict("Published revision has invalid nodePolicies.");
            }
            for (JsonNode policy : nodePolicies) {
                String processId = requiredText(policy, "processId");
                if (!indegree.containsKey(processId) || policies.putIfAbsent(processId, policy(policy, processId)) != null) {
                    throw conflict("Published revision has an invalid node policy: " + processId);
                }
            }
        }
        Map<String, String> portUnits = new HashMap<>();
        Map<String, PortRef> portRefs = new HashMap<>();
        Map<String, ConditionExpression> portRules = new HashMap<>();
        Map<String, PortSchema> portSchemas = new HashMap<>();
        JsonNode ports = snapshot.path("processIos");
        if (!ports.isMissingNode() && !ports.isArray()) {
            throw conflict("Published revision has invalid processIos.");
        }
        if (ports.isArray()) {
            for (JsonNode port : ports) {
                String id = textOrNull(port.path("processIoId"));
                if (id == null || portRefs.putIfAbsent(id,
                    new PortRef(textOrNull(port.path("processId")), textOrNull(port.path("direction")))) != null) {
                    throw conflict("Published revision has an invalid or duplicate processIoId.");
                }
                String unit = textOrNull(port.path("unit"));
                if (id != null && unit != null) portUnits.put(id, unit);
                String validationRule = textOrNull(port.path("validationRule"));
                if (id != null && validationRule != null) {
                    portRules.put(id, compilePublished(validationRule,
                        "port " + id + " validationRule"));
                }
                if (id != null && port.hasNonNull("schemaJson")) {
                    try {
                        portSchemas.put(id, PortSchema.parse(port.get("schemaJson")));
                    } catch (BusinessException exception) {
                        throw conflict("Published revision port " + id + " has invalid schemaJson.");
                    }
                }
            }
        }
        Map<String, List<Edge>> outgoing = new HashMap<>();
        Map<String, Edge> byId = new HashMap<>();
        for (JsonNode connection : connections) {
            String id = requiredText(connection, "connectionId");
            String source = requiredText(connection, "fromProcessId");
            String target = requiredText(connection, "toProcessId");
            if (!indegree.containsKey(source) || !indegree.containsKey(target)) {
                throw conflict("Published revision connection refers to a missing process: " + id);
            }
            String expression = textOrNull(connection.path("conditionExpr"));
            ConditionExpression condition = expression == null ? null
                : compilePublished(expression, "connection " + id + " conditionExpr");
            JsonNode capacityNode = connection.path("capacity");
            BigDecimal capacity = null;
            if (!capacityNode.isMissingNode() && !capacityNode.isNull()) {
                if (!capacityNode.isNumber() || capacityNode.decimalValue().signum() < 0) {
                    throw conflict("Published revision has invalid capacity: " + id);
                }
                capacity = capacityNode.decimalValue();
            }
            String policy = textOrNull(connection.path("failurePolicy"));
            if (policy == null) policy = "stop";
            if (!POLICIES.contains(policy)) {
                throw conflict("Published revision has invalid failure policy: " + id);
            }
            String fromIoId = textOrNull(connection.path("fromIoId"));
            String toIoId = textOrNull(connection.path("toIoId"));
            requirePortReference(portRefs, fromIoId, source, "output", id);
            requirePortReference(portRefs, toIoId, target, "input", id);
            String unit = textOrNull(connection.path("unit"));
            if (unit == null) unit = portUnits.get(fromIoId);
            Edge edge = new Edge(id, target, fromIoId, toIoId, condition, capacity, unit, policy);
            if (byId.putIfAbsent(id, edge) != null) {
                throw conflict("Published revision has duplicate connection IDs.");
            }
            outgoing.computeIfAbsent(source, ignored -> new ArrayList<>()).add(edge);
            indegree.put(target, indegree.get(target) + 1);
        }
        List<String> roots = indegree.entrySet().stream()
            .filter(entry -> entry.getValue() == 0).map(Map.Entry::getKey).toList();
        Map<String, Integer> remaining = new HashMap<>(indegree);
        ArrayDeque<String> queue = new ArrayDeque<>(roots);
        int visited = 0;
        while (!queue.isEmpty()) {
            String node = queue.removeFirst();
            visited++;
            for (Edge edge : outgoing.getOrDefault(node, List.of())) {
                int count = remaining.merge(edge.target(), -1, Integer::sum);
                if (count == 0) queue.addLast(edge.target());
            }
        }
        if (visited != indegree.size()) {
            throw conflict("Graph revisions with cycles cannot execute.");
        }
        return new FlowRunGraph(roots, outgoing, byId, portRules, portSchemas, policies);
    }

    List<String> roots() {
        return roots;
    }

    NodePolicy policy(String nodeId) {
        return policies.getOrDefault(nodeId, NodePolicy.DEFAULT);
    }

    String failurePolicy(String sourceConnectionId) {
        if (sourceConnectionId == null) return "stop";
        Edge edge = byId.get(sourceConnectionId);
        if (edge == null) throw conflict("Step source connection is missing from its published revision.");
        return edge.failurePolicy();
    }

    List<Route> routes(String nodeId, JsonNode output) {
        return preview(nodeId, output).stream().filter(Decision::willRoute)
            .map(decision -> new Route(decision.connectionId(), decision.targetNodeId())).toList();
    }

    List<Decision> preview(String nodeId, JsonNode output) {
        if (output == null || !output.isObject()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Graph step outputSnapshot must be an object.");
        }
        Map<String, Object> values = values(output);
        List<Decision> decisions = new ArrayList<>();
        for (Edge edge : outgoing.getOrDefault(nodeId, List.of())) {
            if (edge.condition() != null && !edge.condition().evaluate(values)) {
                decisions.add(new Decision(edge.id(), edge.target(), false));
                continue;
            }
            if (edge.capacity() != null) {
                Object quantity = values.get("quantity");
                if (!(quantity instanceof BigDecimal amount)) {
                    throw conflict("Connection " + edge.id() + " requires outputSnapshot.quantity for capacity.");
                }
                if (amount.compareTo(edge.capacity()) > 0) {
                    throw conflict("Connection " + edge.id() + " capacity exceeded.");
                }
            }
            Object actualUnit = values.get("unit");
            if (edge.unit() != null && actualUnit != null && !edge.unit().equals(actualUnit)) {
                throw conflict("Connection " + edge.id() + " unit does not match outputSnapshot.unit.");
            }
            requirePortSchema(edge.fromIoId(), output);
            requirePortSchema(edge.toIoId(), output);
            requirePortRule(edge.fromIoId(), values);
            requirePortRule(edge.toIoId(), values);
            decisions.add(new Decision(edge.id(), edge.target(), true));
        }
        return decisions;
    }

    private void requirePortRule(String portId, Map<String, Object> values) {
        if (portId == null) return;
        ConditionExpression rule = portRules.get(portId);
        if (rule != null && !rule.evaluate(values)) {
            throw conflict("Port " + portId + " validationRule did not pass.");
        }
    }

    private void requirePortSchema(String portId, JsonNode output) {
        if (portId == null) return;
        PortSchema schema = portSchemas.get(portId);
        if (schema == null) return;
        JsonNode attrs = output.path("attrs");
        if (!attrs.isMissingNode() && !attrs.isObject()) {
            throw conflict("Port " + portId + " outputSnapshot.attrs must be an object.");
        }
        for (String name : schema.required()) {
            if (!attrs.hasNonNull(name)) {
                throw conflict("Port " + portId + " requires outputSnapshot.attrs." + name + ".");
            }
        }
        for (Map.Entry<String, String> property : schema.properties().entrySet()) {
            JsonNode value = attrs.get(property.getKey());
            if (value == null) continue;
            boolean valid = switch (property.getValue()) {
                case "string" -> value.isTextual();
                case "number" -> value.isNumber();
                case "boolean" -> value.isBoolean();
                default -> false;
            };
            if (!valid) {
                throw conflict("Port " + portId + " outputSnapshot.attrs." + property.getKey()
                    + " must be " + property.getValue() + ".");
            }
        }
    }

    private static Map<String, Object> values(JsonNode output) {
        Map<String, Object> values = new HashMap<>();
        for (String field : List.of("quantity", "unit", "item")) {
            JsonNode node = output.get(field);
            if (node != null) values.put(field, value(node));
        }
        JsonNode attrs = output.path("attrs");
        if (attrs.isObject()) {
            Map<String, Object> attributes = new HashMap<>();
            attrs.fields().forEachRemaining(entry -> attributes.put(entry.getKey(), value(entry.getValue())));
            values.put("attrs", attributes);
        }
        return values;
    }

    private static Object value(JsonNode node) {
        if (node.isNumber()) return node.decimalValue();
        if (node.isTextual()) return node.textValue();
        if (node.isBoolean()) return node.booleanValue();
        return null;
    }

    private static NodePolicy policy(JsonNode node, String processId) {
        Integer timeout = bounded(node, "timeoutSeconds", 1, 604_800, processId);
        Integer limit = bounded(node, "retryLimit", 0, 10, processId);
        Integer delay = bounded(node, "retryDelaySeconds", 0, 86_400, processId);
        String backoff = textOrNull(node.path("retryBackoff"));
        if (backoff != null && !"fixed".equals(backoff) && !"exponential".equals(backoff)) {
            throw conflict("Published revision has an invalid node policy: " + processId);
        }
        Integer cap = bounded(node, "maxRetryDelaySeconds", 0, 604_800, processId);
        Integer concurrency = bounded(node, "concurrencyLimit", 1, 1000, processId);
        return new NodePolicy(timeout, limit == null ? NodePolicy.DEFAULT.retryLimit() : limit, delay == null ? 0 : delay,
            "exponential".equals(backoff), cap, concurrency);
    }

    private static Integer bounded(JsonNode node, String field, int min, int max, String processId) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.intValue() < min || value.intValue() > max) {
            throw conflict("Published revision has an invalid node policy: " + processId);
        }
        return value.intValue();
    }

    private static String requiredText(JsonNode node, String field) {
        String value = textOrNull(node.path(field));
        if (value == null) throw conflict("Published revision has an invalid " + field + ".");
        return value;
    }

    private static ConditionExpression compilePublished(String expression, String field) {
        try {
            return ConditionExpression.compile(expression);
        } catch (BusinessException exception) {
            throw conflict("Published revision has invalid " + field + ".");
        }
    }

    private static void requirePortReference(Map<String, PortRef> portRefs, String portId,
        String processId, String direction, String connectionId) {
        if (portId == null) return;
        PortRef port = portRefs.get(portId);
        if (port == null || !processId.equals(port.processId()) || !direction.equals(port.direction())) {
            throw conflict("Published revision connection " + connectionId
                + " has an invalid " + ("output".equals(direction) ? "fromIoId" : "toIoId") + ".");
        }
    }

    private static String textOrNull(JsonNode node) {
        return node.isTextual() && !node.textValue().isBlank() ? node.textValue() : null;
    }

    private static BusinessException conflict(String message) {
        return new BusinessException(ErrorCode.CONFLICT, message);
    }
}
