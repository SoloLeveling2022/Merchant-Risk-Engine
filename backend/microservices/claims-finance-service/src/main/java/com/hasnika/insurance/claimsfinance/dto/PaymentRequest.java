package com.hasnika.insurance.claimsfinance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {
    private String policyId;
    private String quoteId;
    private BigDecimal amount;
    private String transactionType;
}
