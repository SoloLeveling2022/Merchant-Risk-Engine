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
@Table("portfolio_versions")
public class PortfolioVersion implements Persistable<String> {
    @Id
    private String versionId;
    private String portfolioId;
    private BigDecimal totalValue;
    private Instant versionTimestamp;

    @org.springframework.data.annotation.Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return versionId; }

    @Override
    public boolean isNew() { return isNew; }
}
