package com.hasnika.insurance.core.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.springframework.data.domain.Persistable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("policies")
public class Policy implements Persistable<String> {
    @Id
    private String policyId;
    private String policyNumber;
    private String userId;
    private String portfolioId;
    private String quoteId;
    private String policyStatus;
    private BigDecimal baseRiskScore;
    private BigDecimal baseCoveragePct;
    private BigDecimal basePremiumPct;
    private BigDecimal basePremiumAmount;
    private BigDecimal totalInsuredValue;
    private BigDecimal insuredThresholdPct;
    private String currency;
    private Instant createdAt;
    private String createdBy;
    private Instant updatedAt;
    private String updatedBy;
    private LocalDate policyStartDate;
    private LocalDate policyEndDate;
    private Integer tenureYears;
    private Integer waitingPeriodYears;
    private LocalDate protectionStartDate;
    private LocalDate nextPremiumDueDate;
    private String premiumStatus;

    @org.springframework.data.annotation.Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return policyId; }

    @Override
    public boolean isNew() { return isNew; }
}
