package com.fintech.merchantrisk.identity.dto;

public record MerchantLoginRequest(
        String email,
        String password
) {}
