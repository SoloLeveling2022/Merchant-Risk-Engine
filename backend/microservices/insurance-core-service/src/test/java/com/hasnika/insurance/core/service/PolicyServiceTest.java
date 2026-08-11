package com.hasnika.insurance.core.service;

import com.hasnika.insurance.core.dto.PolicyDTO;
import com.hasnika.insurance.core.dto.PurchaseRequest;
import com.hasnika.insurance.core.dto.PurchaseResponse;
import com.hasnika.insurance.core.entity.CoverageTranche;
import com.hasnika.insurance.core.entity.Policy;
import com.hasnika.insurance.core.entity.Quote;
import com.hasnika.insurance.core.repository.CoverageTrancheRepository;
import com.hasnika.insurance.core.repository.PolicyRepository;
import com.hasnika.insurance.core.repository.QuoteRepository;
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
import java.time.LocalDate;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;
import org.springframework.web.reactive.function.client.WebClient.RequestHeadersUriSpec;
import org.springframework.web.reactive.function.client.WebClient.RequestHeadersSpec;
import org.springframework.web.reactive.function.client.WebClient.ResponseSpec;
import com.hasnika.insurance.core.dto.PortfolioDTO;
import com.hasnika.insurance.core.dto.PortfolioHoldingDTO;
import com.hasnika.insurance.core.dto.QuoteRequest;

@ExtendWith(MockitoExtension.class)
public class PolicyServiceTest {

    @Mock
    private PolicyRepository policyRepository;

    @Mock
    private QuoteRepository quoteRepository;

    @Mock
    private CoverageTrancheRepository trancheRepository;

    @Mock
    private UnderwritingService underwritingService;

    @Mock
    private WebClient.Builder webClientBuilder;

    @Mock
    private WebClient webClient;

    @Mock
    private RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RequestHeadersSpec requestHeadersSpec;

    @Mock
    private ResponseSpec responseSpec;

    private PolicyService policyService;

    private Policy mockPolicy;
    private Quote mockQuote;
    private CoverageTranche mockTranche;

    @BeforeEach
    void setUp() {
        lenient().when(webClientBuilder.baseUrl(anyString())).thenReturn(webClientBuilder);
        lenient().when(webClientBuilder.build()).thenReturn(webClient);
        policyService = new PolicyService(policyRepository, quoteRepository, trancheRepository, underwritingService, webClientBuilder);

        mockPolicy = Policy.builder()
                .policyId(UUID.randomUUID().toString())
                .userId("user-1")
                .portfolioId("port-1")
                .quoteId("quote-1")
                .totalInsuredValue(new BigDecimal("1000.00"))
                .baseCoveragePct(new BigDecimal("70.0"))
                .build();

        mockQuote = Quote.builder()
                .quoteId("quote-1")
                .portfolioId("port-1")
                .insuredValue(new BigDecimal("1000.00"))
                .build();

        mockTranche = CoverageTranche.builder()
                .trancheId(UUID.randomUUID().toString())
                .policyId(mockPolicy.getPolicyId())
                .trancheStatus("ACTIVE")
                .trancheNumber(1)
                .riskScore(new BigDecimal("300"))
                .coveragePercentage(new BigDecimal("70"))
                .premiumPercentage(new BigDecimal("5.0"))
                .insuredValue(new BigDecimal("1000"))
                .build();
    }

    @Test
    void shouldGetPolicyById() {
        when(policyRepository.findById(anyString())).thenReturn(Mono.just(mockPolicy));
        when(quoteRepository.findById(anyString())).thenReturn(Mono.just(mockQuote));
        when(trancheRepository.findByPolicyId(anyString())).thenReturn(Flux.just(mockTranche));

        Mono<PolicyDTO> resultMono = policyService.getPolicyById(mockPolicy.getPolicyId());

        StepVerifier.create(resultMono)
                .expectNextMatches(dto -> dto.getPolicyId().equals(mockPolicy.getPolicyId()) &&
                        dto.getInsuredValue().compareTo(new BigDecimal("1000.00")) == 0)
                .verifyComplete();
    }

    @Test
    void shouldGetAllPolicies() {
        when(policyRepository.findAll()).thenReturn(Flux.just(mockPolicy));
        when(quoteRepository.findById(anyString())).thenReturn(Mono.just(mockQuote));
        when(trancheRepository.findByPolicyId(anyString())).thenReturn(Flux.just(mockTranche));

        Mono<java.util.List<PolicyDTO>> resultMono = policyService.getAllPolicies();

        StepVerifier.create(resultMono)
                .expectNextMatches(list -> list.size() == 1 && list.get(0).getPolicyId().equals(mockPolicy.getPolicyId()))
                .verifyComplete();
    }

