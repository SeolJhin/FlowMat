package org.myweb.flowmat.domain.flowrun.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRunStep;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRunStepAttempt;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunStepAttemptRepository;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunStepRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Component;

/**
 * Creates the steps a finished step's output routes to, and passes Exclusive gateways at once as the system
 * (docs/architecture/adr/ADR-006-operation-types.md decisions 2-4): a gateway step completes with its input as its output
 * and goes on by priority, else by its default connection. When it finds neither, its step fails with NO_ROUTE and the
 * caller fails the run. A transfer rule of the chosen connection that does not pass rejects the whole report, as for any
 * step (GR-04).
 */
@Component
@RequiredArgsConstructor
class FlowRunRouter {
    static final String NO_ROUTE = "NO_ROUTE";

    private final FlowRunStepRepository stepRepository;
    private final FlowRunStepAttemptRepository attemptRepository;
    private final FlowRunEventRecorder eventRecorder;
    private final IdGenerator idGenerator;
    private final ObjectMapper objectMapper;

    /** Null when everything went on; else why an Exclusive gateway on the way found no connection. {@code actorId} null is the system. */
    String follow(String runId, FlowRunGraph graph, String sourceStepId, List<FlowRunGraph.Decision> decisions,
        JsonNode output, String actorId) {
        for (FlowRunGraph.Decision decision : decisions) {
            if (!decision.willRoute()) {
                eventRecorder.record(runId, sourceStepId, "connection_filtered", objectMapper.createObjectNode()
                    .put("connectionId", decision.connectionId())
                    .put("targetNodeId", decision.targetNodeId())
                    .put("reason", decision.reason() == null ? "condition_false" : decision.reason()), actorId);
                continue;
            }
            if (decision.reason() != null) {
                eventRecorder.record(runId, sourceStepId, "gateway_routed", objectMapper.createObjectNode()
                    .put("connectionId", decision.connectionId())
                    .put("targetNodeId", decision.targetNodeId())
                    .put("reason", decision.reason()), actorId);
            }
            FlowRunStep step = createStep(runId, sourceStepId, decision, output, actorId);
            if (graph.exclusive(step.getNodeId())) {
                String failure = pass(runId, graph, step);
                if (failure != null) {
                    return failure;
                }
            }
        }
        return null;
    }

    private String pass(String runId, FlowRunGraph graph, FlowRunStep step) {
        JsonNode input = readJson(step.getInputSnapshot());
        List<FlowRunGraph.Decision> decisions = graph.preview(step.getNodeId(), input);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        FlowRunStepAttempt attempt = new FlowRunStepAttempt();
        attempt.setAttemptId(idGenerator.generate());
        attempt.setStepId(step.getStepId());
        attempt.setAttemptNo(1);
        attempt.setStartedAt(now);
        attempt.setEndedAt(now);
        step.setStartedAt(now);
        step.setEndedAt(now);
        eventRecorder.record(runId, step.getStepId(), "step_started", objectMapper.createObjectNode().put("attemptNo", 1), null);
        if (decisions.stream().noneMatch(FlowRunGraph.Decision::willRoute)) {
            String message = "Exclusive gateway " + step.getNodeId()
                + " found no connection whose condition holds and has no default connection.";
            attempt.setStatus("failed");
            attempt.setErrorCode(NO_ROUTE);
            attempt.setErrorMessage(message);
            step.setStatus("failed");
            step.setErrorCode(NO_ROUTE);
            step.setErrorMessage(message);
            attemptRepository.save(attempt);
            stepRepository.saveAndFlush(step);
            for (FlowRunGraph.Decision decision : decisions) {
                eventRecorder.record(runId, step.getStepId(), "connection_filtered", objectMapper.createObjectNode()
                    .put("connectionId", decision.connectionId())
                    .put("targetNodeId", decision.targetNodeId())
                    .put("reason", decision.reason()), null);
            }
            eventRecorder.record(runId, step.getStepId(), "step_failed", objectMapper.createObjectNode()
                .put("errorCode", NO_ROUTE).put("errorMessage", message), null);
            return message;
        }
        attempt.setStatus("completed");
        step.setStatus("completed");
        step.setOutputSnapshot(writeJson(input));
        attemptRepository.save(attempt);
        stepRepository.saveAndFlush(step);
        eventRecorder.record(runId, step.getStepId(), "step_completed", input, null);
        return follow(runId, graph, step.getStepId(), decisions, input, null);
    }

    private FlowRunStep createStep(String runId, String sourceStepId, FlowRunGraph.Decision decision, JsonNode input,
        String actorId) {
        long nextSequence = stepRepository.countByFlowRunId(runId) + 1;
        if (nextSequence > Integer.MAX_VALUE) {
            throw new BusinessException(ErrorCode.CONFLICT, "Flow run has too many steps.");
        }
        FlowRunStep step = new FlowRunStep();
        step.setStepId(idGenerator.generate());
        step.setFlowRunId(runId);
        step.setNodeId(decision.targetNodeId());
        step.setSourceConnectionId(decision.connectionId());
        step.setSourceStepId(sourceStepId);
        step.setStatus("planned");
        step.setSequenceNo((int) nextSequence);
        step.setInputSnapshot(writeJson(input));
        stepRepository.saveAndFlush(step);
        eventRecorder.record(runId, step.getStepId(), "step_created", input, actorId);
        return step;
    }

    private String writeJson(JsonNode value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Flow run step snapshot could not be serialized.", exception);
        }
    }

    private JsonNode readJson(String value) {
        try {
            return value == null ? objectMapper.createObjectNode() : objectMapper.readTree(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Flow run step snapshot could not be read.", exception);
        }
    }
}
