package com.hasnika.insurance.core.controller;

import com.hasnika.insurance.core.dto.PolicyDTO;
import com.hasnika.insurance.core.dto.PurchaseRequest;
import com.hasnika.insurance.core.dto.PurchaseResponse;
import com.hasnika.insurance.core.dto.QuoteRequest;
import com.hasnika.insurance.core.dto.QuoteResponse;
import com.hasnika.insurance.core.service.PolicyService;
import com.hasnika.insurance.core.service.UnderwritingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@WebFluxTest(
    controllers = {PolicyController.class, UnderwritingController.class}, 
    excludeAutoConfiguration = {ReactiveSecurityAutoConfiguration.class},
    properties = {"eureka.client.enabled=false", "spring.cloud.discovery.enabled=false"}
)
public class PolicyControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private PolicyService policyService;

    @MockBean
    private UnderwritingService underwritingService;

    @Test
    void shouldReturnPolicyById() {
        PolicyDTO mockPolicy = PolicyDTO.builder()
                .policyId("policy-1")
                .insuredValue(new BigDecimal("1000.00"))
                .build();

        when(policyService.getPolicyById(anyString())).thenReturn(Mono.just(mockPolicy));

        webTestClient.get()
                .uri("/api/v1/policies/policy-1")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.policyId").isEqualTo("policy-1")
                .jsonPath("$.insuredValue").isEqualTo(1000.00);
    }

    @Test
    void shouldReturn404ForUnknownPolicyId() {
        when(policyService.getPolicyById(anyString())).thenReturn(Mono.empty());

        webTestClient.get()
                .uri("/api/v1/policies/unknown")
                .exchange()
                .expectStatus().isNotFound();
    }

    @Test
    void shouldPurchasePolicy() {
        PurchaseRequest request = new PurchaseRequest();
        request.setQuoteId("quote-1");
        request.setTenureYears(1);

        PurchaseResponse mockResponse = new PurchaseResponse("Policy purchased successfully!", "policy-1");

        when(policyService.purchasePolicy(any(PurchaseRequest.class), anyString())).thenReturn(Mono.just(mockResponse));

        webTestClient.post()
                .uri("/api/v1/policies/purchase")
                .header("X-User-Id", "user-1")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.policyId").isEqualTo("policy-1")
                .jsonPath("$.message").isEqualTo("Policy purchased successfully!");
    }

    @Test
    void shouldAcceptEndorsement() {
        PolicyDTO mockPolicy = PolicyDTO.builder()
                .policyId("policy-1")
                .build();

        when(policyService.acceptEndorsement(anyString(), anyString())).thenReturn(Mono.just(mockPolicy));

        webTestClient.post()
                .uri("/api/v1/policies/policy-1/endorsements/tranche-1/accept")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.policyId").isEqualTo("policy-1");
    }

    @Test
    void shouldHandleOtherPolicyEndpoints() {
        PolicyDTO mockPolicy = PolicyDTO.builder().policyId("policy-1").build();
        when(policyService.getAllPolicies()).thenReturn(Mono.just(java.util.List.of(mockPolicy)));
        when(policyService.getUserPolicies(anyString())).thenReturn(Mono.just(java.util.List.of(mockPolicy)));
        when(policyService.getPendingEndorsements()).thenReturn(Mono.just(java.util.List.of(mockPolicy)));
        when(policyService.advancePremium(anyString())).thenReturn(Mono.empty());
        when(policyService.reUnderwritePolicy(anyString())).thenReturn(Mono.empty());
        when(policyService.rejectEndorsement(anyString(), anyString())).thenReturn(Mono.just(mockPolicy));

        webTestClient.get().uri("/api/v1/policies/all").exchange().expectStatus().isOk();
        webTestClient.get().uri("/api/v1/policies/user/u1").exchange().expectStatus().isOk();
        webTestClient.get().uri("/api/v1/policies/pending-endorsements").exchange().expectStatus().isOk();
        webTestClient.put().uri("/api/v1/policies/policy-1/advance-premium").exchange().expectStatus().isOk();
        webTestClient.post().uri("/api/v1/policies/re-underwrite/portfolio/portfolio-1").exchange().expectStatus().isOk();
        webTestClient.post().uri("/api/v1/policies/policy-1/endorsements/tranche-1/reject").exchange().expectStatus().isOk();
    }

    @Test
    void shouldHandleUnderwritingEndpoints() {
        QuoteRequest req = QuoteRequest.builder().portfolioId("p1").coverageType("COMPREHENSIVE").build();
        QuoteResponse resp = new QuoteResponse();
        resp.setQuoteId("q1");
        
        when(underwritingService.generateQuote(any())).thenReturn(Mono.just(resp));
        
        webTestClient.post().uri("/api/v1/underwriting/quote")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(req)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.quoteId").isEqualTo("q1");
    }

    @Test
    void shouldCoverControllerEmptyBranches() {
        // purchasePolicy defaultIfEmpty
        when(policyService.purchasePolicy(any(PurchaseRequest.class), anyString())).thenReturn(Mono.empty());
        webTestClient.post().uri("/api/v1/policies/purchase")
                .header("X-User-Id", "user-1")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new PurchaseRequest())
                .exchange()
                .expectStatus().isBadRequest();

        // acceptEndorsement defaultIfEmpty
        when(policyService.acceptEndorsement(anyString(), anyString())).thenReturn(Mono.empty());
        webTestClient.post().uri("/api/v1/policies/policy-1/endorsements/tranche-1/accept")
                .exchange()
                .expectStatus().isNotFound();

        // rejectEndorsement defaultIfEmpty
        when(policyService.rejectEndorsement(anyString(), anyString())).thenReturn(Mono.empty());
        webTestClient.post().uri("/api/v1/policies/policy-1/endorsements/tranche-1/reject")
                .exchange()
                .expectStatus().isNotFound();

        // reUnderwritePolicy onErrorResume
        when(policyService.reUnderwritePolicy(anyString())).thenReturn(Mono.error(new RuntimeException("Re-underwriting failed")));
        webTestClient.post().uri("/api/v1/policies/re-underwrite/portfolio/portfolio-1")
                .exchange()
                .expectStatus().isOk();

        // getPolicyById defaultIfEmpty
        when(policyService.getPolicyById(anyString())).thenReturn(Mono.empty());
        webTestClient.get().uri("/api/v1/policies/policy-empty")
                .exchange()
                .expectStatus().isNotFound();
    }
}
