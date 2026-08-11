package com.hasnika.insurance.claimsfinance.service;

import com.hasnika.insurance.claimsfinance.dto.PolicyStatus;
import com.hasnika.insurance.claimsfinance.exception.ClaimNotEligibleException;
import com.hasnika.insurance.claimsfinance.dto.ClaimCalculationResult;
import com.hasnika.insurance.claimsfinance.dto.TrancheCalculation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Claims calculation engine.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ClaimCalculationEngine {

    public ClaimCalculationResult calculate(
            List<TrancheSummary> tranches,
            LocalDate asOfDate,
            java.util.Map<String, BigDecimal> currentValueBySymbol,
            java.util.Map<String, BigDecimal> baselineValueBySymbol) {

        List<TrancheCalculation> eligibleCalcs   = new ArrayList<>();
        List<TrancheCalculation> ineligibleCalcs  = new ArrayList<>();
        BigDecimal totalPayout = BigDecimal.ZERO;

        for (TrancheSummary tranche : tranches) {
            boolean eligible = !tranche.eligibilityDate().isAfter(asOfDate);

            BigDecimal trancheLoss = BigDecimal.ZERO;
            for (String symbol : tranche.coveredSymbols()) {
                BigDecimal baselineValue = baselineValueBySymbol.getOrDefault(symbol, BigDecimal.ZERO);
                BigDecimal currentValue  = currentValueBySymbol.getOrDefault(symbol, BigDecimal.ZERO);
                BigDecimal loss          = baselineValue.subtract(currentValue).max(BigDecimal.ZERO);
                trancheLoss = trancheLoss.add(loss);
            }

            BigDecimal tranchePayout = eligible
                    ? trancheLoss.multiply(tranche.coveragePercentage())
                                 .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            TrancheCalculation calc = new TrancheCalculation(
                    tranche.trancheId().toString(),
                    tranche.trancheNumber(),
                    tranche.eligibilityDate(),
                    eligible,
                    tranche.coveredSymbols(),
                    trancheLoss,
                    tranche.coveragePercentage(),
                    tranchePayout,
                    eligible ? "INCLUDED" : "EXCLUDED_WAITING_PERIOD"
            );

            if (eligible) {
                eligibleCalcs.add(calc);
                totalPayout = totalPayout.add(tranchePayout);
            } else {
                ineligibleCalcs.add(calc);
                log.debug("Tranche {} excluded: eligibilityDate={} asOfDate={}",
                        tranche.trancheId(), tranche.eligibilityDate(), asOfDate);
            }
        }

        log.info("Claim calculation complete: payout={} eligibleTranches={} ineligibleTranches={}",
                totalPayout, eligibleCalcs.size(), ineligibleCalcs.size());

        return new ClaimCalculationResult(totalPayout, eligibleCalcs, ineligibleCalcs);
    }

    public void validateClaimEligibility(String policyStatus, boolean waitingPeriodComplete,
                                          boolean thresholdBreached) {
        if (!PolicyStatus.CLAIM_ELIGIBLE.name().equals(policyStatus) &&
            !PolicyStatus.COVERAGE_ACTIVE.name().equals(policyStatus) &&
            !PolicyStatus.PROTECTION_ACTIVE.name().equals(policyStatus)) {
            throw new ClaimNotEligibleException(
                    "Policy is not in CLAIM_ELIGIBLE, COVERAGE_ACTIVE, or PROTECTION_ACTIVE state. Current: " + policyStatus);
        }
        if (!waitingPeriodComplete) {
            throw new ClaimNotEligibleException("Policy waiting period (5 years) has not been completed.");
        }
        if (!thresholdBreached) {
            throw new ClaimNotEligibleException(
                    "Portfolio loss has not exceeded the insured threshold (confirmed over 5 consecutive intervals).");
        }
    }

    public record TrancheSummary(
            java.util.UUID trancheId,
            int trancheNumber,
            LocalDate eligibilityDate,
            BigDecimal coveragePercentage,
            List<String> coveredSymbols
    ) {}
}
