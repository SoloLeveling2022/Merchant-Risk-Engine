package com.fintech.merchantrisk.underwriting.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record FifoDrawdownResult(
        UUID merchantId,
        BigDecimal requestedAmount,
        BigDecimal totalDrawnAmount,
        BigDecimal uncoveredDeficit,
        List<TrancheDrawDetail> drawnTranches
) {
    public record TrancheDrawDetail(
            UUID trancheId,
            String initialStatus,
            String finalStatus,
            BigDecimal drawnAmount,
            BigDecimal remainingAmount
    ) {}
}
