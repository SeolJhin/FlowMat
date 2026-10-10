package org.myweb.flowmat.domain.flowrun.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunStepCompleteRequest;
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunStepCreateRequest;
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunStepFailRequest;
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunStepScheduleRequest;
import org.myweb.flowmat.domain.flowrun.api.dto.response.FlowRunEventResponse;
import org.myweb.flowmat.domain.flowrun.api.dto.response.FlowRunRoutePreviewResponse;
import org.myweb.flowmat.domain.flowrun.api.dto.response.FlowRunStepAttemptResponse;
import org.myweb.flowmat.domain.flowrun.api.dto.response.FlowRunStepLineageResponse;
import org.myweb.flowmat.domain.flowrun.api.dto.response.FlowRunStepResponse;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRun;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRunStep;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRunStepAttempt;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunEventRepository;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunRepository;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunStepAttemptRepository;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunStepRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.workflow.application.publicapi.WorkflowProductionQuery;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FlowRunStepService {
    private final FlowRunRepository runRepository;
    private final FlowRunStepRepository stepRepository;
    private final FlowRunStepAttemptRepository attemptRepository;
    private final FlowRunEventRepository eventRepository;
    private final FlowRunEventRecorder eventRecorder;
    private final WorkflowProductionQuery workflowQuery;
    private final ProjectAccessService accessService;
    private final IdGenerator idGenerator;
    private final ObjectMapper objectMapper;
    private final FlowRunService runService;
    private final JdbcTemplate jdbc;

    @Transactional
    public FlowRunStepResponse create(String runId, FlowRunStepCreateRequest request) {
        FlowRun run = writableRun(runId);
        if ("graph".equals(run.getExecutionMode())) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Graph run steps are created from the published revision.");
        }
        String nodeId = request.nodeId().trim();
        JsonNode processes = snapshot(run).path("processes");
        boolean belongsToRevision = processes.isArray() &&
            java.util.stream.StreamSupport.stream(processes.spliterator(), false)
                .anyMatch(node -> nodeId.equals(node.path("processId").asText()));
        if (!belongsToRevision) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Node is not in the run's published revision.");
        }
        long nextSequence = stepRepository.countByFlowRunId(runId) + 1;
        if (nextSequence > Integer.MAX_VALUE) {
            throw new BusinessException(ErrorCode.CONFLICT, "Flow run has too many steps.");
        }
        FlowRunStep step = new FlowRunStep();
        step.setStepId(idGenerator.generate());
        step.setFlowRunId(runId);
        step.setNodeId(nodeId);
        step.setStatus("planned");
        step.setSequenceNo((int) nextSequence);
        step.setScheduledAt(parseScheduledAt(request.scheduledAt()));
        step.setInputSnapshot(writeJson(request.inputSnapshot() == null
            ? objectMapper.createObjectNode() : request.inputSnapshot()));
        stepRepository.saveAndFlush(step);
        appendEvent(runId, step.getStepId(), "step_created", readJson(step.getInputSnapshot()));
        return response(step);
    }

    /**
     * Opens the next attempt. In a graph run a step waiting to retry starts no earlier than its retryAt, and the node's
     * concurrency limit is checked under the revision+node lock (docs/domain/flow-run-execution-policy.md EP5-EP6).
     */
    @Transactional
    public FlowRunStepResponse start(String runId, String stepId) {
        FlowRun run = writableRun(runId); // The parent row serializes all step transitions and sequence allocation.
        FlowRunStep step = requireStep(runId, stepId);
        if (!"planned".equals(step.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only a planned step can start.");
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (step.getScheduledAt() != null && step.getScheduledAt().isAfter(now)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Step cannot start before its scheduledAt.");
        }
        String actor = accessService.requireCurrentUserId();
        if (!"graph".equals(run.getExecutionMode())) {
            beginAttempt(step, "step_started", null, actor);
            return response(step);
        }
        OffsetDateTime retryAt = pendingRetryAt(step);
        if (retryAt != null && retryAt.isAfter(now)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Step cannot start before its retryAt.");
        }
        FlowRunGraph.NodePolicy policy = graph(run).policy(step.getNodeId());
        Integer limit = policy.concurrencyLimit();
        if (limit != null) {
            long running = runningOnNode(run, step.getNodeId());
            if (running >= limit) {
                throw new BusinessException(ErrorCode.CONFLICT,
                    "Node " + step.getNodeId() + " already has " + running + " running steps (limit " + limit + ").");
            }
        }
        beginAttempt(step, "step_started", policy.timeoutSeconds(), actor);
        return response(step);
    }

    @Transactional
    public FlowRunStepResponse schedule(String runId, String stepId, FlowRunStepScheduleRequest request) {
        FlowRunStep step = writableStep(runId, stepId);
        if (!"planned".equals(step.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only a planned step can be rescheduled.");
        }
        OffsetDateTime scheduledAt = parseScheduledAt(request.scheduledAt());
        // A step waiting to retry keeps its delay (EP5).
        OffsetDateTime retryAt = pendingRetryAt(step);
        if (retryAt != null && (scheduledAt == null || scheduledAt.isBefore(retryAt))) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Step waits to retry until " + retryAt + "; schedule it at or after then.");
        }
        step.setScheduledAt(scheduledAt);
        stepRepository.saveAndFlush(step);
        appendEvent(runId, stepId, "step_scheduled", objectMapper.createObjectNode()
            .put("scheduledAt", scheduledAt == null ? null : scheduledAt.toString()));
        return response(step);
    }

    @Transactional
    public FlowRunStepResponse retry(String runId, String stepId) {
        FlowRun run = writableRun(runId);
        if ("graph".equals(run.getExecutionMode())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Graph run retries follow the connection policy.");
        }
        FlowRunStep step = requireStep(runId, stepId);
        if (!"failed".equals(step.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only a failed step can be retried.");
        }
        beginAttempt(step, "step_retried", null, accessService.requireCurrentUserId());
        return response(step);
    }

    @Transactional
    public FlowRunStepResponse complete(String runId, String stepId, FlowRunStepCompleteRequest request) {
        FlowRun run = writableRun(runId);
        FlowRunStep step = requireStep(runId, stepId);
        FlowRunStepAttempt attempt = runningAttempt(step, request == null ? null : request.attemptNo());
        JsonNode output = request != null && request.outputSnapshot() != null
            ? request.outputSnapshot() : objectMapper.createObjectNode();
        List<FlowRunGraph.Decision> decisions = "graph".equals(run.getExecutionMode())
            ? graph(run).preview(step.getNodeId(), output) : List.of();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        attempt.setStatus("completed");
        attempt.setEndedAt(now);
        step.setStatus("completed");
        step.setEndedAt(now);
        step.setOutputSnapshot(writeJson(output));
        attemptRepository.save(attempt);
        stepRepository.saveAndFlush(step);
        appendEvent(runId, stepId, "step_completed", readJson(step.getOutputSnapshot()));
        for (FlowRunGraph.Decision decision : decisions) {
            if (decision.willRoute()) {
                createRoutedStep(runId, stepId,
                    new FlowRunGraph.Route(decision.connectionId(), decision.targetNodeId()), output);
            } else {
                appendEvent(runId, stepId, "connection_filtered", objectMapper.createObjectNode()
                    .put("connectionId", decision.connectionId())
                    .put("targetNodeId", decision.targetNodeId())
                    .put("reason", "condition_false"));
            }
        }
        return response(step);
    }

    public List<FlowRunRoutePreviewResponse> preview(String runId, String stepId,
        FlowRunStepCompleteRequest request) {
        FlowRun run = readableRun(runId);
        accessService.requireProjectWriteAccess(run.getProjectId());
        if (!"running".equals(run.getStatus()) || run.getProductionRunId() != null
            || !"graph".equals(run.getExecutionMode())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only a running graph step can be previewed.");
        }
        FlowRunStep step = requireStep(runId, stepId);
        runningAttempt(step, request == null ? null : request.attemptNo());
        JsonNode output = request != null && request.outputSnapshot() != null
            ? request.outputSnapshot() : objectMapper.createObjectNode();
        return graph(run).preview(step.getNodeId(), output).stream()
            .map(decision -> new FlowRunRoutePreviewResponse(decision.connectionId(),
                decision.targetNodeId(), decision.willRoute()))
            .toList();
    }

    @Transactional
    public FlowRunStepResponse fail(String runId, String stepId, FlowRunStepFailRequest request) {
        FlowRun run = writableRun(runId);
        FlowRunStep step = requireStep(runId, stepId);
        FlowRunStepAttempt attempt = runningAttempt(step, request.attemptNo());
        recordFailure(run, step, attempt, request.errorCode().trim(), request.errorMessage(),
            accessService.requireCurrentUserId());
        return response(step);
    }

    /**
     * Fails a running graph attempt whose node time limit passed, as the system (EP7). Checked again under the run lock,
     * so overlapping sweeps record it once; false when there was nothing to do.
     */
    @Transactional
    public boolean timeOut(String attemptId) {
        String runId = attemptRepository.findFlowRunIdByAttemptId(attemptId).orElse(null);
        if (runId == null) return false;
        FlowRun run = runRepository.findLockedByFlowRunId(runId).orElse(null);
        if (run == null || !"running".equals(run.getStatus()) || run.getProductionRunId() != null
            || !"graph".equals(run.getExecutionMode())) {
            return false;
        }
        // Loaded only after the lock, so a report or another sweep that ended it is seen.
        FlowRunStepAttempt attempt = attemptRepository.findById(attemptId).orElse(null);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (attempt == null || !"running".equals(attempt.getStatus()) || attempt.getTimeoutAt() == null
            || attempt.getTimeoutAt().isAfter(now)) {
            return false;
        }
        FlowRunStep step = requireStep(runId, attempt.getStepId());
        if (!"running".equals(step.getStatus())) return false;
        long seconds = Duration.between(attempt.getStartedAt(), attempt.getTimeoutAt()).getSeconds();
        eventRecorder.record(runId, step.getStepId(), "step_timed_out", objectMapper.createObjectNode()
            .put("attemptNo", attempt.getAttemptNo()).put("timeoutAt", attempt.getTimeoutAt().toString()), null);
        recordFailure(run, step, attempt, "TIMEOUT",
            "Attempt " + attempt.getAttemptNo() + " ran longer than " + seconds + " seconds.", null);
        return true;
    }

    public List<FlowRunStepResponse> list(String runId) {
        readableRun(runId);
        return stepRepository.findAllByFlowRunIdOrderBySequenceNoAsc(runId).stream().map(this::response).toList();
    }

    public FlowRunStepLineageResponse lineage(String runId, String stepId) {
        readableRun(runId);
        List<FlowRunStep> steps = stepRepository.findAllByFlowRunIdOrderBySequenceNoAsc(runId);
        Map<String, FlowRunStep> byId = new HashMap<>();
        Map<String, List<FlowRunStep>> children = new HashMap<>();
        for (FlowRunStep step : steps) {
            byId.put(step.getStepId(), step);
            if (step.getSourceStepId() != null) {
                children.computeIfAbsent(step.getSourceStepId(), ignored -> new ArrayList<>()).add(step);
            }
        }
        FlowRunStep selected = byId.get(stepId);
        if (selected == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
        List<FlowRunStepResponse> ancestors = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        visited.add(stepId);
        FlowRunStep parent = selected;
        while (parent.getSourceStepId() != null) {
            parent = byId.get(parent.getSourceStepId());
            if (parent == null || !visited.add(parent.getStepId())) {
                throw new BusinessException(ErrorCode.CONFLICT, "Flow run step lineage is invalid.");
            }
            ancestors.add(response(parent));
        }
        java.util.Collections.reverse(ancestors);

        Set<String> descendantIds = new HashSet<>();
        ArrayDeque<FlowRunStep> queue = new ArrayDeque<>(children.getOrDefault(stepId, List.of()));
        while (!queue.isEmpty()) {
            FlowRunStep child = queue.removeFirst();
            if (!descendantIds.add(child.getStepId()) || child.getStepId().equals(stepId)) {
                throw new BusinessException(ErrorCode.CONFLICT, "Flow run step lineage is invalid.");
            }
            queue.addAll(children.getOrDefault(child.getStepId(), List.of()));
        }
        List<FlowRunStepResponse> descendants = steps.stream()
            .filter(step -> descendantIds.contains(step.getStepId())).map(this::response).toList();
        return new FlowRunStepLineageResponse(response(selected), ancestors, descendants);
    }

    public List<FlowRunStepAttemptResponse> attempts(String runId, String stepId) {
        readableRun(runId);
        requireStep(runId, stepId);
        return attemptRepository.findAllByStepIdOrderByAttemptNoAsc(stepId).stream()
            .map(attempt -> new FlowRunStepAttemptResponse(
                attempt.getAttemptId(), attempt.getStepId(), attempt.getAttemptNo(), attempt.getStatus(),
                attempt.getStartedAt(), attempt.getEndedAt(), attempt.getRetryAt(),
                attempt.getErrorCode(), attempt.getErrorMessage(), attempt.getTimeoutAt()))
            .toList();
    }

    public List<FlowRunEventResponse> events(String runId) {
        readableRun(runId);
        return eventRepository.findAllByFlowRunIdOrderByOccurredAtAscEventIdAsc(runId).stream()
            .map(event -> new FlowRunEventResponse(event.getEventId(), event.getFlowRunId(),
                event.getStepId(), event.getEventType(), readJson(event.getPayloadJson()),
                event.getRequestId(), event.getOccurredAt(), event.getActorType(), event.getActorId()))
            .toList();
    }

    /**
     * Ends the running attempt as failed and follows the connection's failure policy with the node's retry policy
     * (EP4, EP6). {@code actorId} null is the system, for a timeout (EP7).
     */
    private void recordFailure(FlowRun run, FlowRunStep step, FlowRunStepAttempt attempt, String code, String message,
        String actorId) {
        // Stored to the microsecond, so the retryAt answered here is the one saved.
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        attempt.setStatus("failed");
        attempt.setEndedAt(now);
        attempt.setErrorCode(code);
        attempt.setErrorMessage(message);
        step.setStatus("failed");
        step.setEndedAt(now);
        step.setErrorCode(code);
        step.setErrorMessage(message);
        attemptRepository.save(attempt);
        stepRepository.save(step);
        JsonNode payload = objectMapper.createObjectNode().put("errorCode", code).put("errorMessage", message);
        eventRecorder.record(run.getFlowRunId(), step.getStepId(), "step_failed", payload, actorId);
        if (!"graph".equals(run.getExecutionMode())) {
            return;
        }
        FlowRunGraph graph = graph(run);
        String policy = graph.failurePolicy(step.getSourceConnectionId());
        FlowRunGraph.NodePolicy node = graph.policy(step.getNodeId());
        if ("skip".equals(policy)) {
            step.setStatus("skipped");
            stepRepository.save(step);
            eventRecorder.record(run.getFlowRunId(), step.getStepId(), "step_skipped", payload, actorId);
        } else if ("retry".equals(policy) && attempt.getAttemptNo() <= node.retryLimit()) {
            long delay = node.delayBeforeRetry(attempt.getAttemptNo());
            if (delay > 0) {
                waitToRetry(step, attempt, now.plusSeconds(delay), null, actorId);
            } else if (node.concurrencyLimit() != null && runningOnNode(run, step.getNodeId()) >= node.concurrencyLimit()) {
                waitToRetry(step, attempt, null, "concurrency_limit", actorId);
            } else {
                beginAttempt(step, "step_retried", node.timeoutSeconds(), actorId);
            }
        } else {
            runService.failLocked(run, code, message, actorId);
        }
    }

    /** Back to planned until {@code retryAt}, or until an executor starts it when the limit blocked the retry (EP4, EP6). */
    private void waitToRetry(FlowRunStep step, FlowRunStepAttempt attempt, OffsetDateTime retryAt, String reason,
        String actorId) {
        attempt.setRetryAt(retryAt);
        attemptRepository.save(attempt);
        step.setStatus("planned");
        step.setScheduledAt(retryAt);
        step.setEndedAt(null);
        stepRepository.save(step);
        ObjectNode payload = objectMapper.createObjectNode().put("attemptNo", attempt.getAttemptNo())
            .put("retryAt", retryAt == null ? null : retryAt.toString());
        if (reason != null) payload.put("reason", reason);
        eventRecorder.record(step.getFlowRunId(), step.getStepId(), "step_retry_scheduled", payload, actorId);
    }

    /** The retryAt of the failed attempt a planned step waits on, if any (EP5). */
    private OffsetDateTime pendingRetryAt(FlowRunStep step) {
        return attemptRepository.findTopByStepIdOrderByAttemptNoDesc(step.getStepId())
            .filter(attempt -> "failed".equals(attempt.getStatus()))
            .map(FlowRunStepAttempt::getRetryAt)
            .orElse(null);
    }

    /** Running steps of the node in the revision's open graph runs, counted under the revision+node lock (EP6). */
    private long runningOnNode(FlowRun run, String nodeId) {
        jdbc.queryForObject("select pg_advisory_xact_lock(hashtextextended(?, 0))", Object.class,
            "flow-run-node|" + run.getWorkflowRevisionId() + "|" + nodeId);
        return stepRepository.countRunningGraphSteps(run.getWorkflowRevisionId(), nodeId);
    }

    private FlowRun writableRun(String runId) {
        FlowRun run = runRepository.findLockedByFlowRunId(runId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        accessService.requireProjectWriteAccess(run.getProjectId());
        if (!"running".equals(run.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Flow run has already ended.");
        }
        if (run.getProductionRunId() != null) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Production-linked steps must be recorded through the production run API.");
        }
        return run;
    }

    private FlowRun readableRun(String runId) {
        FlowRun run = runRepository.findById(runId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        accessService.requireProjectReadAccess(run.getProjectId());
        return run;
    }

    private FlowRunStep writableStep(String runId, String stepId) {
        writableRun(runId); // The parent row serializes all step transitions and sequence allocation.
        return requireStep(runId, stepId);
    }

    /** The run's published revision, read through the workflow context's public query (ADR-002, EP11). */
    private JsonNode snapshot(FlowRun run) {
        return workflowQuery.findRevision(run.getWorkflowRevisionId(), run.getWorkflowId())
            .map(revision -> readJson(revision.snapshotJson()))
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private FlowRunGraph graph(FlowRun run) {
        return FlowRunGraph.from(snapshot(run));
    }

    private void createRoutedStep(String runId, String sourceStepId, FlowRunGraph.Route route, JsonNode input) {
        long nextSequence = stepRepository.countByFlowRunId(runId) + 1;
        if (nextSequence > Integer.MAX_VALUE) {
            throw new BusinessException(ErrorCode.CONFLICT, "Flow run has too many steps.");
        }
        FlowRunStep step = new FlowRunStep();
        step.setStepId(idGenerator.generate());
        step.setFlowRunId(runId);
        step.setNodeId(route.targetNodeId());
        step.setSourceConnectionId(route.connectionId());
        step.setSourceStepId(sourceStepId);
        step.setStatus("planned");
        step.setSequenceNo((int) nextSequence);
        step.setInputSnapshot(writeJson(input));
        stepRepository.saveAndFlush(step);
        appendEvent(runId, step.getStepId(), "step_created", input);
    }

    private FlowRunStep requireStep(String runId, String stepId) {
        return stepRepository.findByStepIdAndFlowRunId(stepId, runId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    /** {@code timeoutSeconds}: the node's time limit in a graph run (EP7); null for none. */
    private void beginAttempt(FlowRunStep step, String eventType, Integer timeoutSeconds, String actorId) {
        int nextNumber = attemptRepository.findTopByStepIdOrderByAttemptNoDesc(step.getStepId())
            .map(previous -> previous.getAttemptNo() + 1).orElse(1);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        FlowRunStepAttempt attempt = new FlowRunStepAttempt();
        attempt.setAttemptId(idGenerator.generate());
        attempt.setStepId(step.getStepId());
        attempt.setAttemptNo(nextNumber);
        attempt.setStatus("running");
        attempt.setStartedAt(now);
        attempt.setTimeoutAt(timeoutSeconds == null ? null : now.plusSeconds(timeoutSeconds));
        attemptRepository.save(attempt);
        step.setStatus("running");
        if (step.getStartedAt() == null) {
            step.setStartedAt(now);
        }
        step.setEndedAt(null);
        step.setErrorCode(null);
        step.setErrorMessage(null);
        stepRepository.save(step);
        eventRecorder.record(step.getFlowRunId(), step.getStepId(), eventType,
            objectMapper.createObjectNode().put("attemptNo", nextNumber), actorId);
    }

    private FlowRunStepAttempt runningAttempt(FlowRunStep step) {
        if (!"running".equals(step.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only a running step can end.");
        }
        FlowRunStepAttempt attempt = attemptRepository.findTopByStepIdOrderByAttemptNoDesc(step.getStepId())
            .orElseThrow(() -> new IllegalStateException("Running step has no attempt."));
        if (!"running".equals(attempt.getStatus())) {
            throw new IllegalStateException("Running step's latest attempt is not running.");
        }
        return attempt;
    }

    /** A report naming an attempt that is no longer running is late, after a timeout or retry (EP8). */
    private FlowRunStepAttempt runningAttempt(FlowRunStep step, Integer attemptNo) {
        FlowRunStepAttempt attempt = runningAttempt(step);
        if (attemptNo != null && attemptNo.intValue() != attempt.getAttemptNo()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Attempt " + attemptNo + " is no longer running.");
        }
        return attempt;
    }

    private void appendEvent(String runId, String stepId, String type, JsonNode payload) {
        eventRecorder.record(runId, stepId, type, payload, accessService.requireCurrentUserId());
    }

    private FlowRunStepResponse response(FlowRunStep step) {
        return new FlowRunStepResponse(step.getStepId(), step.getFlowRunId(), step.getNodeId(),
            step.getSourceConnectionId(), step.getSourceStepId(), step.getStatus(),
            step.getSequenceNo(), step.getScheduledAt(), step.getStartedAt(),
            step.getEndedAt(), readJson(step.getInputSnapshot()), readJson(step.getOutputSnapshot()),
            step.getErrorCode(), step.getErrorMessage());
    }

    private String writeJson(JsonNode value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Flow run step JSON could not be serialized.", exception);
        }
    }

    private OffsetDateTime parseScheduledAt(String value) {
        if (value == null) return null;
        try {
            return OffsetDateTime.parse(value);
        } catch (DateTimeParseException exception) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "scheduledAt must be an ISO-8601 date-time with an offset.");
        }
    }

    private JsonNode readJson(String value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored flow run step JSON is invalid.", exception);
        }
    }
}
