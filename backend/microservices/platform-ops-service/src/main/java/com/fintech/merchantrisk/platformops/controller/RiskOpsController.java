package com.fintech.merchantrisk.platformops.controller;

import com.fintech.merchantrisk.platformops.dto.*;
import com.fintech.merchantrisk.platformops.service.RiskOpsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class RiskOpsController {

    private final RiskOpsService riskOpsService;

    @GetMapping("/api/v1/ops/portfolio/vamp-health")
    public Mono<AcquirerVampRollupDto> getPortfolioVampHealth(
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String month
    ) {
        return riskOpsService.getPortfolioVampHealth(region, month);
    }

    @GetMapping("/api/v1/ops/merchants/{merchantId}/ecp-status")
    public Mono<EcpComplianceStatusDto> getEcpStatus(@PathVariable UUID merchantId) {
        return riskOpsService.getEcpStatus(merchantId);
    }

    @PostMapping("/api/v1/ops/merchants/{merchantId}/override")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<RiskOpsOverrideDto> recordOverride(
            @PathVariable UUID merchantId,
            @RequestBody RiskOverrideRequest request,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId
    ) {
        return riskOpsService.recordOverride(merchantId, request, correlationId);
    }
}
