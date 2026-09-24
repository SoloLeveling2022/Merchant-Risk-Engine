package com.fintech.merchantrisk.dispute.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record LedgerTransactionDto(
        UUID transactionId,
        String idempotencyKey,
        UUID merchantId,
        String txCategory,
        String referenceId,
        List<LedgerEntryDto> entries,
        Instant createdAt
) {
    public record LedgerEntryDto(
            UUID entryId,
            String accountType,
            String direction,
            BigDecimal amount
    ) {}
}
