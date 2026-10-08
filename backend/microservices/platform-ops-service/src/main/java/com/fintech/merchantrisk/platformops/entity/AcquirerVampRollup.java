package com.fintech.merchantrisk.platformops.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("acquirer_vamp_rollups")
public class AcquirerVampRollup {

    @Id
    @Column("id")
    private UUID id;

    @Column("acquirer_region")
    private String acquirerRegion;

    @Column("reporting_month")
    private String reportingMonth;

    @Column("portfolio_tc40_count")
    private Long portfolioTc40Count;

    @Column("portfolio_tc15_count")
    private Long portfolioTc15Count;

    @Column("portfolio_excluded_count")
    private Long portfolioExcludedCount;

    @Column("portfolio_tc05_count")
    private Long portfolioTc05Count;

    @Column("acquirer_vamp_ratio_bps")
    private Integer acquirerVampRatioBps;

    @Column("tier_status")
    private String tierStatus;

    @Column("computed_at")
    private Instant computedAt;
}
