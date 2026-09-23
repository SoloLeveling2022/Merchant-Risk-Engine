package com.fintech.merchantrisk.dispute.entity;

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
@Table("ledger_transactions")
public class LedgerTransaction {

    @Id
    @Column("id")
    private UUID id;

    @Column("idempotency_key")
    private String idempotencyKey;

    @Column("merchant_id")
    private UUID merchantId;

    @Column("tx_category")
    private String txCategory;

    @Column("reference_id")
    private String referenceId;

    @Column("created_at")
    private Instant createdAt;
}
