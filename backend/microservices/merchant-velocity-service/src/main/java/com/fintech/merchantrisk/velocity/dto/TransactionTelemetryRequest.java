package com.fintech.merchantrisk.velocity.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionTelemetryRequest(
        String idempotencyKey,
        UUID merchantId,
        String cardNetwork,
        String eventType,
        BigDecimal amount,
        String currency,
        Boolean isCnp,
        Boolean isEnumeratedPattern,
        String deviceFingerprintHash,
        String clientIp,
        Instant occurredAt
) {}
