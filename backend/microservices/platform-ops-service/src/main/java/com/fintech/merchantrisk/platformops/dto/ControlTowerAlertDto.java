package com.fintech.merchantrisk.platformops.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ControlTowerAlertDto(
        UUID alertId,
        String category,
        String region,
        UUID merchantId,
        String severity,
        String headline,
        String detail,
        BigDecimal metricValue,
        Instant timestamp
) {}
