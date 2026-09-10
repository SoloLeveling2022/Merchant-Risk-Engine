package com.fintech.merchantrisk.underwriting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record FifoDrawdownRequest(
        UUID merchantId,
        BigDecimal requiredAmount,
        String disputeRef
) {}
