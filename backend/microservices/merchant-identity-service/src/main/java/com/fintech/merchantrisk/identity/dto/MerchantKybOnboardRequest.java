package com.fintech.merchantrisk.identity.dto;

public record MerchantKybOnboardRequest(
        String mid,
        String legalName,
        String mcc,
        String billingDescriptorPrefix,
        String uboIdentityHash,
        String adminEmail,
        String adminPassword
) {}
