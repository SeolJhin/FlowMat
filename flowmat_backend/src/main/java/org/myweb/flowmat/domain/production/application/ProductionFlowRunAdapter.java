package org.myweb.flowmat.domain.production.application;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRun;
import org.myweb.flowmat.domain.flowrun.application.FlowRunEventRecorder;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunRepository;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Keeps the common execution record in the same transaction as a revision-linked manufacturing run. */
@Service
@RequiredArgsConstructor
public class ProductionFlowRunAdapter {

    private static final Set<String> RUN_TYPES = Set.of("actual", "simulation", "test", "dry_run");

    private final FlowRunRepository flowRunRepository;
    private final FlowRunEventRecorder eventRecorder;
    private final EntityManager entityManager;
    private final IdGenerator idGenerator;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.MANDATORY)
    public void onStarted(ProductionRun productionRun) {
        if (productionRun.getWorkflowRevisionId() == null) {
            return;
        }
        createLinkedRun(productionRun);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void onFinished(ProductionRun productionRun) {
        if (productionRun.getWorkflowRevisionId() == null) {
            return;
        }
        Optional<FlowRun> existing = flowRunRepository.findLockedByProductionRunId(productionRun.getProductionRunId());
        if (existing.isEmpty() && !RUN_TYPES.contains(productionRun.getRunType())) {
            // Old production runs could use arbitrary types before the shared run contract existed.
            return;
        }
        FlowRun flowRun = existing.orElseGet(() -> createLinkedRun(productionRun));
        if (!"running".equals(flowRun.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Linked flow run has already ended.");
        }
        ObjectNode output = objectMapper.createObjectNode();
        output.put("actualOutputQty", productionRun.getActualOutputQty());
        flowRun.setOutputPayload(output.toString());
        flowRun.setStatus("finished");
        flowRun.setEndedAt(OffsetDateTime.now(ZoneOffset.UTC));
        flowRunRepository.save(flowRun);
        eventRecorder.record(flowRun.getFlowRunId(), null, "run_finished", output,
            productionRun.getFinishedBy());
    }

    private FlowRun createLinkedRun(ProductionRun productionRun) {
        String runType = productionRun.getRunType();
        if (!RUN_TYPES.contains(runType)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Unknown production run type.");
        }
        // The producer is persisted first; flush it before inserting the row with its foreign key.
        entityManager.flush();
        ObjectNode input = objectMapper.createObjectNode();
        input.put("plannedOutputQty", productionRun.getPlannedOutputQty());
        if (productionRun.getTargetItemId() != null) {
            input.put("targetItemId", productionRun.getTargetItemId());
        }
        if (productionRun.getWorkOrderId() != null) {
            input.put("workOrderId", productionRun.getWorkOrderId());
        }

        FlowRun flowRun = new FlowRun();
        flowRun.setFlowRunId(idGenerator.generate());
        flowRun.setProjectId(productionRun.getProjectId());
        flowRun.setWorkflowId(productionRun.getWorkflowId());
        flowRun.setWorkflowRevisionId(productionRun.getWorkflowRevisionId());
        flowRun.setProductionRunId(productionRun.getProductionRunId());
        flowRun.setRunType(runType);
        flowRun.setStatus("running");
        flowRun.setInputPayload(input.toString());
        flowRun.setStartedAt(OffsetDateTime.now(ZoneOffset.UTC));
        flowRun.setRequestedBy(productionRun.getStartedBy());
        flowRunRepository.saveAndFlush(flowRun);
        eventRecorder.record(flowRun.getFlowRunId(), null, "run_started", input,
            productionRun.getStartedBy());
        return flowRun;
    }
}
