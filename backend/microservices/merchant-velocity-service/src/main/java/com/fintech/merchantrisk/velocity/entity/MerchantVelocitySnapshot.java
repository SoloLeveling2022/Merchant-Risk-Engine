package com.fintech.merchantrisk.velocity.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("merchant_velocity_snapshots")
public class MerchantVelocitySnapshot {

    @Id
    @Column("id")
    private UUID id;

    @Column("merchant_id")
    private UUID merchantId;

    @Column("window_date")
    private LocalDate windowDate;

    @Column("gmv_24h")
    private BigDecimal gmv24h;

    @Column("trailing_30d_avg_daily_gmv")
    private BigDecimal trailing30dAvgDailyGmv;

    @Column("aov_24h")
    private BigDecimal aov24h;

    @Column("aov_90d_mean")
    private BigDecimal aov90dMean;

    @Column("aov_90d_stddev")
    private BigDecimal aov90dStddev;

    @Column("refund_count_30d")
    private Long refundCount30d;

    @Column("settled_cnp_count_mtd")
    private Long settledCnpCountMtd;

    @Column("visa_tc40_count_mtd")
    private Long visaTc40CountMtd;

    @Column("visa_tc15_count_mtd")
    private Long visaTc15CountMtd;

    @Column("visa_excluded_count_mtd")
    private Long visaExcludedCountMtd;

    @Column("mc_sales_prev_month")
    private Long mcSalesPrevMonth;

    @Column("mc_chargebacks_mtd")
    private Long mcChargebacksMtd;

    @Column("enumerated_auth_count_mtd")
    private Long enumeratedAuthCountMtd;

    @Column("total_auth_count_mtd")
    private Long totalAuthCountMtd;

    @Column("fulfillment_confirmed_ratio")
    private BigDecimal fulfillmentConfirmedRatio;

    @Version
    @Column("version")
    private Long version;

    @Column("updated_at")
    private Instant updatedAt;
}
