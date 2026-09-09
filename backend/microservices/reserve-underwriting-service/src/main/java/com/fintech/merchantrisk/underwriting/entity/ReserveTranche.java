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
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("reserve_tranches")
public class ReserveTranche {

    @Id
    @Column("id")
    private UUID id;

    @Column("merchant_id")
    private UUID merchantId;

    @Column("policy_id")
    private UUID policyId;

    @Column("capture_batch_ref")
    private String captureBatchRef;

    @Column("capture_date")
    private LocalDate captureDate;

    @Column("maturity_date")
    private LocalDate maturityDate;

    @Column("initial_amount")
    private BigDecimal initialAmount;

    @Column("remaining_amount")
    private BigDecimal remainingAmount;

    @Column("status")
    private String status;

    @Version
    @Column("version")
    private Long version;

    @Column("created_at")
    private Instant createdAt;
}
