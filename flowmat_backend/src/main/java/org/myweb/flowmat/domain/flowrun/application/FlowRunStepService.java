package org.myweb.flowmat.domain.flowrun.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunStepCompleteRequest;
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunStepCreateRequest;
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunStepFailRequest;
import org.myweb.flowmat.domain.flowrun.api.dto.response.FlowRunEventResponse;
import org.myweb.flowmat.domain.flowrun.api.dto.response.FlowRunStepAttemptResponse;
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
    private final FlowRunRepository runRepository;
    private final FlowRunStepRepository stepRepository;
    private final FlowRunStepAttemptRepository attemptRepository;
    private final FlowRunEventRepository eventRepository;
    private final FlowRunEventRecorder eventRecorder;
    private final WorkflowRevisionRepository revisionRepository;
    private final ProjectAccessService accessService;
    private final IdGenerator idGenerator;
    private final ObjectMapper objectMapper;

    @Transactional
    public FlowRunStepResponse create(String runId, FlowRunStepCreateRequest request) {
        FlowRun run = writableRun(runId);
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
        beginAttempt(step, "step_started");
        return response(step);
    }

    @Transactional
    public FlowRunStepResponse retry(String runId, String stepId) {
        FlowRunStep step = writableStep(runId, stepId);
        if (!"failed".equals(step.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only a failed step can be retried.");
        }
        beginAttempt(step, "step_retried");
        return response(step);
    }

    @Transactional
    public FlowRunStepResponse complete(String runId, String stepId, FlowRunStepCompleteRequest request) {
        FlowRunStep step = writableStep(runId, stepId);
        FlowRunStepAttempt attempt = runningAttempt(step);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        attempt.setStatus("completed");
        attempt.setEndedAt(now);
        step.setStatus("completed");
        step.setEndedAt(now);
        step.setOutputSnapshot(writeJson(request != null && request.outputSnapshot() != null
            ? request.outputSnapshot() : objectMapper.createObjectNode()));
        attemptRepository.save(attempt);
        stepRepository.save(step);
        appendEvent(runId, stepId, "step_completed", readJson(step.getOutputSnapshot()));
        return response(step);
    }

    @Transactional
    public FlowRunStepResponse fail(String runId, String stepId, FlowRunStepFailRequest request) {
        FlowRunStep step = writableStep(runId, stepId);
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
        return response(step);
    }

    public List<FlowRunStepResponse> list(String runId) {
        readableRun(runId);
        return stepRepository.findAllByFlowRunIdOrderBySequenceNoAsc(runId).stream().map(this::response).toList();
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
            step.getStatus(), step.getSequenceNo(), step.getScheduledAt(), step.getStartedAt(),
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
