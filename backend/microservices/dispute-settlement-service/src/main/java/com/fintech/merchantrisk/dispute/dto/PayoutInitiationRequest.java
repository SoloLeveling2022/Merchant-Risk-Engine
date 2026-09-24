package com.fintech.merchantrisk.dispute.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PayoutInitiationRequest(
        String idempotencyKey,
        UUID merchantId,
        BigDecimal requestedAmount
) {}
