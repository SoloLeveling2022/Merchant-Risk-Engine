package com.fintech.merchantrisk.underwriting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record OnboardRiskProfileRequest(
        UUID merchantId,
        String mcc,
        String calculationBase, // GROSS or NET_AFTER_FEES
        Integer customMaturityDays,
        BigDecimal customHoldRate
) {}
