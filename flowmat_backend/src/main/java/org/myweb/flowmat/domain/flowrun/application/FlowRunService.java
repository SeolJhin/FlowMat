package org.myweb.flowmat.domain.flowrun.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunFinishRequest;
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunStartRequest;
import org.myweb.flowmat.domain.flowrun.api.dto.response.FlowRunResponse;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRun;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunRepository;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunStepRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.workflow.domain.entity.Workflow;
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
public class FlowRunService {

    private static final Set<String> RUN_TYPES = Set.of("actual", "simulation", "test", "dry_run");

    private final FlowRunRepository flowRunRepository;
    private final FlowRunStepRepository stepRepository;
    private final FlowRunEventRecorder eventRecorder;
    private final WorkflowRevisionRepository revisionRepository;
    private final ProjectAccessService projectAccessService;
    private final IdGenerator idGenerator;
    private final ObjectMapper objectMapper;

    @Transactional
    public FlowRunResponse start(FlowRunStartRequest request) {
        Workflow workflow = projectAccessService.requireWorkflowWriteAccess(request.workflowId().trim());
        WorkflowRevision revision = revisionRepository
            .findByWorkflowRevisionIdAndWorkflowId(request.workflowRevisionId().trim(), workflow.getWorkflowId())
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND,
                "Workflow revision was not found for this workflow."));
        if (!"published".equals(revision.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Retired workflow revisions cannot start new runs.");
        }
        String runType = request.runType().trim().toLowerCase();
        if (!RUN_TYPES.contains(runType)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Unknown flow run type.");
        }

        FlowRun run = new FlowRun();
        run.setFlowRunId(idGenerator.generate());
        run.setProjectId(workflow.getProjectId());
        run.setWorkflowId(workflow.getWorkflowId());
        run.setWorkflowRevisionId(revision.getWorkflowRevisionId());
        run.setRunType(runType);
        run.setStatus("running");
        run.setInputPayload(writeJson(request.inputPayload() != null ? request.inputPayload() : objectMapper.createObjectNode()));
        run.setStartedAt(OffsetDateTime.now(ZoneOffset.UTC));
        run.setRequestedBy(projectAccessService.requireCurrentUserId());
        flowRunRepository.saveAndFlush(run);
        eventRecorder.record(run.getFlowRunId(), null, "run_started",
            readJson(run.getInputPayload()), run.getRequestedBy());
        return toResponse(run);
    }

    public List<FlowRunResponse> list(String workflowId) {
        projectAccessService.requireWorkflowReadAccess(workflowId);
        return flowRunRepository.findAllByWorkflowIdOrderByStartedAtDesc(workflowId).stream()
            .map(this::toResponse)
            .toList();
    }

    public FlowRunResponse get(String flowRunId) {
        FlowRun run = findRun(flowRunId);
        projectAccessService.requireProjectReadAccess(run.getProjectId());
        return toResponse(run);
    }

    @Transactional
    public FlowRunResponse finish(String flowRunId, FlowRunFinishRequest request) {
        FlowRun run = flowRunRepository.findLockedByFlowRunId(flowRunId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        projectAccessService.requireProjectWriteAccess(run.getProjectId());
        if (run.getProductionRunId() != null) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Linked production runs must be finished through the production run API.");
        }
        if (!"running".equals(run.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Flow run has already ended.");
        }
        if (stepRepository.existsByFlowRunIdAndStatusNot(flowRunId, "completed")) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Every recorded step must complete before the flow run can finish.");
        }
        run.setStatus("finished");
        run.setOutputPayload(request != null && request.outputPayload() != null
            ? writeJson(request.outputPayload()) : null);
        run.setEndedAt(OffsetDateTime.now(ZoneOffset.UTC));
        flowRunRepository.save(run);
        eventRecorder.record(run.getFlowRunId(), null, "run_finished",
            readJson(run.getOutputPayload()), projectAccessService.requireCurrentUserId());
        return toResponse(run);
    }

    private FlowRun findRun(String flowRunId) {
        return flowRunRepository.findById(flowRunId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private FlowRunResponse toResponse(FlowRun run) {
        return new FlowRunResponse(
            run.getFlowRunId(), run.getProjectId(), run.getWorkflowId(), run.getWorkflowRevisionId(),
            run.getProductionRunId(), run.getRunType(), run.getStatus(),
            readJson(run.getInputPayload()), readJson(run.getOutputPayload()),
            run.getStartedAt(), run.getEndedAt(), run.getRequestedBy()
        );
    }

    private String writeJson(JsonNode value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Flow run payload could not be serialized.", exception);
        }
    }

    private JsonNode readJson(String value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored flow run payload is invalid.", exception);
        }
    }
}
