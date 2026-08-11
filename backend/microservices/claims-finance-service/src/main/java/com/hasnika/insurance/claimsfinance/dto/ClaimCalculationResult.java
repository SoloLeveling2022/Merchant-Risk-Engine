package com.hasnika.insurance.claimsfinance.dto;

import java.math.BigDecimal;
import java.util.List;

public record ClaimCalculationResult(
        BigDecimal totalPayout,
        List<TrancheCalculation> eligibleTranches,
        List<TrancheCalculation> ineligibleTranches
) {
}
