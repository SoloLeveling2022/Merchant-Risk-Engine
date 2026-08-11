package com.hasnika.insurance.claimsfinance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClaimRequest {
    @NotBlank(message = "Policy ID is required")
    private String policyId;
    
    @NotNull(message = "Claim amount is required")
    @Min(value = 1, message = "Claim amount must be greater than zero")
    private BigDecimal claimAmount;
    
    @NotBlank(message = "Claim reason is required")
    @Size(min = 10, max = 500, message = "Claim reason must be between 10 and 500 characters")
    private String claimReason;
}
