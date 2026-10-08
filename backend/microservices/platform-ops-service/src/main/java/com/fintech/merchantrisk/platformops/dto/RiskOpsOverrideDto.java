package com.fintech.merchantrisk.platformops.dto;

import java.time.Instant;
import java.util.UUID;

public record RiskOpsOverrideDto(
        UUID overrideId,
        UUID merchantId,
        String analystId,
        String actionType,
        String justification,
        String correlationId,
        Instant createdAt
) {}
