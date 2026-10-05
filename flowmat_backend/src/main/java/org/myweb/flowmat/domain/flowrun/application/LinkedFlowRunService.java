package org.myweb.flowmat.domain.flowrun.application;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.flowrun.application.publicapi.FlowRunCommand;
import org.myweb.flowmat.domain.flowrun.application.publicapi.LinkedRun;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRun;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Flow runs linked to another domain's run, written in the caller's transaction. */
@Service
@RequiredArgsConstructor
public class LinkedFlowRunService implements FlowRunCommand {

    private final FlowRunRepository flowRunRepository;
    private final FlowRunEventRecorder eventRecorder;
    private final EntityManager entityManager;
    private final IdGenerator idGenerator;

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void startLinkedRun(LinkedRun run) {
        create(run);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void finishLinkedRun(LinkedRun run, ObjectNode output, String finishedBy) {
        Optional<FlowRun> existing = flowRunRepository.findLockedByProductionRunId(run.productionRunId());
        if (existing.isEmpty() && !FlowRunService.RUN_TYPES.contains(run.runType())) {
            // Old production runs could use arbitrary types before the shared run contract existed.
            return;
        }
        FlowRun flowRun = existing.orElseGet(() -> create(run));
        if (!"running".equals(flowRun.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Linked flow run has already ended.");
        }
        flowRun.setOutputPayload(output.toString());
        flowRun.setStatus("finished");
        flowRun.setEndedAt(OffsetDateTime.now(ZoneOffset.UTC));
        flowRunRepository.save(flowRun);
        eventRecorder.record(flowRun.getFlowRunId(), null, "run_finished", output, finishedBy);
    }

    private FlowRun create(LinkedRun run) {
        if (!FlowRunService.RUN_TYPES.contains(run.runType())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Unknown production run type.");
        }
        // The linked run is persisted first; flush it before inserting the row with its foreign key.
        entityManager.flush();
        FlowRun flowRun = new FlowRun();
        flowRun.setFlowRunId(idGenerator.generate());
        flowRun.setProjectId(run.projectId());
        flowRun.setWorkflowId(run.workflowId());
        flowRun.setWorkflowRevisionId(run.workflowRevisionId());
        flowRun.setProductionRunId(run.productionRunId());
        flowRun.setRunType(run.runType());
        flowRun.setStatus("running");
        flowRun.setInputPayload(run.input().toString());
        flowRun.setStartedAt(OffsetDateTime.now(ZoneOffset.UTC));
        flowRun.setRequestedBy(run.requestedBy());
        flowRunRepository.saveAndFlush(flowRun);
        eventRecorder.record(flowRun.getFlowRunId(), null, "run_started", run.input(), run.requestedBy());
        return flowRun;
    }
}
