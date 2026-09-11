package com.fintech.merchantrisk.underwriting.service;

import com.fintech.merchantrisk.underwriting.dto.ReunderwritingDecisionDto;
import com.fintech.merchantrisk.underwriting.dto.VelocitySignalPayload;
import com.fintech.merchantrisk.underwriting.entity.MerchantRiskProfile;
import com.fintech.merchantrisk.underwriting.entity.ReservePolicy;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

@Service
public class UnderwritingScoringEngine {

    public static final BigDecimal ADYEN_THRESHOLD_DELTA = BigDecimal.valueOf(10000.00);

    public int calculateBaselineScore(String mcc, String mccTier, int avgFulfillmentDays) {
        int score = 20; // base
        if ("HIGH".equalsIgnoreCase(mccTier)) {
            score += 40;
        } else if ("MODERATE".equalsIgnoreCase(mccTier)) {
            score += 20;
        }
        if (avgFulfillmentDays > 7) {
            score += 20;
        } else if (avgFulfillmentDays > 3) {
            score += 10;
        }
        return Math.min(100, score);
    }

    public BigDecimal determineHoldRate(int score) {
        if (score < 25) return BigDecimal.valueOf(0.0000);
        if (score < 50) return BigDecimal.valueOf(0.0500); // 5%
        if (score < 75) return BigDecimal.valueOf(0.1000); // 10%
        return BigDecimal.valueOf(0.1500); // 15%
    }

    public int determineMaturityDays(int score) {
        if (score < 25) return 0;
        if (score < 50) return 60;
        if (score < 75) return 90;
        return 120;
    }

    public ReunderwritingDecisionDto evaluateReunderwriting(
            MerchantRiskProfile profile,
            ReservePolicy currentPolicy,
            VelocitySignalPayload signals
    ) {
        String prevState = profile.getAccountState();
        String newState = prevState;
        BigDecimal prevRate = currentPolicy.getHoldRate();
        BigDecimal newRate = prevRate;
        int newMaturity = currentPolicy.getMaturityDays();
        String triggerReason = "ROUTINE_EVALUATION";

        // 1. Check Payout Frozen Conditions
        if ((signals.visaVampRatioBps() != null && signals.visaVampRatioBps().compareTo(BigDecimal.valueOf(150)) >= 0)
                || (signals.enumerationRatioBps() != null && signals.enumerationRatioBps().compareTo(BigDecimal.valueOf(2000)) >= 0)
                || "HECM".equalsIgnoreCase(signals.mastercardEcpTier())
                || profile.getConsecutiveBreachDays() >= 7) {
            newState = "PAYOUT_FROZEN";
            newRate = BigDecimal.valueOf(1.0000); // 100% withholding
            newMaturity = 180;
            triggerReason = "CARD_NETWORK_EXCESSIVE_BREACH";
        }
        // 2. Check Reserve Hike Conditions
        else if (signals.gmvSpikeDetected() || "ECM".equalsIgnoreCase(signals.mastercardEcpTier())
                || (signals.visaVampRatioBps() != null && signals.visaVampRatioBps().compareTo(BigDecimal.valueOf(90)) >= 0)) {
            newState = "RESERVE_HIKE";
            newRate = prevRate.add(BigDecimal.valueOf(0.0500)); // +500 bps
            newMaturity = Math.min(180, currentPolicy.getMaturityDays() + 30);
            triggerReason = signals.gmvSpikeDetected() ? "GMV_VOLUME_SPIKE_2_5X" : "SCHEME_EARLY_WARNING_OR_ECM";
        }
        // 3. Elevated Watch
        else if (signals.fulfillmentDipDetected() || signals.refundSurgeDetected()) {
            newState = "ELEVATED_WATCH";
            triggerReason = signals.fulfillmentDipDetected() ? "FULFILLMENT_CONFIRMATION_DIP" : "REFUND_SURGE_1_PERCENT";
        }

        // 4. Adyen Exposure-Coverage check
        // Total Exposure = Expected Reversal (180d) * GMV + Unfulfilled Volume
        BigDecimal expectedReversal = profile.getExpectedReversalRate180d() != null ?
                profile.getExpectedReversalRate180d() : BigDecimal.valueOf(0.0050);
        BigDecimal reversalExposure = signals.dailyGmv() != null ?
                signals.dailyGmv().multiply(expectedReversal) : BigDecimal.ZERO;
        BigDecimal unfulfilled = signals.unfulfilledVolume() != null ? signals.unfulfilledVolume() : BigDecimal.ZERO;
        BigDecimal totalExposure = reversalExposure.add(unfulfilled);
        BigDecimal totalCoverage = signals.totalCoverage() != null ? signals.totalCoverage() : BigDecimal.ZERO;

        BigDecimal deficit = totalExposure.subtract(totalCoverage);
        boolean adyenActionRequired = deficit.compareTo(ADYEN_THRESHOLD_DELTA) > 0;

        return new ReunderwritingDecisionDto(
                profile.getMerchantId(),
                prevState,
                newState,
                prevRate,
                newRate,
                newMaturity,
                deficit.setScale(4, RoundingMode.HALF_UP),
                adyenActionRequired,
                triggerReason,
                Instant.now()
        );
    }
}
