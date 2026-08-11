package com.hasnika.insurance.claimsfinance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record TrancheCalculation(
        String trancheId,
        int trancheNumber,
        LocalDate eligibilityDate,
        boolean eligible,
        List<String> coveredSymbols,
        BigDecimal trancheLoss,
        BigDecimal coveragePercentage,
        BigDecimal tranchePayout,
        String status
) {
}
