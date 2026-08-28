package com.fintech.merchantrisk.velocity.service;

import com.fintech.merchantrisk.velocity.dto.SchemeRatioReport;
import com.fintech.merchantrisk.velocity.entity.MerchantVelocitySnapshot;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Quantitative risk engine evaluating card network compliance ratios and volume anomalies.
 * Strictly uses BigDecimal with RoundingMode.HALF_UP.
 */
@Service
public class VelocityAnomalyEngine {

    public static final BigDecimal BPS_MULTIPLIER = BigDecimal.valueOf(10000);
    public static final BigDecimal VISA_VAMP_MERCHANT_EXCESSIVE_BPS = BigDecimal.valueOf(150); // 1.50%
    public static final long VISA_VAMP_EVENT_FLOOR = 1500;
    public static final BigDecimal VISA_ENUMERATION_EXCESSIVE_BPS = BigDecimal.valueOf(2000); // 20.00%
    public static final long VISA_ENUMERATION_FLOOR = 300000;

    public SchemeRatioReport evaluateRatios(MerchantVelocitySnapshot s) {
        // 1. Visa VAMP Ratio = (TC40 + TC15 - Excluded) / TC05 * 10000 bps
        long numerator = Math.max(0, s.getVisaTc40CountMtd() + s.getVisaTc15CountMtd() - s.getVisaExcludedCountMtd());
        long denominator = Math.max(1, s.getSettledCnpCountMtd());

        BigDecimal vampRatioBps = BigDecimal.valueOf(numerator)
                .multiply(BPS_MULTIPLIER)
                .divide(BigDecimal.valueOf(denominator), 4, RoundingMode.HALF_UP);

        long totalVisaEvents = s.getVisaTc40CountMtd() + s.getVisaTc15CountMtd();
        String vampTier = "COMPLIANT";
        if (vampRatioBps.compareTo(VISA_VAMP_MERCHANT_EXCESSIVE_BPS) >= 0 && totalVisaEvents >= VISA_VAMP_EVENT_FLOOR) {
            vampTier = "EXCESSIVE";
        } else if (vampRatioBps.compareTo(BigDecimal.valueOf(90)) >= 0) { // 0.9% early warning
            vampTier = "EARLY_WARNING";
        }

        // 2. Visa Enumeration Ratio = Enumerated / Total Auth * 10000 bps
        long totalAuth = Math.max(1, s.getTotalAuthCountMtd());
        BigDecimal enumerationRatioBps = BigDecimal.valueOf(s.getEnumeratedAuthCountMtd())
                .multiply(BPS_MULTIPLIER)
                .divide(BigDecimal.valueOf(totalAuth), 4, RoundingMode.HALF_UP);

        String enumTier = "COMPLIANT";
        if (enumerationRatioBps.compareTo(VISA_ENUMERATION_EXCESSIVE_BPS) >= 0 && s.getEnumeratedAuthCountMtd() >= VISA_ENUMERATION_FLOOR) {
            enumTier = "EXCESSIVE";
        }

        // 3. Mastercard Lagged Denominator CTR = (Current Month CB / Prev Month Sales M-1) * 10000 bps
        long mcSalesPrev = Math.max(1, s.getMcSalesPrevMonth());
        long mcCb = s.getMcChargebacksMtd();
        BigDecimal mcCtrBps = BigDecimal.valueOf(mcCb)
                .multiply(BPS_MULTIPLIER)
                .divide(BigDecimal.valueOf(mcSalesPrev), 4, RoundingMode.HALF_UP);

        String mcTier = "COMPLIANT";
        if (mcCb >= 300 && mcCtrBps.compareTo(BigDecimal.valueOf(300)) >= 0) { // >= 3.00%
            mcTier = "HECM";
        } else if (mcCb >= 100 && mcCtrBps.compareTo(BigDecimal.valueOf(150)) >= 0) { // 1.50% - 2.99%
            mcTier = "ECM";
        }

        // 4. Operational Anomaly Triggers
        boolean gmvSpike = checkGmvSpike(s);
        boolean aovAnomaly = checkAovAnomaly(s);
        boolean fulfillmentDip = checkFulfillmentDip(s);
        boolean refundSurge = checkRefundSurge(s);

        return new SchemeRatioReport(
                s.getMerchantId(),
                vampRatioBps,
                vampTier,
                totalVisaEvents,
                s.getSettledCnpCountMtd(),
                enumerationRatioBps,
                enumTier,
                mcCtrBps,
                mcTier,
                mcCb,
                s.getMcSalesPrevMonth(),
                gmvSpike,
                aovAnomaly,
                fulfillmentDip,
                refundSurge,
                Instant.now()
        );
    }

    public List<String> detectAnomalies(MerchantVelocitySnapshot s) {
        List<String> triggers = new ArrayList<>();
        if (checkGmvSpike(s)) triggers.add("GMV_VOLUME_SPIKE_2_5X");
        if (checkAovAnomaly(s)) triggers.add("AOV_ANOMALY_2_5_SIGMA");
        if (checkFulfillmentDip(s)) triggers.add("FULFILLMENT_CONFIRMATION_DIP");
        if (checkRefundSurge(s)) triggers.add("REFUND_SURGE_1_PERCENT");
        return triggers;
    }

    private boolean checkGmvSpike(MerchantVelocitySnapshot s) {
        if (s.getTrailing30dAvgDailyGmv() == null || s.getTrailing30dAvgDailyGmv().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }
        BigDecimal threshold = s.getTrailing30dAvgDailyGmv().multiply(BigDecimal.valueOf(2.5));
        return s.getGmv24h() != null && s.getGmv24h().compareTo(threshold) >= 0;
    }

    private boolean checkAovAnomaly(MerchantVelocitySnapshot s) {
        if (s.getAov90dStddev() == null || s.getAov90dStddev().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }
        BigDecimal bound = s.getAov90dMean().add(s.getAov90dStddev().multiply(BigDecimal.valueOf(2.5)));
        return s.getAov24h() != null && s.getAov24h().compareTo(bound) > 0;
    }

    private boolean checkFulfillmentDip(MerchantVelocitySnapshot s) {
        return s.getFulfillmentConfirmedRatio() != null &&
                s.getFulfillmentConfirmedRatio().compareTo(BigDecimal.valueOf(0.9800)) < 0;
    }

    private boolean checkRefundSurge(MerchantVelocitySnapshot s) {
        if (s.getSettledCnpCountMtd() == null || s.getSettledCnpCountMtd() <= 0) {
            return false;
        }
        double refundRatio = (double) s.getRefundCount30d() / (double) s.getSettledCnpCountMtd();
        return refundRatio > 0.01;
    }
}
