package com.fintech.merchantrisk.dispute.dto;

public record ArbitrationOutcomeRequest(
        String outcome, // WON, LOST, RDR_REFUNDED
        String notes
) {}
