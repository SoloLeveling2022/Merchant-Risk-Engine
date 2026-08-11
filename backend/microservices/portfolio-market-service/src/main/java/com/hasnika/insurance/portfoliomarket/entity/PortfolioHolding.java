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
@Table("portfolio_holdings")
public class PortfolioHolding implements Persistable<String> {
    @Id
    private String holdingId;
    private String portfolioId;
    private String symbol;
    private BigDecimal quantity;
    private BigDecimal averagePrice;
    private String assetClass;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;

    @org.springframework.data.annotation.Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return holdingId; }

    @Override
    public boolean isNew() { return isNew; }
}
