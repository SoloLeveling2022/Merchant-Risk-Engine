package com.fintech.merchantrisk.platformops.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("ecp_compliance_trackers")
public class EcpComplianceTracker {

    @Id
    @Column("merchant_id")
    private UUID merchantId;

    @Column("current_tier")
    private String currentTier;

    @Column("violation_months_count")
    private Integer violationMonthsCount;

    @Column("consecutive_clean_months")
    private Integer consecutiveCleanMonths;

    @Column("projected_monthly_fine_usd")
    private BigDecimal projectedMonthlyFineUsd;

    @Column("last_evaluated_month")
    private String lastEvaluatedMonth;

    @Version
    @Column("version")
    private Long version;
}
