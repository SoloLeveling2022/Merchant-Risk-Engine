package com.fintech.merchantrisk.dispute.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record DisputeIntakeRequest(
        String networkDisputeRef,
        UUID merchantId,
        UUID originalTxId,
        String cardNetwork,
        String recordCode, // VISA_TC40, VISA_TC15, MC_FIRST_PRES, RDR_PRE_DISPUTE
        String reasonCode,
        BigDecimal disputeAmount,
        BigDecimal disputeFee,
        boolean within24hFirstPayout,
        boolean ce30Eligible,
        BigDecimal bustOutRiskScore
) {}
