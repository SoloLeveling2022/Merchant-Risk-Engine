package com.hasnika.insurance.core.service;

import com.hasnika.insurance.core.config.InsuranceConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

/**
 * Risk Score Calculation Engine.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RiskScoreEngine {

    private static final MathContext MC = new MathContext(10, RoundingMode.HALF_UP);

    public BigDecimal calculate(RiskComponents components) {
        BigDecimal score = BigDecimal.ZERO;

        score = score.add(components.volatilityScore()
                .multiply(InsuranceConstants.WEIGHT_VOLATILITY, MC));
        score = score.add(components.concentrationScore()
                .multiply(InsuranceConstants.WEIGHT_CONCENTRATION, MC));
        score = score.add(components.drawdownScore()
                .multiply(InsuranceConstants.WEIGHT_DRAWDOWN, MC));
        score = score.add(components.liquidityScore()
                .multiply(InsuranceConstants.WEIGHT_LIQUIDITY, MC));
        score = score.add(components.marketStressScore()
                .multiply(InsuranceConstants.WEIGHT_MARKET_STRESS, MC));
        score = score.add(components.platformExposureScore()
                .multiply(InsuranceConstants.WEIGHT_PLATFORM_EXPOSURE, MC));

        BigDecimal result = score.min(new BigDecimal("1000")).max(BigDecimal.ZERO);
        log.debug("Risk score computed: {} components={}", result, components);
        return result.setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal computeVolatilityScore(double[] dailyReturns) {
        if (dailyReturns == null || dailyReturns.length < 2) {
            return new BigDecimal("500");
        }
        double mean = mean(dailyReturns);
        double variance = 0;
        for (double r : dailyReturns) {
            variance += Math.pow(r - mean, 2);
        }
        double stdDev       = Math.sqrt(variance / (dailyReturns.length - 1));
        double annualized   = stdDev * Math.sqrt(InsuranceConstants.TRADING_DAYS_PER_YEAR);
        double normalized   = Math.min(annualized / 0.80, 1.0);
        return BigDecimal.valueOf(normalized * 1000).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal computeConcentrationScore(double[] weights) {
        if (weights == null || weights.length == 0) return new BigDecimal("500");
        double hhi = 0;
        for (double w : weights) hhi += w * w;
        return BigDecimal.valueOf(hhi * 1000).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal computeDrawdownScore(double[] prices) {
        if (prices == null || prices.length < 2) return new BigDecimal("500");
        double peak       = prices[0];
        double maxDrawdown = 0;
        for (double price : prices) {
            if (price > peak) peak = price;
            double drawdown = (peak - price) / peak;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }
        return BigDecimal.valueOf(maxDrawdown * 1000).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal computeLiquidityScore(double[] avgDailyVolumes, double maxVolumeBenchmark) {
        if (avgDailyVolumes == null || avgDailyVolumes.length == 0) return new BigDecimal("500");
        double avgVol       = mean(avgDailyVolumes);
        double normalized   = Math.min(avgVol / maxVolumeBenchmark, 1.0);
        double liquidityRisk = 1.0 - normalized;
        return BigDecimal.valueOf(liquidityRisk * 1000).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal computeMarketStressScore(double normalizedStressIndex) {
        double clamped = Math.max(0, Math.min(1.0, normalizedStressIndex));
        return BigDecimal.valueOf(clamped * 1000).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal computePlatformExposureScore(BigDecimal portfolioInsuredValue, BigDecimal totalPlatformInsuredValue) {
        if (totalPlatformInsuredValue == null || totalPlatformInsuredValue.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal ratio = portfolioInsuredValue.divide(totalPlatformInsuredValue, MC);
        BigDecimal score = ratio.multiply(new BigDecimal("1000")).min(new BigDecimal("1000"));
        return score.setScale(2, RoundingMode.HALF_UP);
    }

    private double mean(double[] values) {
        double sum = 0;
        for (double v : values) sum += v;
        return sum / values.length;
    }

    public record RiskComponents(
            BigDecimal volatilityScore,
            BigDecimal concentrationScore,
            BigDecimal drawdownScore,
            BigDecimal liquidityScore,
            BigDecimal marketStressScore,
            BigDecimal platformExposureScore
    ) {}
}
