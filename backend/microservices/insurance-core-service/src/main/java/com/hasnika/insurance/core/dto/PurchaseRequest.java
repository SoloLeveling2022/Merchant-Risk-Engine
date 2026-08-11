package com.hasnika.insurance.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseRequest {
    @NotBlank(message = "Quote ID is required")
    private String quoteId;
    
    @NotNull(message = "Tenure years is required")
    @Min(value = 1, message = "Tenure must be at least 1 year")
    @Max(value = 30, message = "Tenure cannot exceed 30 years")
    private Integer tenureYears;
}
