package org.myweb.flowmat.domain.workflow.editor.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.workflow.editor.api.dto.request.EditorDocumentSaveRequest;
import org.myweb.flowmat.domain.workflow.editor.api.dto.response.EditorDocumentResponse;
import org.myweb.flowmat.domain.workflow.editor.application.WorkflowEditorDocumentService;
import org.myweb.flowmat.global.response.ApiResponse;

@ExtendWith(MockitoExtension.class)
class WorkflowEditorDocumentControllerTest {

    private static final String WORKFLOW_ID = "wf-1";
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private WorkflowEditorDocumentService service;

    @InjectMocks
    private WorkflowEditorDocumentController controller;

    @Test
    void getDocumentDelegatesToServiceAndWrapsResponse() {
        EditorDocumentResponse document = documentResponse();
        when(service.getDocument(WORKFLOW_ID)).thenReturn(document);

        ApiResponse<EditorDocumentResponse> response = controller.getDocument(WORKFLOW_ID);

        assertThat(response.success()).isTrue();
        assertThat(response.data()).isEqualTo(document);
    }

    @Test
    void saveDocumentDelegatesToServiceAndWrapsResponse() {
        EditorDocumentSaveRequest request = new EditorDocumentSaveRequest(
            1,
            objectMapper.createObjectNode().put("x", 0).put("y", 0).put("zoom", 1),
            1,
            List.of()
        );
        EditorDocumentResponse document = documentResponse();
        when(service.saveDocument(WORKFLOW_ID, request)).thenReturn(document);

        ApiResponse<EditorDocumentResponse> response = controller.saveDocument(WORKFLOW_ID, request);

        assertThat(response.success()).isTrue();
        assertThat(response.data()).isEqualTo(document);
    }

    private EditorDocumentResponse documentResponse() {
        return new EditorDocumentResponse(
            1,
            objectMapper.createObjectNode().put("x", 0).put("y", 0).put("zoom", 1),
            1,
            1,
            1L,
            List.of()
        );
    }
}
