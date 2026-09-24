package com.fintech.merchantrisk.dispute.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record TrialBalanceReport(
        UUID merchantId,
        BigDecimal totalDebits,
        BigDecimal totalCredits,
        boolean isBalanced,
        BigDecimal assetBalance,
        BigDecimal liabilityBalance,
        BigDecimal revenueBalance,
        Map<String, BigDecimal> accountBalances,
        Instant generatedAt
) {}
