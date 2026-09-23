package com.fintech.merchantrisk.dispute.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("payout_batches")
public class PayoutBatch {

    @Id
    @Column("id")
    private UUID id;

    @Column("idempotency_key")
    private String idempotencyKey;

    @Column("merchant_id")
    private UUID merchantId;

    @Column("requested_amount")
    private BigDecimal requestedAmount;

    @Column("withheld_deposit_amount")
    private BigDecimal withheldDepositAmount;

    @Column("disbursed_amount")
    private BigDecimal disbursedAmount;

    @Column("status")
    private String status;

    @Column("created_at")
    private Instant createdAt;
}
