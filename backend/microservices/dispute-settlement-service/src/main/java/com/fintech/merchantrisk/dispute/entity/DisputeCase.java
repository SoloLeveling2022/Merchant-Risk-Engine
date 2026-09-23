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
@Table("dispute_cases")
public class DisputeCase {

    @Id
    @Column("id")
    private UUID id;

    @Column("network_dispute_ref")
    private String networkDisputeRef;

    @Column("merchant_id")
    private UUID merchantId;

    @Column("original_tx_id")
    private UUID originalTxId;

    @Column("card_network")
    private String cardNetwork;

    @Column("record_code")
    private String recordCode;

    @Column("reason_code")
    private String reasonCode;

    @Column("dispute_amount")
    private BigDecimal disputeAmount;

    @Column("dispute_fee")
    private BigDecimal disputeFee;

    @Column("ce30_eligible")
    private Boolean ce30Eligible;

    @Column("within_24h_first_payout")
    private Boolean within24hFirstPayout;

    @Column("bust_out_risk_score")
    private BigDecimal bustOutRiskScore;

    @Column("status")
    private String status;

    @Column("filed_at")
    private Instant filedAt;
}
