package com.hasnika.insurance.claimsfinance.config;

import java.math.BigDecimal;

public final class InsuranceConstants {

    private InsuranceConstants() {}

    public static final int FRAUD_EARLY_CLAIM_DAYS           = 30;
    public static final BigDecimal FRAUD_SCORE_THRESHOLD     = new BigDecimal("70.00");
}
