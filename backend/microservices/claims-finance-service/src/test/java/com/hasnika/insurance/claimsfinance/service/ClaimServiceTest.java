package com.hasnika.insurance.claimsfinance.service;

import com.hasnika.insurance.claimsfinance.dto.ClaimRequest;
import com.hasnika.insurance.claimsfinance.dto.ClaimResponse;
import com.hasnika.insurance.claimsfinance.entity.Claim;
import com.hasnika.insurance.claimsfinance.repository.ClaimRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import com.hasnika.insurance.claimsfinance.dto.ClaimCalculationResult;
import com.hasnika.insurance.claimsfinance.dto.PaymentRequest;
import com.hasnika.insurance.claimsfinance.dto.PaymentResponse;
import com.hasnika.insurance.claimsfinance.dto.PolicyStatus;
import com.hasnika.insurance.claimsfinance.entity.Transaction;
import com.hasnika.insurance.claimsfinance.exception.ClaimNotEligibleException;
import com.hasnika.insurance.claimsfinance.repository.TransactionRepository;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
public class ClaimServiceTest {

    @Mock
    private ClaimRepository claimRepository;

    @Mock
    private WebClient.Builder webClientBuilder;

    @Mock
    private WebClient webClient;

    @Mock
    private TransactionRepository transactionRepository;

    private ClaimService claimService;

    private Claim mockClaim;

