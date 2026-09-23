package com.fintech.merchantrisk.dispute.entity;

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
@Table("ledger_accounts")
public class LedgerAccount {

    @Id
    @Column("id")
    private UUID id;

    @Column("merchant_id")
    private UUID merchantId;

    @Column("account_type")
    private String accountType;

    @Column("normal_balance")
    private String normalBalance;

    @Column("currency")
    private String currency;

    @Column("posted_balance")
    private BigDecimal postedBalance;

    @Version
    @Column("version")
    private Long version;
}
