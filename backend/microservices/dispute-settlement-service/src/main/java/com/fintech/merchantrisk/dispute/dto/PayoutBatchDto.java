package com.fintech.merchantrisk.dispute.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PayoutBatchDto(
        UUID batchId,
        String idempotencyKey,
        UUID merchantId,
        BigDecimal requestedAmount,
        BigDecimal withheldDepositAmount,
        BigDecimal disbursedAmount,
        String status,
        Instant createdAt
) {}
