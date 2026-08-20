package com.fintech.merchantrisk.identity.dto;

import java.util.UUID;

public record MerchantDescriptorDto(
        UUID merchantId,
        String mid,
        String legalName,
        String mcc,
        String billingDescriptorPrefix,
        String kybStatus
) {}
