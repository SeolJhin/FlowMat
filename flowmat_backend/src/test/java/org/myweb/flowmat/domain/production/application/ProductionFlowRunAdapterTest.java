package org.myweb.flowmat.domain.production.application;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRun;
import org.myweb.flowmat.domain.flowrun.application.FlowRunEventRecorder;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunRepository;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.global.id.IdGenerator;

@ExtendWith(MockitoExtension.class)
class ProductionFlowRunAdapterTest {

    @Mock private FlowRunRepository repository;
    @Mock private EntityManager entityManager;
    @Mock private FlowRunEventRecorder eventRecorder;
    @Mock private IdGenerator idGenerator;

    private ProductionFlowRunAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new ProductionFlowRunAdapter(repository, eventRecorder,
            entityManager, idGenerator, new ObjectMapper());
    }

    @Test
    void historicalRunWithUnsupportedTypeCanStillFinishWithoutCreatingAFlowRun() {
        ProductionRun oldRun = new ProductionRun();
        oldRun.setProductionRunId("old-run");
        oldRun.setWorkflowRevisionId("revision-1");
        oldRun.setRunType("custom-legacy-type");
        when(repository.findLockedByProductionRunId("old-run")).thenReturn(Optional.empty());

        adapter.onFinished(oldRun);

        verify(repository, never()).save(org.mockito.ArgumentMatchers.any(FlowRun.class));
        verify(entityManager, never()).flush();
    }
}
