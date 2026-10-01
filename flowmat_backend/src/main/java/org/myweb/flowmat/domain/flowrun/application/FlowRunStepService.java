package org.myweb.flowmat.domain.flowrun.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunFailRequest;
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
import org.myweb.flowmat.domain.workflow.domain.entity.WorkflowRevision;
import org.myweb.flowmat.domain.workflow.repository.WorkflowRevisionRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FlowRunStepService {
    private static final int MAX_GRAPH_RETRIES = 3;

    private final FlowRunRepository runRepository;
    private final FlowRunStepRepository stepRepository;
    private final FlowRunStepAttemptRepository attemptRepository;
    private final FlowRunEventRepository eventRepository;
    private final FlowRunEventRecorder eventRecorder;
    private final WorkflowRevisionRepository revisionRepository;
    private final ProjectAccessService accessService;
    private final IdGenerator idGenerator;
    private final ObjectMapper objectMapper;
    private final FlowRunService runService;

    @Transactional
    public FlowRunStepResponse create(String runId, FlowRunStepCreateRequest request) {
        FlowRun run = writableRun(runId);
        if ("graph".equals(run.getExecutionMode())) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Graph run steps are created from the published revision.");
        }
        String nodeId = request.nodeId().trim();
        WorkflowRevision revision = revisionRepository.findById(run.getWorkflowRevisionId())
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        JsonNode processes = readJson(revision.getSnapshotJson()).path("processes");
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

    @Transactional
    public FlowRunStepResponse start(String runId, String stepId) {
        FlowRunStep step = writableStep(runId, stepId);
        if (!"planned".equals(step.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only a planned step can start.");
        }
        if (step.getScheduledAt() != null && step.getScheduledAt().isAfter(OffsetDateTime.now(ZoneOffset.UTC))) {
            throw new BusinessException(ErrorCode.CONFLICT, "Step cannot start before its scheduledAt.");
        }
        beginAttempt(step, "step_started");
        return response(step);
    }

    @Transactional
    public FlowRunStepResponse schedule(String runId, String stepId, FlowRunStepScheduleRequest request) {
        FlowRunStep step = writableStep(runId, stepId);
        if (!"planned".equals(step.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only a planned step can be rescheduled.");
        }
        OffsetDateTime scheduledAt = parseScheduledAt(request.scheduledAt());
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
        beginAttempt(step, "step_retried");
        return response(step);
    }

    @Transactional
    public FlowRunStepResponse complete(String runId, String stepId, FlowRunStepCompleteRequest request) {
        FlowRun run = writableRun(runId);
        FlowRunStep step = requireStep(runId, stepId);
        FlowRunStepAttempt attempt = runningAttempt(step);
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
        runningAttempt(step);
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
        FlowRunStepAttempt attempt = runningAttempt(step);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        String code = request.errorCode().trim();
        attempt.setStatus("failed");
        attempt.setEndedAt(now);
        attempt.setErrorCode(code);
        attempt.setErrorMessage(request.errorMessage());
        step.setStatus("failed");
        step.setEndedAt(now);
        step.setErrorCode(code);
        step.setErrorMessage(request.errorMessage());
        attemptRepository.save(attempt);
        stepRepository.save(step);
        JsonNode payload = objectMapper.createObjectNode().put("errorCode", code)
            .put("errorMessage", request.errorMessage());
        appendEvent(runId, stepId, "step_failed", payload);
        if ("graph".equals(run.getExecutionMode())) {
            String policy = graph(run).failurePolicy(step.getSourceConnectionId());
            if ("skip".equals(policy)) {
                step.setStatus("skipped");
                stepRepository.save(step);
                appendEvent(runId, stepId, "step_skipped", payload);
            } else if ("retry".equals(policy) && attempt.getAttemptNo() <= MAX_GRAPH_RETRIES) {
                beginAttempt(step, "step_retried");
            } else {
                runService.fail(runId, new FlowRunFailRequest(code, request.errorMessage()));
            }
        }
        return response(step);
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
                attempt.getErrorCode(), attempt.getErrorMessage()))
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

    private FlowRunGraph graph(FlowRun run) {
        WorkflowRevision revision = revisionRepository.findById(run.getWorkflowRevisionId())
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return FlowRunGraph.from(readJson(revision.getSnapshotJson()));
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

    private void beginAttempt(FlowRunStep step, String eventType) {
        int nextNumber = attemptRepository.findTopByStepIdOrderByAttemptNoDesc(step.getStepId())
            .map(previous -> previous.getAttemptNo() + 1).orElse(1);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        FlowRunStepAttempt attempt = new FlowRunStepAttempt();
        attempt.setAttemptId(idGenerator.generate());
        attempt.setStepId(step.getStepId());
        attempt.setAttemptNo(nextNumber);
        attempt.setStatus("running");
        attempt.setStartedAt(now);
        attemptRepository.save(attempt);
        step.setStatus("running");
        if (step.getStartedAt() == null) {
            step.setStartedAt(now);
        }
        step.setEndedAt(null);
        step.setErrorCode(null);
        step.setErrorMessage(null);
        stepRepository.save(step);
        appendEvent(step.getFlowRunId(), step.getStepId(), eventType,
            objectMapper.createObjectNode().put("attemptNo", nextNumber));
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
