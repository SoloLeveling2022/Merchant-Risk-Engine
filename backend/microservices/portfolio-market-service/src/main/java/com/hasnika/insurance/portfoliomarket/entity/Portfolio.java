package com.hasnika.insurance.portfoliomarket.entity;

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
@Table("portfolios")
public class Portfolio implements Persistable<String> {
    @Id
    private String portfolioId;
    private String userId;
    private String portfolioName;
    private String portfolioStatus;
    private String currency;
    private BigDecimal totalValue;
    private Instant lastRevaluedAt;
    private Instant createdAt;
    private String createdBy;
    private Instant updatedAt;
    private String updatedBy;

    @org.springframework.data.annotation.Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return portfolioId; }

    @Override
    public boolean isNew() { return isNew; }
}
