package com.hasnika.insurance.portfoliomarket.service;

import com.hasnika.insurance.portfoliomarket.config.InsuranceConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.Random;

/**
 * Geometric Brownian Motion (GBM) based synthetic price generator.
 */
@Slf4j
@Component
public class SyntheticPriceGenerator {

    private static final MathContext MC       = new MathContext(10, RoundingMode.HALF_UP);
    private static final double      DT       = 1.0 / InsuranceConstants.TRADING_DAYS_PER_YEAR;
    private static final double      SQRT_DT  = Math.sqrt(DT);

    private final Random random = new Random();

    public BigDecimal nextPrice(BigDecimal currentPrice, double driftMu, double volatilitySigma) {
        double z           = random.nextGaussian();
        double drift       = (driftMu - 0.5 * volatilitySigma * volatilitySigma) * DT;
        double diffusion   = volatilitySigma * SQRT_DT * z;
        double exponent    = drift + diffusion;
        double multiplier  = Math.exp(exponent);
        BigDecimal next    = currentPrice.multiply(BigDecimal.valueOf(multiplier), MC)
                                         .max(BigDecimal.valueOf(0.01));
        return next.setScale(2, RoundingMode.HALF_UP);
    }

    public ScenarioParams getScenarioParams(String scenarioType) {
        return switch (scenarioType) {
            case "BULL_MARKET"      -> new ScenarioParams(
                    InsuranceConstants.GBM_DEFAULT_DRIFT_BULL.doubleValue(),
                    InsuranceConstants.GBM_DEFAULT_SIGMA_BULL.doubleValue());
            case "BEAR_MARKET"      -> new ScenarioParams(
                    InsuranceConstants.GBM_DEFAULT_DRIFT_BEAR.doubleValue(),
                    InsuranceConstants.GBM_DEFAULT_SIGMA_BEAR.doubleValue());
            case "CRASH_2008"       -> new ScenarioParams(-0.45, 0.55);
            case "COVID_2020"       -> new ScenarioParams(-0.35, 0.80);
            default                 -> new ScenarioParams(0.08, 0.20);
        };
    }

    public BigDecimal[] generatePriceSeries(BigDecimal startPrice, double driftMu,
                                             double volatilitySigma, int steps) {
        BigDecimal[] prices = new BigDecimal[steps + 1];
        prices[0] = startPrice;
        for (int i = 1; i <= steps; i++) {
            prices[i] = nextPrice(prices[i - 1], driftMu, volatilitySigma);
        }
        return prices;
    }

    public record ScenarioParams(double driftMu, double volatilitySigma) {}
}
