package com.fintech.merchantrisk.underwriting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record VelocitySignalPayload(
        UUID merchantId,
        BigDecimal visaVampRatioBps,
        BigDecimal enumerationRatioBps,
        BigDecimal mastercardCtrBps,
        String mastercardEcpTier,
        boolean gmvSpikeDetected,
        boolean aovAnomalyDetected,
        boolean fulfillmentDipDetected,
        boolean refundSurgeDetected,
        BigDecimal dailyGmv,
        BigDecimal unfulfilledVolume,
        BigDecimal totalCoverage
) {}
