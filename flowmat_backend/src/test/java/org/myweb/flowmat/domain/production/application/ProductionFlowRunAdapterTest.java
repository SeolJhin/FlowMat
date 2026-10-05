package org.myweb.flowmat.domain.production.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.flowrun.application.publicapi.FlowRunCommand;
import org.myweb.flowmat.domain.flowrun.application.publicapi.LinkedRun;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;

@ExtendWith(MockitoExtension.class)
class ProductionFlowRunAdapterTest {

    @Mock private FlowRunCommand flowRunCommand;

    private ProductionFlowRunAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new ProductionFlowRunAdapter(flowRunCommand, new ObjectMapper());
    }

    @Test
    void runWithoutAWorkflowRevisionHasNoFlowRun() {
        ProductionRun run = run();
        run.setWorkflowRevisionId(null);

        adapter.onStarted(run);
        adapter.onFinished(run);

        verifyNoInteractions(flowRunCommand);
    }

    @Test
    void startPassesTheRunAndItsPlan() {
        adapter.onStarted(run());

        ArgumentCaptor<LinkedRun> linked = ArgumentCaptor.forClass(LinkedRun.class);
        verify(flowRunCommand).startLinkedRun(linked.capture());
        assertEquals(new LinkedRun("p1", "wf-1", "revision-1", "run-1", "actual", "starter", linked.getValue().input()),
            linked.getValue());
        assertEquals("{\"plannedOutputQty\":10,\"targetItemId\":\"item-1\",\"workOrderId\":\"wo-1\"}",
            linked.getValue().input().toString());
    }

    @Test
    void finishPassesTheActualOutputAndWhoFinished() {
        ProductionRun run = run();
        run.setActualOutputQty(new BigDecimal("8"));

        adapter.onFinished(run);

        ArgumentCaptor<ObjectNode> output = ArgumentCaptor.forClass(ObjectNode.class);
        verify(flowRunCommand).finishLinkedRun(any(LinkedRun.class), output.capture(), eq("finisher"));
        assertEquals("{\"actualOutputQty\":8}", output.getValue().toString());
    }

    private static ProductionRun run() {
        ProductionRun run = new ProductionRun();
        run.setProjectId("p1");
        run.setWorkflowId("wf-1");
        run.setWorkflowRevisionId("revision-1");
        run.setProductionRunId("run-1");
        run.setRunType("actual");
        run.setStartedBy("starter");
        run.setFinishedBy("finisher");
        run.setPlannedOutputQty(new BigDecimal("10"));
        run.setTargetItemId("item-1");
        run.setWorkOrderId("wo-1");
        return run;
    }
}
