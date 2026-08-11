package com.hasnika.insurance.core.service;

import com.hasnika.insurance.core.config.InsuranceConstants;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Coverage and Premium calculation engines based on the Risk Score Matrix.
 */
@Component
public class CoveragePremiumEngine {

    public BigDecimal getCoveragePercentage(BigDecimal riskScore) {
        int score = riskScore.intValue();
        if (score <= 200)       return InsuranceConstants.COVERAGE_VERY_LOW_RISK;
        else if (score <= 400)  return InsuranceConstants.COVERAGE_LOW_RISK;
        else if (score <= 600)  return InsuranceConstants.COVERAGE_MEDIUM_RISK;
        else if (score <= 800)  return InsuranceConstants.COVERAGE_HIGH_RISK;
        else                    return InsuranceConstants.COVERAGE_VERY_HIGH_RISK;
    }

    public BigDecimal getPremiumPercentage(BigDecimal riskScore) {
        int score = riskScore.intValue();
        if (score <= 200)       return InsuranceConstants.PREMIUM_VERY_LOW_RISK;
        else if (score <= 400)  return InsuranceConstants.PREMIUM_LOW_RISK;
        else if (score <= 600)  return InsuranceConstants.PREMIUM_MEDIUM_RISK;
        else if (score <= 800)  return InsuranceConstants.PREMIUM_HIGH_RISK;
        else                    return InsuranceConstants.PREMIUM_VERY_HIGH_RISK;
    }

    public BigDecimal calculatePremiumAmount(BigDecimal portfolioValue, BigDecimal premiumPercentage) {
        return portfolioValue
                .multiply(premiumPercentage)
                .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
    }

    public BigDecimal calculateInsuredValue(BigDecimal portfolioValue, BigDecimal coveragePercentage) {
        return portfolioValue
                .multiply(coveragePercentage)
                .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
    }

    public BigDecimal calculatePayout(BigDecimal portfolioLoss, BigDecimal coveragePercentage) {
        return portfolioLoss
                .multiply(coveragePercentage)
                .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
    }
}
