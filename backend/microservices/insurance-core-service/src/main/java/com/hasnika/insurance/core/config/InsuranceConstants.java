package com.hasnika.insurance.core.config;

import java.math.BigDecimal;

public final class InsuranceConstants {

    private InsuranceConstants() {}

    public static final int DEFAULT_WAITING_PERIOD_YEARS = 5;
    public static final int TRADING_DAYS_PER_YEAR = 252;

    public static final BigDecimal RISK_VERY_LOW_MAX    = new BigDecimal("200");
    public static final BigDecimal RISK_LOW_MAX         = new BigDecimal("400");
    public static final BigDecimal RISK_MEDIUM_MAX      = new BigDecimal("600");
    public static final BigDecimal RISK_HIGH_MAX        = new BigDecimal("800");
    public static final BigDecimal RISK_VERY_HIGH_MAX   = new BigDecimal("1000");

    public static final BigDecimal COVERAGE_VERY_LOW_RISK    = new BigDecimal("80.00");
    public static final BigDecimal COVERAGE_LOW_RISK         = new BigDecimal("70.00");
    public static final BigDecimal COVERAGE_MEDIUM_RISK      = new BigDecimal("60.00");
    public static final BigDecimal COVERAGE_HIGH_RISK        = new BigDecimal("50.00");
    public static final BigDecimal COVERAGE_VERY_HIGH_RISK   = new BigDecimal("40.00");

    public static final BigDecimal PREMIUM_VERY_LOW_RISK     = new BigDecimal("1.50");
    public static final BigDecimal PREMIUM_LOW_RISK          = new BigDecimal("2.00");
    public static final BigDecimal PREMIUM_MEDIUM_RISK       = new BigDecimal("3.00");
    public static final BigDecimal PREMIUM_HIGH_RISK         = new BigDecimal("5.00");
    public static final BigDecimal PREMIUM_VERY_HIGH_RISK    = new BigDecimal("8.00");

    public static final BigDecimal WEIGHT_VOLATILITY         = new BigDecimal("0.40");
    public static final BigDecimal WEIGHT_CONCENTRATION      = new BigDecimal("0.20");
    public static final BigDecimal WEIGHT_DRAWDOWN           = new BigDecimal("0.15");
    public static final BigDecimal WEIGHT_LIQUIDITY          = new BigDecimal("0.10");
    public static final BigDecimal WEIGHT_MARKET_STRESS      = new BigDecimal("0.10");
    public static final BigDecimal WEIGHT_PLATFORM_EXPOSURE  = new BigDecimal("0.05");

    public static final int QUOTE_VALIDITY_HOURS             = 24;
}
