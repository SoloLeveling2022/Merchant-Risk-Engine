package com.hasnika.insurance.portfoliomarket.service;

import com.hasnika.insurance.portfoliomarket.entity.PortfolioHolding;
import com.hasnika.insurance.portfoliomarket.repository.PortfolioHoldingRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioRevaluationService {

    private final MarketPriceService marketPriceService;
    private final PortfolioHoldingRepository holdingRepository;
    private final WebClient.Builder webClientBuilder;

    @Data
    public static class PolicyDTO {
        private String policyId;
        private String portfolioId;
        private String policyStatus;
        private BigDecimal insuredThresholdPct;
        private String userId;
    }

    public record ActivePolicyDTO(UUID policyId, UUID portfolioId, BigDecimal insuredThresholdPct) {
        public UUID getPolicyId() { return policyId; }
        public UUID getPortfolioId() { return portfolioId; }
        public BigDecimal getInsuredThresholdPct() { return insuredThresholdPct; }
    }

    public record RevalResult(BigDecimal lossPct) {}

    public Flux<ActivePolicyDTO> getAllActivePolicies() {
        return webClientBuilder.build().get()
                .uri("http://stock-insurance-core/api/v1/policies/all")
                .retrieve()
                .bodyToFlux(PolicyDTO.class)
                .filter(p -> "COVERAGE_ACTIVE".equals(p.getPolicyStatus()) || "PROTECTION_ACTIVE".equals(p.getPolicyStatus()))
                .map(p -> new ActivePolicyDTO(
                        UUID.fromString(p.getPolicyId()),
                        UUID.fromString(p.getPortfolioId()),
                        p.getInsuredThresholdPct() != null ? p.getInsuredThresholdPct() : new BigDecimal("20.00")
                ));
    }

    public Mono<RevalResult> revaluePortfolio(UUID portfolioId, UUID policyId) {
        return holdingRepository.findByPortfolioId(portfolioId.toString())
                .collectList()
                .flatMap(holdings -> {
                    if (holdings.isEmpty()) return Mono.just(new RevalResult(BigDecimal.ZERO));

                    BigDecimal baselineTotal = BigDecimal.ZERO;
                    for (PortfolioHolding h : holdings) {
                        baselineTotal = baselineTotal.add(h.getQuantity().multiply(h.getAveragePrice()));
                    }

                    final BigDecimal finalBaseline = baselineTotal;

                    return Flux.fromIterable(holdings)
                            .flatMap(h -> marketPriceService.getCurrentPrice(h.getSymbol())
                                    .map(currentPrice -> h.getQuantity().multiply(currentPrice)))
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                            .map(currentTotal -> {
                                if (finalBaseline.compareTo(BigDecimal.ZERO) == 0) return new RevalResult(BigDecimal.ZERO);
                                
                                BigDecimal loss = finalBaseline.subtract(currentTotal).max(BigDecimal.ZERO);
                                BigDecimal lossPct = loss.divide(finalBaseline, 4, RoundingMode.HALF_UP)
                                                         .multiply(new BigDecimal("100.00"));
                                return new RevalResult(lossPct);
                            });
                });
    }

    public Mono<UUID> getPolicyUserId(UUID policyId) {
        return webClientBuilder.build().get()
                .uri("http://stock-insurance-core/api/v1/policies/all")
                .retrieve()
                .bodyToFlux(PolicyDTO.class)
                .filter(p -> p.getPolicyId().equals(policyId.toString()))
                .next()
                .map(p -> UUID.fromString(p.getUserId()))
                .defaultIfEmpty(UUID.randomUUID());
    }
}
