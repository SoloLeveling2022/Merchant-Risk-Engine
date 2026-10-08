package com.fintech.merchantrisk.platformops.dto;

import java.time.Instant;
import java.util.UUID;

public record AcquirerVampRollupDto(
        UUID rollupId,
        String acquirerRegion,
        String reportingMonth,
        long portfolioTc40Count,
        long portfolioTc15Count,
        long portfolioExcludedCount,
        long portfolioTc05Count,
        int acquirerVampRatioBps,
        String tierStatus,
        Instant computedAt
) {}
