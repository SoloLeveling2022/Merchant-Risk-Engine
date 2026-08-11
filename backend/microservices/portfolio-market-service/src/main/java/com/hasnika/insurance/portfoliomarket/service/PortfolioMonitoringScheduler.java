package com.hasnika.insurance.portfoliomarket.service;

import com.hasnika.insurance.portfoliomarket.config.InsuranceConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Portfolio Monitoring Scheduler.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PortfolioMonitoringScheduler {

    private final MarketPriceService          marketPriceService;
    private final PortfolioRevaluationService  revaluationService;
    private final ThresholdEvaluationService   thresholdEvaluationService;
    private final WebClient.Builder            webClientBuilder;

    @Scheduled(fixedDelayString = "${app.monitoring.interval-ms:300000}")
    public void runMonitoringCycle() {
        log.info("=== Portfolio monitoring cycle started ===");

        revaluationService.getAllActivePolicies()
                .flatMap(policy -> processPolicy(policy.getPolicyId(), policy.getPortfolioId(),
                        policy.getInsuredThresholdPct()), 5)
                .doOnError(e -> log.error("Error in monitoring cycle: {}", e.getMessage()))
                .subscribe();
    }

    private Mono<Void> processPolicy(UUID policyId, UUID portfolioId, BigDecimal thresholdPct) {
        return revaluationService.revaluePortfolio(portfolioId, policyId)
                .flatMap(revalResult -> {
                    BigDecimal lossPct = revalResult.lossPct();
                    log.debug("Policy {} revalued: loss={}%", policyId, lossPct);

                    boolean breached = lossPct.compareTo(thresholdPct) >= 0;

                    return thresholdEvaluationService.recordBreachCheck(policyId, breached, lossPct)
                            .flatMap(breachCount -> {
                                if (!breached) {
                                    log.debug("Policy {} threshold not breached (loss={}% < threshold={}%). Resetting count.",
                                            policyId, lossPct, thresholdPct);
                                    return Mono.empty();
                                }

                                log.info("Policy {} threshold BREACHED. lossPct={} count={}/{}",
                                        policyId, lossPct, breachCount,
                                        InsuranceConstants.BREACH_CONFIRMATION_COUNT);

                                Map<String, Object> breachEvent = Map.of(
                                        "eventType", "THRESHOLD_BREACHED",
                                        "policyId", policyId.toString(),
                                        "portfolioId", portfolioId.toString(),
                                        "lossPct", lossPct,
                                        "thresholdPct", thresholdPct,
                                        "breachCount", breachCount,
                                        "eventId", UUID.randomUUID().toString()
                                );
                                webClientBuilder.build().post().uri("http://stock-insurance-platform-ops/api/v1/audit/log")
                                        .bodyValue(breachEvent).retrieve().bodyToMono(Void.class).onErrorResume(e -> Mono.empty()).subscribe();

                                if (breachCount >= InsuranceConstants.BREACH_CONFIRMATION_COUNT) {
                                    log.info("Policy {} threshold CONFIRMED after {} consecutive checks.",
                                            policyId, breachCount);
                                    return revaluationService.getPolicyUserId(policyId)
                                            .flatMap(userId -> {
                                                Map<String, Object> confirmEvent = Map.of(
                                                        "eventType", "THRESHOLD_CONFIRMED",
                                                        "policyId", policyId.toString(),
                                                        "portfolioId", portfolioId.toString(),
                                                        "userId", userId,
                                                        "lossPct", lossPct,
                                                        "eventId", UUID.randomUUID().toString()
                                                );
                                                
                                                webClientBuilder.build().post().uri("http://stock-insurance-claims-finance/api/v1/claims/process-crash")
                                                        .bodyValue(confirmEvent).retrieve().bodyToMono(Void.class).onErrorResume(e -> Mono.empty()).subscribe();
                                                
                                                return thresholdEvaluationService.resetBreachCount(policyId);
                                            });
                                }
                                return Mono.empty();
                            });
                })
                .then();
    }
}
