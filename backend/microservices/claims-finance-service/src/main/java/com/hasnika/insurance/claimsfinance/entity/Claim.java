package com.hasnika.insurance.claimsfinance.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.Instant;
import org.springframework.data.domain.Persistable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("claims")
public class Claim implements Persistable<String> {
    @Id
    private String claimId;
    private String claimNumber;
    private String policyId;
    private String userId;
    private String claimStatus;
    private Instant submittedAt;
    
    private BigDecimal baselineValue;
    private BigDecimal currentValue;
    private BigDecimal grossLoss;
    private BigDecimal grossLossPct;
    private BigDecimal eligibleLoss;
    private BigDecimal payoutAmount;
    private BigDecimal policyLimit;
    private Instant approvedAt;
    private String rejectionReason;

    @org.springframework.data.annotation.Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return claimId; }

    @Override
    public boolean isNew() { return isNew; }
}
