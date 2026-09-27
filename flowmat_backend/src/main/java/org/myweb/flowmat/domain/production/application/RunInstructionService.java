package org.myweb.flowmat.domain.production.application;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.production.api.dto.request.RunInstructionCheckRequest;
import org.myweb.flowmat.domain.production.api.dto.response.RunInstructionResponse;
import org.myweb.flowmat.domain.production.api.dto.response.WorkInstructionResponse;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.RunInstructionCheck;
import org.myweb.flowmat.domain.production.domain.entity.WorkInstruction;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.production.repository.RunInstructionCheckRepository;
import org.myweb.flowmat.domain.production.repository.WorkInstructionRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A production run's instruction checklist (docs/domain/work-instruction.md). A run works to the revision it first
 * confirms a step of; until then it shows the product's released revision, so a new release does not change a checklist
 * already under way. Only open runs (pending or running) change.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RunInstructionService {

    private static final String NOT_DELETED = "N";
    private static final Set<String> OPEN = Set.of("pending", "running");

    private final ProductionRunRepository runRepository;
    private final RunInstructionCheckRepository checkRepository;
    private final WorkInstructionRepository instructionRepository;
    private final WorkInstructionService workInstructionService;
    private final ProjectAccessService projectAccessService;
    private final IdGenerator idGenerator;

    public RunInstructionResponse view(String runId) {
        ProductionRun run = findRun(runId);
        projectAccessService.requireProjectReadAccess(run.getProjectId());
        return response(run);
    }

    @Transactional
    public RunInstructionResponse check(String runId, String stepId, RunInstructionCheckRequest request) {
        ProductionRun run = findOpenRun(runId);
        WorkInstruction instruction = bound(run, checkRepository.findAllByProductionRunId(run.getProductionRunId()));
        if (instruction == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The run's product has no released work instruction.");
        }
        WorkInstructionResponse.Step step = workInstructionService.response(instruction).steps().stream()
            .filter(candidate -> candidate.stepId().equals(stepId))
            .findFirst()
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (checkRepository.findByProductionRunIdAndStepId(run.getProductionRunId(), stepId).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Step " + step.stepNo() + " is already confirmed; undo it to confirm it again.");
        }
        String value = request == null || request.value() == null || request.value().isBlank() ? null : request.value().trim();
        String note = request == null || request.note() == null || request.note().isBlank() ? null : request.note().trim();
        if (step.recordsValue() && value == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "Step " + step.stepNo() + " records " + (step.valueLabel() != null ? step.valueLabel() : "a value") + "; enter it.");
        }
        if (value != null && value.length() > 200) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The value can be at most 200 characters.");
        }
        if (note != null && note.length() > 500) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The note can be at most 500 characters.");
        }
        RunInstructionCheck check = new RunInstructionCheck();
        check.setCheckId(idGenerator.generate());
        check.setProductionRunId(run.getProductionRunId());
        check.setInstructionId(instruction.getInstructionId());
        check.setStepId(stepId);
        check.setCheckValue(value);
        check.setNote(note);
        check.setCheckedBy(projectAccessService.requireCurrentUserId());
        check.setCheckedAt(OffsetDateTime.now());
        checkRepository.saveAndFlush(check);
        return response(run);
    }

    @Transactional
    public RunInstructionResponse uncheck(String runId, String stepId) {
        ProductionRun run = findOpenRun(runId);
        RunInstructionCheck check = checkRepository.findByProductionRunIdAndStepId(run.getProductionRunId(), stepId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        checkRepository.delete(check);
        checkRepository.flush();
        return response(run);
    }

    /**
     * Finishing a run whose instruction revision blocks finishing needs every required step confirmed. The caller has
     * checked access and that the run is open.
     */
    public void requireCompleteToFinish(ProductionRun run) {
        RunInstructionResponse checklist = response(run);
        if (checklist.instruction() != null && checklist.instruction().blocksFinish() && !checklist.complete()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Confirm the required work instruction steps first ("
                + checklist.requiredDone() + " of " + checklist.requiredSteps() + " done).");
        }
    }

    private RunInstructionResponse response(ProductionRun run) {
        List<RunInstructionCheck> checks = checkRepository.findAllByProductionRunId(run.getProductionRunId());
        WorkInstruction instruction = bound(run, checks);
        boolean open = isOpen(run);
        if (instruction == null) {
            return new RunInstructionResponse(run.getProductionRunId(), open, null, List.of(), 0, 0, true);
        }
        WorkInstructionResponse body = workInstructionService.response(instruction);
        Map<String, RunInstructionCheck> byStep = checks.stream()
            .filter(check -> check.getInstructionId().equals(instruction.getInstructionId()))
            .collect(Collectors.toMap(RunInstructionCheck::getStepId, Function.identity(), (one, other) -> one));
        List<RunInstructionResponse.Check> checkResponses = body.steps().stream()
            .filter(step -> byStep.containsKey(step.stepId()))
            .map(step -> {
                RunInstructionCheck check = byStep.get(step.stepId());
                return new RunInstructionResponse.Check(step.stepId(), check.getCheckValue(), check.getNote(), check.getCheckedBy(),
                    check.getCheckedAt());
            })
            .toList();
        int required = (int) body.steps().stream().filter(WorkInstructionResponse.Step::required).count();
        int done = (int) body.steps().stream().filter(step -> step.required() && byStep.containsKey(step.stepId())).count();
        return new RunInstructionResponse(run.getProductionRunId(), open, body, checkResponses, required, done, done == required);
    }

    /** The revision of the run's first confirmation, or the product's released revision before any. */
    private WorkInstruction bound(ProductionRun run, List<RunInstructionCheck> checks) {
        if (!checks.isEmpty()) {
            return instructionRepository.findById(checks.get(0).getInstructionId()).orElse(null);
        }
        return workInstructionService.released(run.getTargetItemId());
    }

    private static boolean isOpen(ProductionRun run) {
        return OPEN.contains(run.getRunStatus() == null ? "" : run.getRunStatus().trim().toLowerCase());
    }

    private ProductionRun findOpenRun(String runId) {
        ProductionRun run = findRun(runId);
        projectAccessService.requireProjectWriteAccess(run.getProjectId());
        if (!isOpen(run)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Run " + run.getRunNumber() + " is " + run.getRunStatus()
                + "; its checklist can no longer change.");
        }
        return run;
    }

    private ProductionRun findRun(String runId) {
        return runRepository.findByProductionRunIdAndDeletedYn(runId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
