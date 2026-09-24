package com.fintech.merchantrisk.dispute.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record DisputeCaseDto(
        UUID disputeId,
        String networkDisputeRef,
        UUID merchantId,
        UUID originalTxId,
        String cardNetwork,
        String recordCode,
        String reasonCode,
        BigDecimal disputeAmount,
        BigDecimal disputeFee,
        boolean ce30Eligible,
        boolean within24hFirstPayout,
        BigDecimal bustOutRiskScore,
        String status,
        Instant filedAt
) {}
