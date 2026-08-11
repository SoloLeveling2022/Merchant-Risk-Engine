package com.hasnika.insurance.claimsfinance.controller;

import com.hasnika.insurance.claimsfinance.dto.PaymentRequest;
import com.hasnika.insurance.claimsfinance.dto.PaymentResponse;
import com.hasnika.insurance.claimsfinance.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/process")
    public Mono<ResponseEntity<PaymentResponse>> processPayment(
            @RequestBody PaymentRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        final String uid = userId != null ? userId : "DEMO-USER-ID";
        return paymentService.processInitialPayment(request, uid)
                .map(ResponseEntity::ok);
    }

    @PostMapping("/pay-premium/{policyId}")
    public Mono<ResponseEntity<PaymentResponse>> payPremium(
            @PathVariable String policyId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        final String uid = userId != null ? userId : "DEMO-USER-ID";
        return paymentService.payPremium(policyId, uid)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @GetMapping("/user")
    public Mono<ResponseEntity<java.util.List<com.hasnika.insurance.claimsfinance.entity.Transaction>>> getUserTransactions(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        final String uid = userId != null ? userId : "DEMO-USER-ID";
        return paymentService.getUserTransactions(uid)
                .map(ResponseEntity::ok);
    }
}
