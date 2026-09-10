package com.fintech.merchantrisk.underwriting.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RiskTransitionEvent(
        UUID eventId,
        UUID merchantId,
        String previousState,
        String newState,
        BigDecimal newHoldRate,
        String reason,
        Instant timestamp
) {}
