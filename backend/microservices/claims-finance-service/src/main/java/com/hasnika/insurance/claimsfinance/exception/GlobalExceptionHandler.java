package com.hasnika.insurance.claimsfinance.exception;


import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.validation.FieldError;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component("claimsFinanceGlobalExceptionHandler")
@RestControllerAdvice(basePackages = "com.hasnika.insurance")
public class GlobalExceptionHandler {

    @ExceptionHandler(WebExchangeBindException.class)
    public Mono<ResponseEntity<Map<String, Object>>> handleValidationException(WebExchangeBindException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        
        return Mono.just(ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "success", false,
                        "error", Map.of(
                                "code", "VALIDATION_FAILED",
                                "message", "Input validation failed",
                                "details", errors
                        )
                )));
    }

    @ExceptionHandler(ClaimNotEligibleException.class)
    public Mono<ResponseEntity<Map<String, Object>>> handleClaimNotEligible(ClaimNotEligibleException ex) {
        log.warn("Claim not eligible: {}", ex.getMessage());
        return Mono.just(ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "success", false,
                        "error", Map.of(
                                "code", "CLAIM_NOT_ELIGIBLE",
                                "message", ex.getMessage()
                        )
                )));
    }

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
