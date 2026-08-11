package com.hasnika.insurance.platformops.exception;


import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import reactor.core.publisher.Mono;

import java.util.Map;

@Slf4j
@Component("platformOpsGlobalExceptionHandler")
@RestControllerAdvice(basePackages = "com.hasnika.insurance")
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessRuleException.class)
    public Mono<ResponseEntity<Map<String, Object>>> handleBusinessRule(BusinessRuleException ex) {
        log.warn("Business rule violation: {} - {}", ex.getErrorCode(), ex.getMessage());
        return Mono.just(ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of(
                        "success", false,
                        "error", Map.of(
                                "code", ex.getErrorCode(),
                                "message", ex.getMessage()
                        )
                )));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public Mono<ResponseEntity<Map<String, Object>>> handleNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        return Mono.just(ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of(
                        "success", false,
                        "error", Map.of(
                                "code", "NOT_FOUND",
                                "message", ex.getMessage()
                        )
                )));
    }

    @ExceptionHandler(Exception.class)
    public Mono<ResponseEntity<Map<String, Object>>> handleGeneric(Exception ex) {
        log.error("Unexpected error", ex);
        return Mono.just(ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                        "success", false,
                        "error", Map.of(
                                "code", "INTERNAL_ERROR",
                                "message", "An unexpected error occurred"
                        )
                )));
    }
}
