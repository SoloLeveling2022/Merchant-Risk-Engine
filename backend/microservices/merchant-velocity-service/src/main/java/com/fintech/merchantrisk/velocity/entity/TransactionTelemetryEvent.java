package com.fintech.merchantrisk.velocity.entity;

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
@Table("transaction_telemetry_events")
public class TransactionTelemetryEvent {

    @Id
    @Column("id")
    private UUID id;

    @Column("idempotency_key")
    private String idempotencyKey;

    @Column("merchant_id")
    private UUID merchantId;

    @Column("card_network")
    private String cardNetwork;

    @Column("event_type")
    private String eventType;

    @Column("amount")
    private BigDecimal amount;

    @Column("currency")
    private String currency;

    @Column("is_cnp")
    private Boolean isCnp;

    @Column("is_enumerated_pattern")
    private Boolean isEnumeratedPattern;

    @Column("device_fingerprint_hash")
    private String deviceFingerprintHash;

    @Column("client_ip")
    private String clientIp;

    @Column("occurred_at")
    private Instant occurredAt;
}
