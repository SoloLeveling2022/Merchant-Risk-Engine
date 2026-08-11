package com.hasnika.insurance.portfoliomarket.config;

import java.math.BigDecimal;

public final class InsuranceConstants {

    private InsuranceConstants() {}

    public static final int BREACH_CONFIRMATION_COUNT = 5;
    public static final String DEFAULT_CURRENCY = "INR";
    public static final BigDecimal DEFAULT_LOSS_THRESHOLD_PCT = new BigDecimal("20.00");

    public static final int TRADING_DAYS_PER_YEAR = 252;
    public static final BigDecimal GBM_DEFAULT_DRIFT_BULL = new BigDecimal("0.20");
    public static final BigDecimal GBM_DEFAULT_SIGMA_BULL = new BigDecimal("0.15");
    public static final BigDecimal GBM_DEFAULT_DRIFT_BEAR = new BigDecimal("-0.25");
    public static final BigDecimal GBM_DEFAULT_SIGMA_BEAR = new BigDecimal("0.30");
}
