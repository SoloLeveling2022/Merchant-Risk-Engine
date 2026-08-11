package com.hasnika.insurance.claimsfinance.service;

import com.hasnika.insurance.claimsfinance.config.InsuranceConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Fraud Detection Engine for claim validation.
 */
@Slf4j
@Component
public class FraudDetectionEngine {

    public FraudResult evaluate(FraudInput input) {
        List<FraudFlag> flags   = new ArrayList<>();
        double fraudScore        = 0.0;

        if (input.claimEligibleSince() != null) {
            long daysSinceEligible = ChronoUnit.DAYS.between(
                    input.claimEligibleSince(), Instant.now());
            if (daysSinceEligible < InsuranceConstants.FRAUD_EARLY_CLAIM_DAYS) {
                flags.add(new FraudFlag("EARLY_CLAIM",
                        "Claim submitted only " + daysSinceEligible + " days after eligibility", 30.0));
                fraudScore += 30.0;
                log.warn("Fraud flag EARLY_CLAIM: policyId={} daysSinceEligible={}",
                        input.policyId(), daysSinceEligible);
            }
        }

        if (input.lossPct().compareTo(new BigDecimal("80")) > 0) {
            flags.add(new FraudFlag("EXTREME_LOSS_PATTERN",
                    "Portfolio loss exceeds 80%: " + input.lossPct() + "%", 40.0));
            fraudScore += 40.0;
            log.warn("Fraud flag EXTREME_LOSS_PATTERN: policyId={} lossPct={}", input.policyId(), input.lossPct());
        }

        if (input.recentClaimCount() > 0) {
            flags.add(new FraudFlag("RAPID_RECLAIM",
                    input.recentClaimCount() + " prior claim(s) in last 90 days", 25.0 * input.recentClaimCount()));
            fraudScore += 25.0 * input.recentClaimCount();
            log.warn("Fraud flag RAPID_RECLAIM: policyId={} recentClaims={}", input.policyId(), input.recentClaimCount());
        }

        boolean flagged = fraudScore >= InsuranceConstants.FRAUD_SCORE_THRESHOLD.doubleValue();
        log.info("Fraud evaluation: policyId={} score={} flagged={}", input.policyId(), fraudScore, flagged);

        return new FraudResult(flagged, fraudScore, flags);
    }

    public record FraudInput(
            String     policyId,
            BigDecimal lossPct,
            Instant    claimEligibleSince,
            int        recentClaimCount
    ) {}

    public record FraudFlag(String code, String description, double score) {}

    public record FraudResult(boolean flagged, double fraudScore, List<FraudFlag> flags) {}
}
