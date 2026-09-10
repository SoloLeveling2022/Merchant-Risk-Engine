package com.fintech.merchantrisk.underwriting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TrancheLockRequest(
        UUID merchantId,
        String captureBatchRef,
        BigDecimal eligibleVolume,
        LocalDate captureDate
) {}