    @BeforeEach
    void setUp() {
        when(webClientBuilder.baseUrl(anyString())).thenReturn(webClientBuilder);
        when(webClientBuilder.build()).thenReturn(webClient);
        claimService = new ClaimService(claimRepository, webClientBuilder);

        mockClaim = Claim.builder()
                .claimId(UUID.randomUUID().toString())
                .policyId("policy-1")
                .userId("user-1")
                .claimStatus("APPROVED")
                .payoutAmount(new BigDecimal("5000.00"))
                .build();
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldHandleClaimRetrievalAndFiling() {
        // Mock get methods
        when(claimRepository.findByUserId("user-1")).thenReturn(Flux.just(mockClaim));
        when(claimRepository.findAll()).thenReturn(Flux.just(mockClaim));
        when(claimRepository.findByClaimStatus("UNDER_REVIEW")).thenReturn(Flux.just(mockClaim));

        StepVerifier.create(claimService.getUserClaims("user-1")).expectNextMatches(l -> l.size() == 1).verifyComplete();
        StepVerifier.create(claimService.getAllClaims()).expectNextMatches(l -> l.size() == 1).verifyComplete();
        StepVerifier.create(claimService.getPendingClaims()).expectNextMatches(l -> l.size() == 1).verifyComplete();
        StepVerifier.create(claimService.processCrash(new Object())).verifyComplete();

        // Mock fileClaim success cases (Approved and Under Review)
        ClaimRequest reqApprove = new ClaimRequest(); reqApprove.setPolicyId("p1"); reqApprove.setClaimAmount(new BigDecimal("50000.00"));
        ClaimRequest reqReview = new ClaimRequest(); reqReview.setPolicyId("p1"); reqReview.setClaimAmount(new BigDecimal("200000.00"));
        ClaimRequest reqError = new ClaimRequest(); reqError.setPolicyId("unknown");

        WebClient.RequestHeadersUriSpec reqUriSpec = org.mockito.Mockito.mock(WebClient.RequestHeadersUriSpec.class);
        WebClient.RequestHeadersSpec reqHeadersSpec = org.mockito.Mockito.mock(WebClient.RequestHeadersSpec.class);
        WebClient.ResponseSpec respSpec = org.mockito.Mockito.mock(WebClient.ResponseSpec.class);
        com.hasnika.insurance.claimsfinance.dto.PolicyDTO policy = new com.hasnika.insurance.claimsfinance.dto.PolicyDTO();
        policy.setProtectionStartDate(java.time.LocalDate.now().minusYears(6)); policy.setCoveragePercentage(new BigDecimal("80.00"));

        when(webClient.get()).thenReturn(reqUriSpec);
        when(reqUriSpec.uri(anyString(), org.mockito.ArgumentMatchers.eq("p1"))).thenReturn(reqHeadersSpec);
        when(reqUriSpec.uri(anyString(), org.mockito.ArgumentMatchers.eq("unknown"))).thenReturn(reqHeadersSpec);
        when(reqHeadersSpec.retrieve()).thenReturn(respSpec);
        
        // Return policy for p1, error for unknown
        when(respSpec.bodyToMono(com.hasnika.insurance.claimsfinance.dto.PolicyDTO.class))
            .thenReturn(Mono.just(policy), Mono.just(policy), Mono.error(new RuntimeException("Err")));
            
        when(claimRepository.save(any(Claim.class))).thenReturn(
            Mono.just(mockClaim), // Approved
            Mono.just(Claim.builder().claimId("c1").claimStatus("UNDER_REVIEW").build()), // Review
            Mono.just(Claim.builder().claimId("mock").claimStatus("REJECTED_WAITING_PERIOD").build()) // Error fallback save
        );

        StepVerifier.create(claimService.fileClaim(reqApprove, "")).expectNextMatches(res -> "APPROVED".equals(res.getStatus())).verifyComplete();
        StepVerifier.create(claimService.fileClaim(reqReview, "u1")).expectNextMatches(res -> "UNDER_REVIEW".equals(res.getStatus())).verifyComplete();
        StepVerifier.create(claimService.fileClaim(reqError, "u1")).expectNextMatches(res -> "REJECTED_WAITING_PERIOD".equals(res.getStatus())).verifyComplete();
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldHandleClaimApprovalsAndRejections() {
        Claim mockC = Claim.builder().claimId("c1").policyId("p1").grossLoss(new BigDecimal("1000")).build();
        when(claimRepository.findById("c1")).thenReturn(Mono.just(mockC));
        when(claimRepository.save(any(Claim.class))).thenReturn(Mono.just(mockC));

        WebClient.RequestHeadersUriSpec reqUriSpec = org.mockito.Mockito.mock(WebClient.RequestHeadersUriSpec.class);
        WebClient.RequestHeadersSpec reqHeadersSpec = org.mockito.Mockito.mock(WebClient.RequestHeadersSpec.class);
        WebClient.ResponseSpec respSpec = org.mockito.Mockito.mock(WebClient.ResponseSpec.class);
        com.hasnika.insurance.claimsfinance.dto.PolicyDTO policy = new com.hasnika.insurance.claimsfinance.dto.PolicyDTO();

        when(webClient.get()).thenReturn(reqUriSpec);
        when(reqUriSpec.uri(anyString(), anyString())).thenReturn(reqHeadersSpec);
        when(reqHeadersSpec.retrieve()).thenReturn(respSpec);
        when(respSpec.bodyToMono(com.hasnika.insurance.claimsfinance.dto.PolicyDTO.class)).thenReturn(Mono.just(policy));

        WebClient.RequestBodyUriSpec reqBodyUriSpec = org.mockito.Mockito.mock(WebClient.RequestBodyUriSpec.class);
        WebClient.RequestBodySpec reqBodySpec = org.mockito.Mockito.mock(WebClient.RequestBodySpec.class);
        when(webClient.post()).thenReturn(reqBodyUriSpec);
        when(reqBodyUriSpec.uri(anyString())).thenReturn(reqBodySpec);
        when(reqBodySpec.bodyValue(any())).thenReturn(reqHeadersSpec);
        when(respSpec.bodyToMono(Void.class)).thenReturn(Mono.empty());

        StepVerifier.create(claimService.approveClaim("c1")).expectNextMatches(res -> "APPROVED".equals(res.getStatus())).verifyComplete();
        StepVerifier.create(claimService.rejectClaim("c1", "Reason")).expectNextMatches(res -> "REJECTED".equals(res.getStatus())).verifyComplete();
    }

    @Test
    void shouldHandleEnginesAndGateway() {
        // ClaimCalculationEngine
        ClaimCalculationEngine calcEngine = new ClaimCalculationEngine();
        ClaimCalculationEngine.TrancheSummary t1 = new ClaimCalculationEngine.TrancheSummary(UUID.randomUUID(), 1, LocalDate.now().minusDays(1), new BigDecimal("50.0"), List.of("AAPL"));
        ClaimCalculationEngine.TrancheSummary t2 = new ClaimCalculationEngine.TrancheSummary(UUID.randomUUID(), 1, LocalDate.now().plusDays(1), new BigDecimal("50.0"), List.of("AAPL"));
        java.util.Map<String, BigDecimal> current = java.util.Map.of("AAPL", new BigDecimal("100.0"));
        java.util.Map<String, BigDecimal> base = java.util.Map.of("AAPL", new BigDecimal("150.0"));
        
        ClaimCalculationResult r1 = calcEngine.calculate(List.of(t1), LocalDate.now(), current, base);
        assertEquals(new BigDecimal("25.0000"), r1.totalPayout());
        assertEquals(BigDecimal.ZERO, calcEngine.calculate(List.of(t2), LocalDate.now(), current, base).totalPayout());
        assertEquals(new BigDecimal("0.0000"), calcEngine.calculate(List.of(t1), LocalDate.now(), java.util.Map.of("AAPL", new BigDecimal("200.0")), base).totalPayout());
        assertEquals(new BigDecimal("0.0000"), calcEngine.calculate(List.of(t1), LocalDate.now(), current, java.util.Map.of("GOOG", new BigDecimal("150.0"))).totalPayout());
        
        assertDoesNotThrow(() -> calcEngine.validateClaimEligibility(PolicyStatus.CLAIM_ELIGIBLE.name(), true, true));
        assertThrows(ClaimNotEligibleException.class, () -> calcEngine.validateClaimEligibility("UNKNOWN", true, true));

        // FraudDetectionEngine
        FraudDetectionEngine fraudEngine = new FraudDetectionEngine();
        assertFalse(fraudEngine.evaluate(new FraudDetectionEngine.FraudInput("p1", new BigDecimal("50.0"), Instant.now().minus(40, ChronoUnit.DAYS), 0)).flagged());
        assertFalse(fraudEngine.evaluate(new FraudDetectionEngine.FraudInput("p1", new BigDecimal("50.0"), Instant.now().minus(10, ChronoUnit.DAYS), 0)).flagged());
        assertFalse(fraudEngine.evaluate(new FraudDetectionEngine.FraudInput("p1", new BigDecimal("90.0"), Instant.now().minus(40, ChronoUnit.DAYS), 0)).flagged());
        assertTrue(fraudEngine.evaluate(new FraudDetectionEngine.FraudInput("p1", new BigDecimal("50.0"), Instant.now().minus(40, ChronoUnit.DAYS), 3)).flagged());
        assertTrue(fraudEngine.evaluate(new FraudDetectionEngine.FraudInput("p1", new BigDecimal("90.0"), Instant.now().minus(10, ChronoUnit.DAYS), 3)).flagged());

        // MockPaymentGateway
        MockPaymentGateway gateway = new MockPaymentGateway();
        StepVerifier.create(gateway.initiateClaimPayout(new BigDecimal("100.0"), UUID.randomUUID())).expectNextMatches(res -> res.status() != null).verifyComplete();
        StepVerifier.create(gateway.collectPremium(new BigDecimal("100.0"), UUID.randomUUID())).expectNextMatches(res -> res.status() != null).verifyComplete();
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldHandlePaymentService() {
        PaymentService paymentService = new PaymentService(transactionRepository, webClientBuilder);
        
        // Initial Payment
        PaymentRequest req1 = new PaymentRequest(); req1.setQuoteId("q1"); req1.setAmount(new BigDecimal("100.0")); req1.setTransactionType("INITIAL_PREMIUM");
        PaymentRequest req2 = new PaymentRequest(); req2.setQuoteId("q1"); req2.setAmount(new BigDecimal("100.0")); 

        Transaction tx = new Transaction(); tx.setTransactionId("tx1");
        when(transactionRepository.save(any(Transaction.class))).thenReturn(Mono.just(tx));
        when(transactionRepository.findByUserId("u1")).thenReturn(Flux.just(tx));

        StepVerifier.create(paymentService.processInitialPayment(req1, "u1")).expectNextMatches(res -> "tx1".equals(res.getTransactionId())).verifyComplete();
        StepVerifier.create(paymentService.processInitialPayment(req2, "u1")).expectNextMatches(res -> "tx1".equals(res.getTransactionId())).verifyComplete();
        StepVerifier.create(paymentService.getUserTransactions("u1")).expectNextMatches(list -> list.size() == 1).verifyComplete();

        // Premiums
        com.hasnika.insurance.claimsfinance.dto.PolicyDTO pNo = new com.hasnika.insurance.claimsfinance.dto.PolicyDTO(); pNo.setAnnualPremium(new BigDecimal("2000.00")); pNo.setNextPremiumDueDate(LocalDate.now().plusDays(10));
        com.hasnika.insurance.claimsfinance.dto.PolicyDTO pPen = new com.hasnika.insurance.claimsfinance.dto.PolicyDTO(); pPen.setAnnualPremium(new BigDecimal("2000.00")); pPen.setNextPremiumDueDate(LocalDate.now().minusDays(10));

        WebClient.RequestHeadersUriSpec reqUriSpec = org.mockito.Mockito.mock(WebClient.RequestHeadersUriSpec.class);
        WebClient.RequestHeadersSpec reqHeadersSpec = org.mockito.Mockito.mock(WebClient.RequestHeadersSpec.class);
        WebClient.ResponseSpec respSpec = org.mockito.Mockito.mock(WebClient.ResponseSpec.class);
        when(webClient.get()).thenReturn(reqUriSpec);
        when(reqUriSpec.uri(anyString(), org.mockito.ArgumentMatchers.eq("p1"))).thenReturn(reqHeadersSpec);
        when(reqUriSpec.uri(anyString(), org.mockito.ArgumentMatchers.eq("p2"))).thenReturn(reqHeadersSpec);
        when(reqHeadersSpec.retrieve()).thenReturn(respSpec);
        when(respSpec.bodyToMono(com.hasnika.insurance.claimsfinance.dto.PolicyDTO.class)).thenReturn(Mono.just(pNo), Mono.just(pPen));

        WebClient.RequestBodyUriSpec reqBodyUriSpec = org.mockito.Mockito.mock(WebClient.RequestBodyUriSpec.class);
        WebClient.RequestBodySpec reqBodySpec = org.mockito.Mockito.mock(WebClient.RequestBodySpec.class);
        when(webClient.put()).thenReturn(reqBodyUriSpec);
        when(reqBodyUriSpec.uri(anyString(), anyString())).thenReturn(reqBodySpec);
        when(reqBodySpec.retrieve()).thenReturn(respSpec);
        when(respSpec.bodyToMono(Void.class)).thenReturn(Mono.empty());

        StepVerifier.create(paymentService.payPremium("p1", "u1")).expectNextMatches(res -> res.getMessage().contains("2000.00")).verifyComplete();
        StepVerifier.create(paymentService.payPremium("p2", "u1")).expectNextMatches(res -> res.getMessage().contains("2200.00")).verifyComplete();
    }
}
