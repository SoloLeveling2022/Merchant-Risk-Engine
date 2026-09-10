package com.fintech.merchantrisk.underwriting.dto;

import java.time.LocalDate;

public record ReleaseRunRequest(
        LocalDate asOfDate
) {}
