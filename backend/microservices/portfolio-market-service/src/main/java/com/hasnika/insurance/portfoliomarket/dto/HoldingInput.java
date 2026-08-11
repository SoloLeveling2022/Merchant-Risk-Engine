package com.hasnika.insurance.portfoliomarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;

public record HoldingInput(
    @NotBlank(message = "Symbol is required") String symbol, 
    @NotNull(message = "Quantity is required") @Min(value = 1, message = "Quantity must be at least 1") BigDecimal quantity, 
    @NotNull(message = "Average price is required") @Min(value = 0, message = "Average price must be greater than 0") BigDecimal averagePrice
) {}
