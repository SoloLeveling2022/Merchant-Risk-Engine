package com.hasnika.insurance.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuoteResponse {
    private String quoteId;
    private BigDecimal premiumAmount;
    private BigDecimal coverageLimit;
    private BigDecimal deductible;
    private BigDecimal riskScore;
    private BigDecimal coveragePercentage;
    private BigDecimal premiumPercentage;
    private BigDecimal portfolioValue;
}
