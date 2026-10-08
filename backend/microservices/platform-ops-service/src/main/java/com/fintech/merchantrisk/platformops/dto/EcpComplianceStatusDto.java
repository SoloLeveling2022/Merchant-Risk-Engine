package com.fintech.merchantrisk.platformops.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record EcpComplianceStatusDto(
        UUID merchantId,
        String currentTier, // NONE, ECM, HECM
        int violationMonthsCount,
        int consecutiveCleanMonths,
        int cleanMonthsRemainingToExit,
        BigDecimal projectedMonthlyFineUsd,
        String lastEvaluatedMonth
) {}
