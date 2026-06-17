package org.myweb.flowmat.global.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleBusinessExceptionUsesCustomMessage() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleBusinessException(
            new BusinessException(ErrorCode.BAD_REQUEST, "Connection target is invalid.")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isEqualTo(ApiResponse.error("Connection target is invalid."));
    }

    @Test
    void handleBindExceptionUsesFirstFieldErrorMessage() {
        BindException bindException = new BindException(new Object(), "request");
        bindException.addError(new FieldError("request", "processName", "must not be blank"));

        ResponseEntity<ApiResponse<Void>> response = handler.handleBindException(bindException);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isEqualTo(ApiResponse.error("must not be blank"));
    }
}
