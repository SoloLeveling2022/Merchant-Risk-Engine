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
@Table("ledger_entries")
public class LedgerEntry {

    @Id
    @Column("id")
    private UUID id;

    @Column("transaction_id")
    private UUID transactionId;

    @Column("account_id")
    private UUID accountId;

    @Column("direction")
    private String direction; // DEBIT or CREDIT

    @Column("amount")
    private BigDecimal amount;

    @Column("created_at")
    private Instant createdAt;
}
