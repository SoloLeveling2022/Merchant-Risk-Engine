package com.fintech.merchantrisk.dispute.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record DisputeWaterfallResponse(
        UUID disputeId,
        String networkDisputeRef,
        UUID merchantId,
        BigDecimal totalClaimAmount,
        BigDecimal tier1SettlementDrawn,
        BigDecimal tier2MaturedEscrowDrawn,
        BigDecimal tier3LockedEscrowDrawn,
        BigDecimal tier4NegativeClawbackDeficit,
        String disputeStatus,
        boolean freezeTriggered
) {}
