package com.hasnika.insurance.core.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("quotes")
public class Quote implements Persistable<String> {
    @Id
    private String quoteId;
    private String portfolioId;
    private String assessmentId;
    private BigDecimal riskScore;
    private BigDecimal coveragePercentage;
    private BigDecimal premiumPercentage;
    private BigDecimal portfolioValue;
    private BigDecimal premiumAmount;
    private BigDecimal insuredValue;
    private BigDecimal coverageAmount;
    private BigDecimal insuredThresholdPct;
    private String quoteStatus;
    private Instant validUntil;
    private Instant acceptedAt;

    @org.springframework.data.annotation.Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return quoteId; }

    @Override
    public boolean isNew() { return isNew; }
}
