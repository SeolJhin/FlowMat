package org.myweb.flowmat.domain.flowrun.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunFinishRequest;
import org.myweb.flowmat.domain.flowrun.api.dto.request.FlowRunStartRequest;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRun;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunRepository;
import org.myweb.flowmat.domain.flowrun.repository.FlowRunStepRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.workflow.domain.entity.Workflow;
import org.myweb.flowmat.domain.workflow.domain.entity.WorkflowRevision;
import org.myweb.flowmat.domain.workflow.repository.WorkflowRevisionRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.id.IdGenerator;

@ExtendWith(MockitoExtension.class)
class FlowRunServiceTest {

    @Mock private FlowRunRepository runRepository;
    @Mock private FlowRunStepRepository stepRepository;
    @Mock private FlowRunEventRecorder eventRecorder;
    @Mock private WorkflowRevisionRepository revisionRepository;
    @Mock private ProjectAccessService accessService;
    @Mock private IdGenerator idGenerator;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private FlowRunService service;

    @BeforeEach
    void setUp() {
        service = new FlowRunService(runRepository, stepRepository, eventRecorder, revisionRepository,
            accessService, idGenerator, objectMapper);
    }

    @Test
    void startsOnlyPublishedRevisionWithAuthenticatedActorAndFrozenInputs() throws Exception {
        Workflow workflow = new Workflow();
        workflow.setWorkflowId("workflow-1");
        workflow.setProjectId("project-1");
        WorkflowRevision revision = new WorkflowRevision();
        revision.setWorkflowRevisionId("revision-1");
        revision.setStatus("published");
        when(accessService.requireWorkflowWriteAccess("workflow-1")).thenReturn(workflow);
        when(revisionRepository.findByWorkflowRevisionIdAndWorkflowId("revision-1", "workflow-1"))
            .thenReturn(Optional.of(revision));
        when(accessService.requireCurrentUserId()).thenReturn("authenticated-user");
        when(idGenerator.generate()).thenReturn("run-1");
        when(runRepository.saveAndFlush(any(FlowRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.start(new FlowRunStartRequest("workflow-1", "revision-1", "test",
            objectMapper.readTree("{\"lot\":\"L-1\"}")));

        assertEquals("revision-1", response.workflowRevisionId());
        assertEquals("authenticated-user", response.requestedBy());
        assertEquals("L-1", response.inputPayload().path("lot").asText());
        assertEquals("running", response.status());
        assertNotNull(response.startedAt());
    }

    @Test
    void refusesRetiredRevisionBeforeSavingRun() {
        Workflow workflow = new Workflow();
        workflow.setWorkflowId("workflow-1");
        WorkflowRevision revision = new WorkflowRevision();
        revision.setStatus("retired");
        when(accessService.requireWorkflowWriteAccess("workflow-1")).thenReturn(workflow);
        when(revisionRepository.findByWorkflowRevisionIdAndWorkflowId("revision-1", "workflow-1"))
            .thenReturn(Optional.of(revision));

        assertThrows(BusinessException.class,
            () -> service.start(new FlowRunStartRequest("workflow-1", "revision-1", "test", null)));
        verify(runRepository, never()).save(any());
    }

    @Test
    void finishRequiresWriteAccessAndRejectsSecondCompletion() throws Exception {
        FlowRun run = new FlowRun();
        run.setFlowRunId("run-1");
        run.setProjectId("project-1");
        run.setStatus("running");
        run.setInputPayload("{}");
        when(runRepository.findLockedByFlowRunId("run-1")).thenReturn(Optional.of(run));
        when(runRepository.save(any(FlowRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.finish("run-1", new FlowRunFinishRequest(objectMapper.readTree("{\"ok\":true}")));

        verify(accessService).requireProjectWriteAccess("project-1");
        assertEquals("finished", response.status());
        assertEquals(true, response.outputPayload().path("ok").asBoolean());
        assertNotNull(response.endedAt());
        assertThrows(BusinessException.class,
            () -> service.finish("run-1", new FlowRunFinishRequest(null)));
    }
}
