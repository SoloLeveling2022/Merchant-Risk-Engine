package com.fintech.merchantrisk.dispute.controller;

import com.fintech.merchantrisk.dispute.dto.*;
import com.fintech.merchantrisk.dispute.service.DisputeArbitrationEngine;
import com.fintech.merchantrisk.dispute.service.LedgerTransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class DisputeSettlementController {

    private final LedgerTransactionService ledgerService;
    private final DisputeArbitrationEngine arbitrationEngine;

    @PostMapping("/api/v1/ledger/captures")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<LedgerTransactionDto> capture(@RequestBody CaptureSettlementRequest request) {
        return ledgerService.processCapture(request);
    }

    @PostMapping("/api/v1/disputes/ingest")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<DisputeWaterfallResponse> ingestDispute(@RequestBody DisputeIntakeRequest request) {
        return arbitrationEngine.processDisputeWaterfall(request);
    }

    @PostMapping("/api/v1/disputes/{disputeId}/arbitrate")
    public Mono<DisputeCaseDto> arbitrate(
            @PathVariable UUID disputeId,
            @RequestBody ArbitrationOutcomeRequest request
    ) {
        return arbitrationEngine.arbitrateDispute(disputeId, request.outcome());
    }

    @PostMapping("/api/v1/ledger/payouts")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<PayoutBatchDto> initiatePayout(@RequestBody PayoutInitiationRequest request) {
        return arbitrationEngine.initiatePayout(request);
    }

    @GetMapping("/api/v1/ledger/merchants/{merchantId}/trial-balance")
    public Mono<TrialBalanceReport> getTrialBalance(@PathVariable UUID merchantId) {
        return ledgerService.getTrialBalance(merchantId);
    }
}
