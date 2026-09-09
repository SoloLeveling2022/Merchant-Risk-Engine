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
@Table("merchant_risk_profiles")
public class MerchantRiskProfile {

    @Id
    @Column("merchant_id")
    private UUID merchantId;

    @Column("mcc")
    private String mcc;

    @Column("mcc_risk_tier")
    private String mccRiskTier;

    @Column("account_state")
    private String accountState;

    @Column("consecutive_breach_days")
    private Integer consecutiveBreachDays;

    @Column("first_payout_completed_at")
    private Instant firstPayoutCompletedAt;

    @Column("expected_reversal_rate_180d")
    private BigDecimal expectedReversalRate180d;

    @Column("avg_fulfillment_days")
    private Integer avgFulfillmentDays;

    @Column("accepted_risk_allowance")
    private BigDecimal acceptedRiskAllowance;

    @Column("bank_guarantee_amount")
    private BigDecimal bankGuaranteeAmount;

    @Version
    @Column("version")
    private Long version;

    @Column("updated_at")
    private Instant updatedAt;
}
