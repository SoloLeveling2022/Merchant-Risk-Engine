package com.hasnika.insurance.claimsfinance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyDTO {
    private LocalDate protectionStartDate;
    private java.math.BigDecimal coveragePercentage;
    private LocalDate nextPremiumDueDate;
    private java.math.BigDecimal annualPremium;
    private java.math.BigDecimal portfolioValue;
    private java.math.BigDecimal totalInsuredValue;
    private java.math.BigDecimal coverageAmount;
}
