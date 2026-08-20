package com.fintech.merchantrisk.identity.dto;

import java.time.Instant;
import java.util.UUID;

public record MerchantEntityDto(
        UUID merchantId,
        String mid,
        String legalName,
        String mcc,
        String billingDescriptorPrefix,
        String kybStatus,
        Instant onboardedAt
) {}
