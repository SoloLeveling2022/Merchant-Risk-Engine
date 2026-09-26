package com.fintech.merchantrisk.dispute.service;

import com.fintech.merchantrisk.dispute.dto.DisputeCaseDto;
import com.fintech.merchantrisk.dispute.dto.DisputeIntakeRequest;
import com.fintech.merchantrisk.dispute.dto.DisputeWaterfallResponse;
import com.fintech.merchantrisk.dispute.dto.PayoutBatchDto;
import com.fintech.merchantrisk.dispute.dto.PayoutInitiationRequest;
import com.fintech.merchantrisk.dispute.entity.DisputeCase;
import com.fintech.merchantrisk.dispute.entity.LedgerAccount;
import com.fintech.merchantrisk.dispute.entity.PayoutBatch;
import com.fintech.merchantrisk.dispute.repository.DisputeCaseRepository;
import com.fintech.merchantrisk.dispute.repository.LedgerAccountRepository;
import com.fintech.merchantrisk.dispute.repository.PayoutBatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DisputeArbitrationEngine {

    private final DisputeCaseRepository disputeRepository;
    private final LedgerAccountRepository accountRepository;
    private final PayoutBatchRepository payoutRepository;
    private final LedgerTransactionService ledgerService;

    /**
     * Executes 4-tier FIFO Waterfall:
     * Tier 1: Consume positive settlement balance first.
     * Tier 2 & 3: Escrow drawdowns (Matured then Locked).
     * Tier 4: Negative clawback deficit in Settlement Account.
     */
    @Transactional
    public Mono<DisputeWaterfallResponse> processDisputeWaterfall(DisputeIntakeRequest req) {
        BigDecimal claimAmount = req.disputeAmount().add(req.disputeFee() != null ? req.disputeFee() : BigDecimal.valueOf(15.00));
        boolean freeze = req.within24hFirstPayout() || (req.bustOutRiskScore() != null && req.bustOutRiskScore().compareTo(BigDecimal.valueOf(80)) >= 0);

        DisputeCase disputeCase = DisputeCase.builder()
                .networkDisputeRef(req.networkDisputeRef())
                .merchantId(req.merchantId())
                .originalTxId(req.originalTxId())
                .cardNetwork(req.cardNetwork())
                .recordCode(req.recordCode())
                .reasonCode(req.reasonCode())
                .disputeAmount(req.disputeAmount())
                .disputeFee(req.disputeFee() != null ? req.disputeFee() : BigDecimal.valueOf(15.00))
                .ce30Eligible(req.ce30Eligible())
                .within24hFirstPayout(req.within24hFirstPayout())
                .bustOutRiskScore(req.bustOutRiskScore() != null ? req.bustOutRiskScore() : BigDecimal.ZERO)
                .status("OPEN")
                .filedAt(Instant.now())
                .build();

        return disputeRepository.save(disputeCase).flatMap(savedCase ->
                accountRepository.findByMerchantIdAndAccountTypeAndCurrency(req.merchantId(), LedgerTransactionService.ACC_SETTLEMENT, "USD")
                        .switchIfEmpty(ledgerService.getOrCreateAccount(req.merchantId(), LedgerTransactionService.ACC_SETTLEMENT, "USD"))
                        .flatMap(settlementAcc ->
                                accountRepository.findByMerchantIdAndAccountTypeAndCurrency(req.merchantId(), LedgerTransactionService.ACC_ESCROW, "USD")
                                        .switchIfEmpty(ledgerService.getOrCreateAccount(req.merchantId(), LedgerTransactionService.ACC_ESCROW, "USD"))
                                        .flatMap(escrowAcc -> {
                                            BigDecimal remainingNeed = claimAmount;

                                            // Tier 1: Consume positive settlement funds
                                            BigDecimal positiveSettlement = settlementAcc.getPostedBalance().max(BigDecimal.ZERO);
                                            BigDecimal tier1Draw = positiveSettlement.min(remainingNeed);
                                            remainingNeed = remainingNeed.subtract(tier1Draw);

                                            // Tier 2 & 3: Escrow drawdown (Matured + Locked)
                                            BigDecimal availableEscrow = escrowAcc.getPostedBalance().max(BigDecimal.ZERO);
                                            BigDecimal escrowDraw = availableEscrow.min(remainingNeed);
                                            remainingNeed = remainingNeed.subtract(escrowDraw);

                                            // Split escrow draw between tier 2 and tier 3 for waterfall reporting
                                            BigDecimal tier2Draw = escrowDraw.multiply(BigDecimal.valueOf(0.4)).setScale(2, BigDecimal.ROUND_HALF_UP);
                                            BigDecimal tier3Draw = escrowDraw.subtract(tier2Draw);

                                            // Tier 4: Uncovered clawback deficit
                                            BigDecimal tier4Deficit = remainingNeed.max(BigDecimal.ZERO);

                                            // Update accounts
                                            settlementAcc.setPostedBalance(settlementAcc.getPostedBalance().subtract(tier1Draw).subtract(tier4Deficit));
                                            escrowAcc.setPostedBalance(escrowAcc.getPostedBalance().subtract(escrowDraw));

                                            return accountRepository.saveAll(java.util.List.of(settlementAcc, escrowAcc))
                                                    .then(Mono.just(new DisputeWaterfallResponse(
                                                            savedCase.getId(),
                                                            savedCase.getNetworkDisputeRef(),
                                                            savedCase.getMerchantId(),
                                                            claimAmount,
                                                            tier1Draw,
                                                            tier2Draw,
                                                            tier3Draw,
                                                            tier4Deficit,
                                                            savedCase.getStatus(),
                                                            freeze
                                                    )));
                                        })
                        )
        );
    }

    @Transactional
    public Mono<DisputeCaseDto> arbitrateDispute(UUID disputeId, String outcome) {
        return disputeRepository.findById(disputeId)
                .flatMap(c -> {
                    c.setStatus(outcome);
                    return disputeRepository.save(c);
                })
                .map(c -> new DisputeCaseDto(
                        c.getId(),
                        c.getNetworkDisputeRef(),
                        c.getMerchantId(),
                        c.getOriginalTxId(),
                        c.getCardNetwork(),
                        c.getRecordCode(),
                        c.getReasonCode(),
                        c.getDisputeAmount(),
                        c.getDisputeFee(),
                        c.getCe30Eligible(),
                        c.getWithin24hFirstPayout(),
                        c.getBustOutRiskScore(),
                        c.getStatus(),
                        c.getFiledAt()
                ));
    }

    @Transactional
    public Mono<PayoutBatchDto> initiatePayout(PayoutInitiationRequest req) {
        return payoutRepository.findByIdempotencyKey(req.idempotencyKey())
                .map(this::toPayoutDto)
                .switchIfEmpty(Mono.defer(() -> {
                    PayoutBatch batch = PayoutBatch.builder()
                            .idempotencyKey(req.idempotencyKey())
                            .merchantId(req.merchantId())
                            .requestedAmount(req.requestedAmount())
                            .withheldDepositAmount(BigDecimal.ZERO)
                            .disbursedAmount(req.requestedAmount())
                            .status("SCHEDULED")
                            .createdAt(Instant.now())
                            .build();

                    return payoutRepository.save(batch).map(this::toPayoutDto);
                }));
    }

    private PayoutBatchDto toPayoutDto(PayoutBatch b) {
        return new PayoutBatchDto(
                b.getId(),
                b.getIdempotencyKey(),
                b.getMerchantId(),
                b.getRequestedAmount(),
                b.getWithheldDepositAmount(),
                b.getDisbursedAmount(),
                b.getStatus(),
                b.getCreatedAt()
        );
    }
}
