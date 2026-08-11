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
@Table("coverage_tranches")
public class CoverageTranche implements Persistable<String> {
    @Id
    private String trancheId;
    private String policyId;
    private String endorsementId;
    private Integer trancheNumber;
    private String trancheType;
    private LocalDate effectiveDate;
    private Integer waitingPeriodYears;
    private LocalDate eligibilityDate;
    private BigDecimal riskScore;
    private BigDecimal coveragePercentage;
    private BigDecimal premiumPercentage;
    private BigDecimal insuredValue;
    private String coveredSymbols;
    private String trancheStatus;
    private Instant createdAt;
    private String createdBy;
    private Instant updatedAt;
    private String updatedBy;

    @org.springframework.data.annotation.Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return trancheId; }

    @Override
    public boolean isNew() { return isNew; }
}
