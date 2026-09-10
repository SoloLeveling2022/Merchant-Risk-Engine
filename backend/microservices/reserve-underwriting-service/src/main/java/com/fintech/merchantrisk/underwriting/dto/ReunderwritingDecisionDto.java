package com.fintech.merchantrisk.underwriting.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ReunderwritingDecisionDto(
        UUID merchantId,
        String previousState,
        String newState,
        BigDecimal previousHoldRate,
        BigDecimal newHoldRate,
        Integer newMaturityDays,
        BigDecimal adyenExposureDeficit,
        boolean adyenDepositActionRequired,
        String triggerReason,
        Instant decidedAt
) {}
