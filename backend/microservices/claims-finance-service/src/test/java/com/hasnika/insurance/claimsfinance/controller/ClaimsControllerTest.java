package com.hasnika.insurance.claimsfinance.controller;

import com.hasnika.insurance.claimsfinance.dto.ClaimRequest;
import com.hasnika.insurance.claimsfinance.dto.ClaimResponse;
import com.hasnika.insurance.claimsfinance.entity.Claim;
import com.hasnika.insurance.claimsfinance.service.ClaimService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.hasnika.insurance.claimsfinance.dto.PaymentRequest;
import com.hasnika.insurance.claimsfinance.dto.PaymentResponse;
import com.hasnika.insurance.claimsfinance.entity.Transaction;
import com.hasnika.insurance.claimsfinance.service.PaymentService;

@WebFluxTest(controllers = {ClaimsController.class, PaymentController.class}, excludeAutoConfiguration = {ReactiveSecurityAutoConfiguration.class})
public class ClaimsControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private ClaimService claimService;

    @MockBean
    private PaymentService paymentService;

    @Test
    void shouldFileNewClaimSuccessfully() {
        ClaimRequest request = new ClaimRequest();
        request.setPolicyId("policy-1");
        request.setClaimAmount(BigDecimal.valueOf(100));
        request.setClaimReason("Accidental Damage");

        ClaimResponse mockResponse = ClaimResponse.builder()
                .claimId("claim-1")
                .status("PENDING")
                .message("Claim filed successfully")
                .build();

        when(claimService.fileClaim(any(ClaimRequest.class), anyString())).thenReturn(Mono.just(mockResponse));

        webTestClient.post()
                .uri("/api/v1/claims")
                .header("X-User-Id", "user-1")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.claimId").isEqualTo("claim-1")
                .jsonPath("$.status").isEqualTo("PENDING");
    }

    @Test
    void shouldReturn400IfClaimRejectedForWaitingPeriod() {
        ClaimRequest request = new ClaimRequest();
        request.setPolicyId("policy-1");
        request.setClaimAmount(BigDecimal.valueOf(100));
        request.setClaimReason("Accidental Damage");

        ClaimResponse mockResponse = ClaimResponse.builder()
                .status("REJECTED_WAITING_PERIOD")
                .build();

        when(claimService.fileClaim(any(ClaimRequest.class), anyString())).thenReturn(Mono.just(mockResponse));

        webTestClient.post()
                .uri("/api/v1/claims")
                .header("X-User-Id", "user-1")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody()
                .jsonPath("$.status").isEqualTo("REJECTED_WAITING_PERIOD");
    }

    @Test
    void shouldReturnUserClaims() {
        Claim mockClaim = Claim.builder()
                .claimId("claim-1")
                .userId("user-1")
                .build();

        when(claimService.getUserClaims("user-1")).thenReturn(Mono.just(java.util.List.of(mockClaim)));

        webTestClient.get()
                .uri("/api/v1/claims/user/user-1")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$[0].claimId").isEqualTo("claim-1");
    }

    @Test
    void shouldHandleClaimLifecycle() {
        Claim mockClaim = Claim.builder().claimId("c1").build();
        ClaimResponse approveRes = new ClaimResponse("c1", "APPROVED", "msg");
        ClaimResponse rejectRes = new ClaimResponse("c1", "REJECTED", "msg");

        when(claimService.processCrash(any())).thenReturn(Mono.empty());
        when(claimService.getAllClaims()).thenReturn(Mono.just(List.of(mockClaim)));
        when(claimService.getPendingClaims()).thenReturn(Mono.just(List.of(mockClaim)));
        when(claimService.approveClaim("c1")).thenReturn(Mono.just(approveRes));
        when(claimService.rejectClaim("c1", "Custom reason")).thenReturn(Mono.just(rejectRes));
        when(claimService.rejectClaim("c1", "Rejected by analyst")).thenReturn(Mono.just(rejectRes));

        // Crash
        webTestClient.post().uri("/api/v1/claims/process-crash").contentType(MediaType.APPLICATION_JSON).bodyValue("{}").exchange().expectStatus().isOk();
        
        // Gets
        webTestClient.get().uri("/api/v1/claims/all").exchange().expectStatus().isOk().expectBody().jsonPath("$[0].claimId").isEqualTo("c1");
        webTestClient.get().uri("/api/v1/claims/pending").exchange().expectStatus().isOk().expectBody().jsonPath("$[0].claimId").isEqualTo("c1");
        
        // Approve
        webTestClient.post().uri("/api/v1/claims/c1/approve").exchange().expectStatus().isOk().expectBody().jsonPath("$.status").isEqualTo("APPROVED");
        
        // Reject with and without body
        webTestClient.post().uri("/api/v1/claims/c1/reject").bodyValue(java.util.Map.of("rejectionReason", "Custom reason")).exchange().expectStatus().isOk().expectBody().jsonPath("$.status").isEqualTo("REJECTED");
        webTestClient.post().uri("/api/v1/claims/c1/reject").exchange().expectStatus().isOk().expectBody().jsonPath("$.status").isEqualTo("REJECTED");
    }

    @Test
    void shouldHandleErrorScenarios() {
        when(claimService.approveClaim("c2")).thenReturn(Mono.empty());
        when(claimService.rejectClaim(anyString(), anyString())).thenReturn(Mono.empty());
        
        ClaimRequest request = new ClaimRequest();
        request.setPolicyId("policy-1");
        request.setClaimAmount(BigDecimal.valueOf(100));
        request.setClaimReason("Accidental Damage");
        
        when(claimService.fileClaim(any(), any())).thenReturn(Mono.just(new ClaimResponse("c3", "REJECTED_WAITING_PERIOD", "err")));

        webTestClient.post().uri("/api/v1/claims/c2/approve").exchange().expectStatus().isNotFound();
        webTestClient.post().uri("/api/v1/claims/c2/reject").exchange().expectStatus().isNotFound();
        
        webTestClient.post().uri("/api/v1/claims")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange().expectStatus().isBadRequest()
                .expectBody().jsonPath("$.status").isEqualTo("REJECTED_WAITING_PERIOD");
    }

    @Test
    void shouldHandlePaymentLifecycle() {
        PaymentRequest request = PaymentRequest.builder().amount(BigDecimal.TEN).build();
        PaymentResponse response = PaymentResponse.builder().transactionId("t1").status("COMPLETED").message("OK").build();
        PaymentResponse response2 = PaymentResponse.builder().transactionId("t2").status("COMPLETED").message("OK").build();

        when(paymentService.processInitialPayment(any(PaymentRequest.class), anyString())).thenReturn(Mono.just(response));
        when(paymentService.payPremium(anyString(), anyString())).thenReturn(Mono.just(response2));
        
        Transaction tx = new Transaction();
        tx.setTransactionId("t1");
        tx.setAmount(BigDecimal.TEN);
        when(paymentService.getUserTransactions(anyString())).thenReturn(Mono.just(List.of(tx)));

        // Process Initial Payment
        webTestClient.post().uri("/api/v1/payments/process")
                .header("X-User-Id", "user1")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange().expectStatus().isOk().expectBody().jsonPath("$.transactionId").isEqualTo("t1");

        // Pay Premium
        webTestClient.post().uri("/api/v1/payments/pay-premium/p1")
                .header("X-User-Id", "user1")
                .exchange().expectStatus().isOk().expectBody().jsonPath("$.transactionId").isEqualTo("t2");
                
        // Get User Transactions
        webTestClient.get().uri("/api/v1/payments/user")
                .header("X-User-Id", "user1")
                .exchange().expectStatus().isOk().expectBody().jsonPath("$[0].transactionId").isEqualTo("t1");
    }
}