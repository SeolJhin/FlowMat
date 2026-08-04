package org.myweb.flowmat.domain.workflow.annotation.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.workflow.annotation.api.dto.request.CanvasAnnotationBatchRequest;
import org.myweb.flowmat.domain.workflow.annotation.api.dto.request.CanvasAnnotationBatchRequest.CanvasAnnotationBatchItemRequest;
import org.myweb.flowmat.domain.workflow.annotation.api.dto.request.CanvasAnnotationCreateRequest;
import org.myweb.flowmat.domain.workflow.annotation.api.dto.request.CanvasAnnotationPatchRequest;
import org.myweb.flowmat.domain.workflow.annotation.api.dto.response.CanvasAnnotationResponse;
import org.myweb.flowmat.domain.workflow.annotation.application.CanvasAnnotationService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.response.ApiResponse;

@ExtendWith(MockitoExtension.class)
class CanvasAnnotationControllerTest {

    private static final String WORKFLOW_ID = "wf-1";

    @Mock
    private CanvasAnnotationService canvasAnnotationService;

    @InjectMocks
    private CanvasAnnotationController controller;

    @Test
    void listDelegatesToServiceAndWrapsInApiResponse() {
        CanvasAnnotationResponse annotation = response("ann-1");
        when(canvasAnnotationService.list(WORKFLOW_ID)).thenReturn(List.of(annotation));

        ApiResponse<List<CanvasAnnotationResponse>> result = controller.list(WORKFLOW_ID);

        assertThat(result.success()).isTrue();
        assertThat(result.data()).containsExactly(annotation);
    }

    @Test
    void listPropagatesForbiddenWhenViewerLacksAccess() {
        when(canvasAnnotationService.list(WORKFLOW_ID))
            .thenThrow(new BusinessException(ErrorCode.FORBIDDEN, "Project write access is required."));

        assertThatThrownBy(() -> controller.list(WORKFLOW_ID))
            .isInstanceOf(BusinessException.class)
            .extracting("errorCode")
            .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void createDelegatesToServiceAndReturnsCreatedAnnotation() {
        CanvasAnnotationCreateRequest request = new CanvasAnnotationCreateRequest(
            "shape", "rectangle", 0d, 0d, 100d, 100d, 0d, null, null, null, null, null
        );
        CanvasAnnotationResponse annotation = response("ann-1");
        when(canvasAnnotationService.create(WORKFLOW_ID, request)).thenReturn(annotation);

        ApiResponse<CanvasAnnotationResponse> result = controller.create(WORKFLOW_ID, request);

        assertThat(result.success()).isTrue();
        assertThat(result.data()).isEqualTo(annotation);
    }

    @Test
    void createPropagatesForbiddenWhenViewerAttemptsWrite() {
        CanvasAnnotationCreateRequest request = new CanvasAnnotationCreateRequest(
            "shape", "rectangle", 0d, 0d, 100d, 100d, 0d, null, null, null, null, null
        );
        when(canvasAnnotationService.create(WORKFLOW_ID, request))
            .thenThrow(new BusinessException(ErrorCode.FORBIDDEN, "Project write access is required."));

        assertThatThrownBy(() -> controller.create(WORKFLOW_ID, request))
            .isInstanceOf(BusinessException.class)
            .extracting("errorCode")
            .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void patchDelegatesToService() {
        CanvasAnnotationPatchRequest request = new CanvasAnnotationPatchRequest(
            1d, 2d, null, null, null, null, null, null, null, null, null, 1, 5L
        );
        CanvasAnnotationResponse annotation = response("ann-1");
        when(canvasAnnotationService.patch(WORKFLOW_ID, "ann-1", request)).thenReturn(annotation);

        ApiResponse<CanvasAnnotationResponse> result = controller.patch(WORKFLOW_ID, "ann-1", request);

        assertThat(result.data()).isEqualTo(annotation);
    }

    @Test
    void deleteDelegatesToServiceAndReturnsNullPayload() {
        ApiResponse<Void> result = controller.delete(WORKFLOW_ID, "ann-1");

        assertThat(result.success()).isTrue();
        assertThat(result.data()).isNull();
    }

    @Test
    void batchDelegatesToServiceAndReturnsUpdatedList() {
        CanvasAnnotationBatchRequest request = new CanvasAnnotationBatchRequest(List.of(
            new CanvasAnnotationBatchItemRequest("ann-1", 1d, 2d, null, null, null, null, null)
        ));
        List<CanvasAnnotationResponse> updated = List.of(response("ann-1"));
        when(canvasAnnotationService.batchUpdate(WORKFLOW_ID, request)).thenReturn(updated);

        ApiResponse<List<CanvasAnnotationResponse>> result = controller.batch(WORKFLOW_ID, request);

        assertThat(result.data()).isEqualTo(updated);
    }

    private CanvasAnnotationResponse response(String id) {
        return new CanvasAnnotationResponse(
            id, WORKFLOW_ID, "proj-1", "shape", "rectangle",
            0d, 0d, 100d, 100d, 0d, null, null, null, "1024", null, "N", 1, 1L
        );
    }
}
