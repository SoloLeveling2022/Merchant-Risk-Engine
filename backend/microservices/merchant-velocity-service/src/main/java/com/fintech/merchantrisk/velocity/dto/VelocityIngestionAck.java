package com.fintech.merchantrisk.velocity.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record VelocityIngestionAck(
        UUID eventId,
        String idempotencyKey,
        UUID merchantId,
        String status,
        List<String> anomalyTriggers,
        Instant processedAt
) {}
