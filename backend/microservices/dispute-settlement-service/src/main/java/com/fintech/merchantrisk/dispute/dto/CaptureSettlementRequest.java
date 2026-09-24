package com.fintech.merchantrisk.dispute.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CaptureSettlementRequest(
        String idempotencyKey,
        UUID merchantId,
        BigDecimal grossAmount,
        BigDecimal processingFeeRate, // e.g., 0.0290
        BigDecimal processingFeeFixed, // e.g., 0.30
        BigDecimal reserveHoldRate,   // e.g., 0.1000
        String currency
) {}
