package com.hasnika.insurance.portfoliomarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import java.util.List;

public record UpdatePortfolioRequest(
    @NotBlank(message = "Portfolio name is required") String portfolioName, 
    @NotNull(message = "Holdings cannot be null") @Size(min = 1, message = "Portfolio must have at least one holding") @Valid List<HoldingInput> holdings
) {}
