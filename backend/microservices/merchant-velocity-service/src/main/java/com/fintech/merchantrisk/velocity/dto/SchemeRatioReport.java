package com.fintech.merchantrisk.velocity.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SchemeRatioReport(
        UUID merchantId,
        BigDecimal visaVampRatioBps,
        String visaVampTier,
        long visaTotalCountMtd,
        long visaDisputeCountMtd,
        BigDecimal visaEnumerationRatioBps,
        String visaEnumerationTier,
        BigDecimal mastercardLaggedCtrBps,
        String mastercardEcpTier,
        long mastercardChargebacksMtd,
        long mastercardSalesPrevMonth,
        boolean gmvSpikeDetected,
        boolean aovAnomalyDetected,
        boolean fulfillmentDipDetected,
        boolean refundSurgeDetected,
        Instant evaluatedAt
) {}