    @Test
    void shouldPurchasePolicy() {
        PurchaseRequest request = new PurchaseRequest();
        request.setQuoteId("quote-1");

        when(quoteRepository.findById("quote-1")).thenReturn(Mono.just(mockQuote));
        when(policyRepository.findByPortfolioId("port-1")).thenReturn(Flux.empty());
        when(policyRepository.save(any(Policy.class))).thenReturn(Mono.just(mockPolicy));
        when(trancheRepository.save(any(CoverageTranche.class))).thenReturn(Mono.just(mockTranche));

        Mono<PurchaseResponse> resultMono = policyService.purchasePolicy(request, "user-1");

        StepVerifier.create(resultMono)
                .expectNextMatches(res -> res.getPolicyId().equals(mockPolicy.getPolicyId()) &&
                        res.getMessage().contains("purchased successfully"))
                .verifyComplete();
    }



    @Test
    void shouldHandleUnderwritingService() {
        UnderwritingService svc = new UnderwritingService(quoteRepository, webClientBuilder);
        
        // getBetaForSymbol branches
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("1.0"), svc.getBetaForSymbol(null));
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("1.2"), svc.getBetaForSymbol("AAPL"));
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("0.9"), svc.getBetaForSymbol("RELIANCE"));
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("0.7"), svc.getBetaForSymbol("TCS"));
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("0.8"), svc.getBetaForSymbol("HDFCBANK"));
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("1.1"), svc.getBetaForSymbol("MSFT"));
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("2.0"), svc.getBetaForSymbol("TSLA"));
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("1.0"), svc.getBetaForSymbol("UNKNOWN"));

        QuoteRequest req = QuoteRequest.builder().portfolioId("p1").build();
        
        // Mock WebClient
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        
        PortfolioDTO port = PortfolioDTO.builder().portfolioId("p1").totalValue(new BigDecimal("10000")).build();
        when(responseSpec.bodyToMono(PortfolioDTO.class)).thenReturn(Mono.just(port));
        
        PortfolioHoldingDTO h1 = PortfolioHoldingDTO.builder().symbol("AAPL").quantity(new BigDecimal("10")).averagePrice(new BigDecimal("100")).build();
        PortfolioHoldingDTO h2 = PortfolioHoldingDTO.builder().symbol("TSLA").quantity(new BigDecimal("5")).averagePrice(new BigDecimal("200")).build();
        when(responseSpec.bodyToFlux(PortfolioHoldingDTO.class)).thenReturn(Flux.just(h1, h2));
        
        when(quoteRepository.save(any(Quote.class))).thenReturn(Mono.just(mockQuote));
        
        // 1. AAPL and TSLA (Hits <= 600 branch)
        StepVerifier.create(svc.generateQuote(req)).expectNextCount(1).verifyComplete();
        
        // 2. All TCS (Hits <= 400 branch)
        PortfolioHoldingDTO hTCS = PortfolioHoldingDTO.builder().symbol("TCS").quantity(new BigDecimal("10")).averagePrice(new BigDecimal("100")).build();
        when(responseSpec.bodyToFlux(PortfolioHoldingDTO.class)).thenReturn(Flux.just(hTCS));
        StepVerifier.create(svc.generateQuote(req)).expectNextCount(1).verifyComplete();
        
        // 3. All TSLA (Hits <= 800 branch)
        PortfolioHoldingDTO hTSLA = PortfolioHoldingDTO.builder().symbol("TSLA").quantity(new BigDecimal("10")).averagePrice(new BigDecimal("200")).build();
        when(responseSpec.bodyToFlux(PortfolioHoldingDTO.class)).thenReturn(Flux.just(hTSLA));
        StepVerifier.create(svc.generateQuote(req)).expectNextCount(1).verifyComplete();
        
        // 4. Low Risk (Hits <= 200 branch) -> require very low beta. But min beta is 0.7 which yields 252.
        // If holdings empty, avgBeta = 1.0, riskScore = 360.
        // Wait, portfolio with totalWeight = 0
        PortfolioHoldingDTO hZero = PortfolioHoldingDTO.builder().symbol("AAPL").quantity(BigDecimal.ZERO).averagePrice(BigDecimal.ZERO).build();
        when(responseSpec.bodyToFlux(PortfolioHoldingDTO.class)).thenReturn(Flux.just(hZero));
        StepVerifier.create(svc.generateQuote(req)).expectNextCount(1).verifyComplete();

        // Error fallback
        when(responseSpec.bodyToMono(PortfolioDTO.class)).thenReturn(Mono.error(new RuntimeException("Error")));
        StepVerifier.create(svc.generateQuote(req)).expectNextCount(1).verifyComplete();
    }

    @Test
    void shouldHandlePolicyServiceEdgeCases() {
        when(policyRepository.findByUserId(anyString())).thenReturn(Flux.just(mockPolicy));
        when(quoteRepository.findById(anyString())).thenReturn(Mono.just(mockQuote));
        when(trancheRepository.findByPolicyId(anyString())).thenReturn(Flux.just(mockTranche));
        
        StepVerifier.create(policyService.getUserPolicies("u1")).expectNextCount(1).verifyComplete();

        when(policyRepository.findByPolicyStatus(anyString())).thenReturn(Flux.just(mockPolicy));
        StepVerifier.create(policyService.getPendingEndorsements()).expectNextCount(1).verifyComplete();

        when(policyRepository.findById(anyString())).thenReturn(Mono.just(mockPolicy));
        when(policyRepository.save(any())).thenReturn(Mono.just(mockPolicy));
        StepVerifier.create(policyService.advancePremium("p1")).verifyComplete();

        when(policyRepository.findByPortfolioId(anyString())).thenReturn(Flux.just(mockPolicy));
        when(underwritingService.getBetaForSymbol(anyString())).thenReturn(new BigDecimal("1.2"));
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(PortfolioDTO.class)).thenReturn(Mono.just(PortfolioDTO.builder().portfolioId("p1").totalValue(new BigDecimal("10000")).build()));
        when(responseSpec.bodyToFlux(PortfolioHoldingDTO.class)).thenReturn(Flux.just(PortfolioHoldingDTO.builder().symbol("AAPL").quantity(new BigDecimal("10")).averagePrice(new BigDecimal("100")).build()));
        when(trancheRepository.save(any())).thenReturn(Mono.just(mockTranche));
        StepVerifier.create(policyService.reUnderwritePolicy("p1")).verifyComplete();
        
        when(trancheRepository.findByPolicyId(anyString())).thenReturn(Flux.just(mockTranche));
        when(trancheRepository.saveAll(any(Iterable.class))).thenReturn(Flux.just(mockTranche));
        StepVerifier.create(policyService.acceptEndorsement("p1", mockTranche.getTrancheId())).expectNextCount(1).verifyComplete();

        when(trancheRepository.findById(anyString())).thenReturn(Mono.just(mockTranche));
        when(trancheRepository.save(any(CoverageTranche.class))).thenReturn(Mono.just(mockTranche));
        when(policyRepository.save(any(Policy.class))).thenReturn(Mono.just(mockPolicy));
        StepVerifier.create(policyService.rejectEndorsement("p1", mockTranche.getTrancheId())).expectNextCount(1).verifyComplete();
        
        // Cover mapToDTO with null quote and null fields
        Policy nullFieldPolicy = new Policy();
        nullFieldPolicy.setPolicyId("p2");
        nullFieldPolicy.setQuoteId("q2");
        nullFieldPolicy.setTotalInsuredValue(BigDecimal.ZERO);
        nullFieldPolicy.setBaseCoveragePct(null);
        nullFieldPolicy.setBasePremiumPct(null);
        nullFieldPolicy.setBasePremiumAmount(null);
        nullFieldPolicy.setBaseRiskScore(null);
        
        when(policyRepository.findById(anyString())).thenReturn(Mono.just(nullFieldPolicy));
        when(quoteRepository.findById(anyString())).thenReturn(Mono.empty());
        when(trancheRepository.findByPolicyId(anyString())).thenReturn(Flux.empty());
        StepVerifier.create(policyService.getPolicyById("p2")).expectNextCount(1).verifyComplete();
        
        // Cover mapToDTO with inactive tranches
        CoverageTranche inactiveTranche = new CoverageTranche();
        inactiveTranche.setTrancheStatus("INACTIVE");
        inactiveTranche.setEligibilityDate(LocalDate.now().plusYears(1));
        when(trancheRepository.findByPolicyId(anyString())).thenReturn(Flux.just(inactiveTranche));
        StepVerifier.create(policyService.getPolicyById("p2")).expectNextCount(1).verifyComplete();
    }
}
