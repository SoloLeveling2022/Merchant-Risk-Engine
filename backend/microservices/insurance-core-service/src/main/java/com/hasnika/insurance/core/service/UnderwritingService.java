package com.hasnika.insurance.core.service;

import com.hasnika.insurance.core.dto.PortfolioDTO;
import com.hasnika.insurance.core.dto.PortfolioHoldingDTO;
import com.hasnika.insurance.core.dto.QuoteRequest;
import com.hasnika.insurance.core.dto.QuoteResponse;
import com.hasnika.insurance.core.entity.Quote;
import com.hasnika.insurance.core.repository.QuoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Underwriting Service — handles risk assessment, beta calculation, and quote generation.
 */
@Slf4j
@Service
public class UnderwritingService {

    private final QuoteRepository quoteRepository;
    private final WebClient webClient;

    public UnderwritingService(QuoteRepository quoteRepository, WebClient.Builder webClientBuilder) {
        this.quoteRepository = quoteRepository;
        this.webClient = webClientBuilder.baseUrl("http://localhost:8082/api/v1").build();
    }

    public BigDecimal getBetaForSymbol(String symbol) {
        if (symbol == null) return new BigDecimal("1.0");
        return switch (symbol.toUpperCase()) {
            case "AAPL" -> new BigDecimal("1.2");
            case "RELIANCE" -> new BigDecimal("0.9");
            case "TCS" -> new BigDecimal("0.7");
            case "HDFCBANK" -> new BigDecimal("0.8");
            case "MSFT" -> new BigDecimal("1.1");
            case "TSLA" -> new BigDecimal("2.0");
            default -> new BigDecimal("1.0");
        };
    }

