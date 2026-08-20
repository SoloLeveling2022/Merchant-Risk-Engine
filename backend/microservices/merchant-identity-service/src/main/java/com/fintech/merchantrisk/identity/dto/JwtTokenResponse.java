package com.fintech.merchantrisk.identity.dto;

import java.time.Instant;
import java.util.UUID;

public record JwtTokenResponse(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        UUID merchantId,
        String role,
        Instant issuedAt
) {}
