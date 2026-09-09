package com.fintech.merchantrisk.underwriting.entity;

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
@Table("underwriting_audit_logs")
public class UnderwritingAuditLog {

    @Id
    @Column("id")
    private UUID id;

    @Column("merchant_id")
    private UUID merchantId;

    @Column("trigger_reason")
    private String triggerReason;

    @Column("previous_state")
    private String previousState;

    @Column("new_state")
    private String newState;

    @Column("previous_hold_rate")
    private BigDecimal previousHoldRate;

    @Column("new_hold_rate")
    private BigDecimal newHoldRate;

    @Column("actor_id")
    private String actorId;

    @Column("created_at")
    private Instant createdAt;
}
