package com.fintech.merchantrisk.velocity.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record VelocityAlertDto(
        UUID alertId,
        UUID merchantId,
        String alertType,
        String severity,
        String message,
        BigDecimal triggerValue,
        BigDecimal thresholdValue,
        Instant timestamp
) {}
