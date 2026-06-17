package org.myweb.flowmat.global.exception;

import jakarta.validation.ConstraintViolationException;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        return ResponseEntity
            .status(e.getErrorCode().getStatus())
            .body(ApiResponse.error(resolveBusinessMessage(e)));
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<ApiResponse<Void>> handleBindException(BindException e) {
        return ResponseEntity
            .status(ErrorCode.BAD_REQUEST.getStatus())
            .body(ApiResponse.error(resolveBindMessage(e)));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolationException(ConstraintViolationException e) {
        return ResponseEntity
            .status(ErrorCode.BAD_REQUEST.getStatus())
            .body(ApiResponse.error(resolveConstraintViolationMessage(e)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        return ResponseEntity
            .status(ErrorCode.INTERNAL_ERROR.getStatus())
            .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR.getMessage()));
    }

    private static String resolveBusinessMessage(BusinessException e) {
        return e.getMessage() != null && !e.getMessage().isBlank()
            ? e.getMessage()
            : e.getErrorCode().getMessage();
    }

    private static String resolveBindMessage(BindException e) {
        if (e.getBindingResult().getFieldError() != null && e.getBindingResult().getFieldError().getDefaultMessage() != null) {
            return e.getBindingResult().getFieldError().getDefaultMessage();
        }
        return ErrorCode.BAD_REQUEST.getMessage();
    }

    private static String resolveConstraintViolationMessage(ConstraintViolationException e) {
        return e.getConstraintViolations().stream()
            .findFirst()
            .map(violation -> violation.getMessage())
            .filter(message -> message != null && !message.isBlank())
            .orElse(ErrorCode.BAD_REQUEST.getMessage());
    }
}
