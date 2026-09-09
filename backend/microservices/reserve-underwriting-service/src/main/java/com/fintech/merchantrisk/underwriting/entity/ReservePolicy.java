package com.fintech.merchantrisk.underwriting.entity;

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
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("reserve_policies")
public class ReservePolicy {

    @Id
    @Column("id")
    private UUID id;

    @Column("merchant_id")
    private UUID merchantId;

    @Column("reserve_type")
    private String reserveType;

    @Column("calculation_base")
    private String calculationBase;

    @Column("hold_rate")
    private BigDecimal holdRate;

    @Column("maturity_days")
    private Integer maturityDays;

    @Column("cap_amount")
    private BigDecimal capAmount;

    @Column("active")
    private Boolean active;

    @Column("effective_from")
    private Instant effectiveFrom;

    @Version
    @Column("version")
    private Long version;
}
