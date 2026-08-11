package com.hasnika.insurance.portfoliomarket.service;

import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ThresholdEvaluationService {

    private final Map<UUID, Integer> breachCounts = new ConcurrentHashMap<>();

    public Mono<Integer> recordBreachCheck(UUID policyId, boolean breached, BigDecimal lossPct) {
        if (!breached) {
            breachCounts.remove(policyId);
            return Mono.just(0);
        }
        int newCount = breachCounts.merge(policyId, 1, Integer::sum);
        return Mono.just(newCount);
    }

    public Mono<Void> resetBreachCount(UUID policyId) {
        breachCounts.remove(policyId);
        return Mono.empty();
    }
}
