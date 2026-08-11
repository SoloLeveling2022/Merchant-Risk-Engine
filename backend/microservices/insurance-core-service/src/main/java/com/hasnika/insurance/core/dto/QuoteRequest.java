package com.hasnika.insurance.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuoteRequest {
    @NotBlank(message = "Portfolio ID is required")
    private String portfolioId;
    
    @NotBlank(message = "Coverage type is required")
    @Pattern(regexp = "^(COMPREHENSIVE|BASIC|PREMIUM)$", message = "Invalid coverage type")
    private String coverageType;
}
