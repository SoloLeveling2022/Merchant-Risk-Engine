package com.fintech.merchantrisk.platformops.entity;

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
@Table("risk_ops_overrides")
public class RiskOpsOverride {

    @Id
    @Column("id")
    private UUID id;

    @Column("merchant_id")
    private UUID merchantId;

    @Column("analyst_id")
    private String analystId;

    @Column("action_type")
    private String actionType;

    @Column("justification")
    private String justification;

    @Column("correlation_id")
    private String correlationId;

    @Column("created_at")
    private Instant createdAt;
}
