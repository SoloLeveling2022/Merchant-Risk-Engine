package com.hasnika.insurance.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyDTO {
    private String policyId;
    private String policyNumber;
    private String policyStatus;
    private String userId;
    private String portfolioId;
    private String quoteId;
    private BigDecimal premiumAmount;
    private BigDecimal annualPremium;
    private BigDecimal coverageLimit;
    private BigDecimal coverageAmount;
    private BigDecimal insuredValue;
    private BigDecimal totalInsuredValue;
    private BigDecimal portfolioValue;
    private BigDecimal riskScore;
    private BigDecimal coveragePercentage;
    private BigDecimal premiumPercentage;
    private BigDecimal currentVestedCoveragePercentage;
    private BigDecimal currentVestedCoverageAmount;
    private BigDecimal unrealizedGainLoss;
    private LocalDate policyStartDate;
    private LocalDate policyEndDate;
    private Integer tenureYears;
    private Integer waitingPeriodYears;
    private LocalDate protectionStartDate;
    private Instant createdAt;
    private List<TrancheDTO> tranches;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrancheDTO {
        private String trancheId;
        private String policyId;
        private Integer trancheNumber;
        private String trancheType;
        private LocalDate effectiveDate;
        private Integer waitingPeriodYears;
        private LocalDate eligibilityDate;
        private BigDecimal riskScore;
        private BigDecimal coveragePercentage;
        private BigDecimal premiumPercentage;
        private BigDecimal insuredValue;
        private String trancheStatus;
        private String coveredSymbols;
    }
}
