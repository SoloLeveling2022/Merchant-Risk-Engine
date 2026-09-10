package com.fintech.merchantrisk.underwriting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ReserveTrancheDto(
        UUID trancheId,
        UUID merchantId,
        UUID policyId,
        String captureBatchRef,
        LocalDate captureDate,
        LocalDate maturityDate,
        BigDecimal initialAmount,
        BigDecimal remainingAmount,
        String status
) {}
