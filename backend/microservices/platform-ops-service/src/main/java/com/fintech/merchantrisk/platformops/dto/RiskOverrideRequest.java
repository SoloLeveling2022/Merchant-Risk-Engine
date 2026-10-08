package com.fintech.merchantrisk.platformops.dto;

public record RiskOverrideRequest(
        String analystId,
        String actionType, // MANUAL_FREEZE, RELEASE_FREEZE, POLICY_STEP_DOWN, MATCH_ESCALATION
        String justification
) {}