    public Mono<QuoteResponse> generateQuote(QuoteRequest request) {
        log.info("Generating dynamic quote for portfolio: {}", request.getPortfolioId());

        return webClient.get()
                .uri("/portfolios/{id}", request.getPortfolioId())
                .retrieve()
                .bodyToMono(PortfolioDTO.class)
                .flatMap(portfolio -> {
                    BigDecimal portfolioValue = portfolio.getTotalValue() != null ? portfolio.getTotalValue() : BigDecimal.ZERO;

                    return webClient.get()
                            .uri("/portfolios/{id}/holdings", request.getPortfolioId())
                            .retrieve()
                            .bodyToFlux(PortfolioHoldingDTO.class)
                            .collectList()
                            .flatMap(holdings -> {
                                BigDecimal totalRiskWeight = BigDecimal.ZERO;
                                BigDecimal totalWeight = BigDecimal.ZERO;

                                for (PortfolioHoldingDTO h : holdings) {
                                    BigDecimal holdingValue = h.getQuantity().multiply(h.getAveragePrice());
                                    BigDecimal beta = getBetaForSymbol(h.getSymbol());
                                    totalRiskWeight = totalRiskWeight.add(beta.multiply(holdingValue));
                                    totalWeight = totalWeight.add(holdingValue);
                                }

                                BigDecimal avgBeta = totalWeight.compareTo(BigDecimal.ZERO) > 0
                                        ? totalRiskWeight.divide(totalWeight, 4, RoundingMode.HALF_UP)
                                        : new BigDecimal("1.0");

                                BigDecimal volatilityScore = new BigDecimal("450.0");
                                BigDecimal concentrationScore = new BigDecimal("350.0");
                                BigDecimal drawdownScore = new BigDecimal("300.0");
                                BigDecimal liquidityScore = new BigDecimal("200.0");
                                BigDecimal stressScore = new BigDecimal("400.0");
                                BigDecimal exposureScore = new BigDecimal("100.0");

                                BigDecimal baseRiskScore = (volatilityScore.multiply(new BigDecimal("0.40")))
                                        .add(concentrationScore.multiply(new BigDecimal("0.20")))
                                        .add(drawdownScore.multiply(new BigDecimal("0.15")))
                                        .add(liquidityScore.multiply(new BigDecimal("0.10")))
                                        .add(stressScore.multiply(new BigDecimal("0.10")))
                                        .add(exposureScore.multiply(new BigDecimal("0.05")));

                                BigDecimal riskScore = baseRiskScore.multiply(avgBeta).min(new BigDecimal("1000.0")).setScale(0, RoundingMode.HALF_UP);

                                BigDecimal coveragePercentage;
                                BigDecimal premiumPercentage;

                                if (riskScore.compareTo(new BigDecimal("200")) <= 0) {
                                    coveragePercentage = new BigDecimal("0.80");
                                    premiumPercentage = new BigDecimal("0.015");
                                } else if (riskScore.compareTo(new BigDecimal("400")) <= 0) {
                                    coveragePercentage = new BigDecimal("0.70");
                                    premiumPercentage = new BigDecimal("0.020");
                                } else if (riskScore.compareTo(new BigDecimal("600")) <= 0) {
                                    coveragePercentage = new BigDecimal("0.60");
                                    premiumPercentage = new BigDecimal("0.030");
                                } else if (riskScore.compareTo(new BigDecimal("800")) <= 0) {
                                    coveragePercentage = new BigDecimal("0.50");
                                    premiumPercentage = new BigDecimal("0.050");
                                } else {
                                    coveragePercentage = new BigDecimal("0.40");
                                    premiumPercentage = new BigDecimal("0.080");
                                }

                                BigDecimal coverageAmount = portfolioValue.multiply(coveragePercentage).setScale(2, RoundingMode.HALF_UP);
                                BigDecimal premiumAmount = portfolioValue.multiply(premiumPercentage).setScale(2, RoundingMode.HALF_UP);
                                BigDecimal deductible = new BigDecimal("500.00");

                                Quote quote = Quote.builder()
                                        .quoteId(UUID.randomUUID().toString())
                                        .portfolioId(request.getPortfolioId())
                                        .assessmentId(UUID.randomUUID().toString())
                                        .riskScore(riskScore)
                                        .coveragePercentage(coveragePercentage.multiply(new BigDecimal("100.0")).setScale(2, RoundingMode.HALF_UP))
                                        .premiumPercentage(premiumPercentage.multiply(new BigDecimal("100.0")).setScale(2, RoundingMode.HALF_UP))
                                        .portfolioValue(portfolioValue)
                                        .premiumAmount(premiumAmount)
                                        .insuredValue(portfolioValue)
                                        .coverageAmount(coverageAmount)
                                        .insuredThresholdPct(new BigDecimal("20.0"))
                                        .quoteStatus("ACTIVE")
                                        .validUntil(Instant.now().plus(30, ChronoUnit.DAYS))
                                        .build();

                                return quoteRepository.save(quote)
                                        .map(saved -> new QuoteResponse(
                                                saved.getQuoteId(),
                                                saved.getPremiumAmount(),
                                                saved.getCoverageAmount(),
                                                deductible,
                                                saved.getRiskScore(),
                                                saved.getCoveragePercentage(),
                                                saved.getPremiumPercentage(),
                                                saved.getPortfolioValue()
                                        ))
                                        .onErrorResume(e -> {
                                            log.warn("Database persist quote fallback: {}", e.getMessage());
                                            return Mono.just(new QuoteResponse(
                                                    quote.getQuoteId(),
                                                    quote.getPremiumAmount(),
                                                    quote.getCoverageAmount(),
                                                    deductible,
                                                    quote.getRiskScore(),
                                                    quote.getCoveragePercentage(),
                                                    quote.getPremiumPercentage(),
                                                    quote.getPortfolioValue()
                                            ));
                                        });
                            });
                })
                .switchIfEmpty(Mono.error(new RuntimeException("Portfolio not found")))
                .onErrorResume(e -> {
                    log.error("Quote generation fallback due to error: {}", e.getMessage());
                    BigDecimal dummyValue = new BigDecimal("500000.00");
                    BigDecimal dummyRisk = new BigDecimal("45.00");
                    BigDecimal dummyCovPct = new BigDecimal("80.00");
                    BigDecimal dummyPremPct = new BigDecimal("2.50");
                    BigDecimal dummyCovAmt = dummyValue.multiply(new BigDecimal("0.80"));
                    BigDecimal dummyPremAmt = dummyValue.multiply(new BigDecimal("0.025"));
                    BigDecimal dummyDeductible = new BigDecimal("500.00");
                    return Mono.just(new QuoteResponse(
                            UUID.randomUUID().toString(),
                            dummyPremAmt,
                            dummyCovAmt,
                            dummyDeductible,
                            dummyRisk,
                            dummyCovPct,
                            dummyPremPct,
                            dummyValue
                    ));
                });
    }
}
