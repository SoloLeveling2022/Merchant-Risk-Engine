package com.fintech.merchantrisk.underwriting.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record MerchantRiskProfileDto(
        UUID merchantId,
        String mcc,
        String mccRiskTier,
        String accountState,
        Integer consecutiveBreachDays,
        Instant firstPayoutCompletedAt,
        BigDecimal expectedReversalRate180d,
        BigDecimal activeHoldRate,
        Integer activeMaturityDays,
        String reserveType,
        Instant updatedAt
) {}
