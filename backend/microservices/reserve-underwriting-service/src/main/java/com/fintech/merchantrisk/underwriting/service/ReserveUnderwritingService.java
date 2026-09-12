package com.fintech.merchantrisk.underwriting.service;

import com.fintech.merchantrisk.underwriting.dto.*;
import com.fintech.merchantrisk.underwriting.entity.*;
import com.fintech.merchantrisk.underwriting.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReserveUnderwritingService {

    private final MerchantRiskProfileRepository profileRepository;
    private final ReservePolicyRepository policyRepository;
    private final ReserveTrancheRepository trancheRepository;
    private final UnderwritingAuditLogRepository auditLogRepository;
    private final UnderwritingScoringEngine scoringEngine;

    @Transactional
    public Mono<MerchantRiskProfileDto> onboardProfile(OnboardRiskProfileRequest req) {
        int score = scoringEngine.calculateBaselineScore(req.mcc(), "LOW", 2);
        BigDecimal holdRate = req.customHoldRate() != null ? req.customHoldRate() : scoringEngine.determineHoldRate(score);
        int maturityDays = req.customMaturityDays() != null ? req.customMaturityDays() : scoringEngine.determineMaturityDays(score);

        MerchantRiskProfile profile = MerchantRiskProfile.builder()
                .merchantId(req.merchantId())
                .mcc(req.mcc())
                .mccRiskTier("LOW")
                .accountState("NORMAL")
                .consecutiveBreachDays(0)
                .expectedReversalRate180d(BigDecimal.valueOf(0.005000))
                .avgFulfillmentDays(2)
                .acceptedRiskAllowance(BigDecimal.ZERO)
                .bankGuaranteeAmount(BigDecimal.ZERO)
                .version(null)
                .updatedAt(Instant.now())
                .build();

        return profileRepository.save(profile)
                .flatMap(savedProfile -> {
                    ReservePolicy policy = ReservePolicy.builder()
                            .merchantId(savedProfile.getMerchantId())
                            .reserveType("ROLLING")
                            .calculationBase(req.calculationBase() != null ? req.calculationBase() : "GROSS")
                            .holdRate(holdRate)
                            .maturityDays(maturityDays)
                            .active(true)
                            .effectiveFrom(Instant.now())
                            .version(null)
                            .build();

                    return policyRepository.save(policy)
                            .thenReturn(new MerchantRiskProfileDto(
                                    savedProfile.getMerchantId(),
                                    savedProfile.getMcc(),
                                    savedProfile.getMccRiskTier(),
                                    savedProfile.getAccountState(),
                                    savedProfile.getConsecutiveBreachDays(),
                                    savedProfile.getFirstPayoutCompletedAt(),
                                    savedProfile.getExpectedReversalRate180d(),
                                    policy.getHoldRate(),
                                    policy.getMaturityDays(),
                                    policy.getReserveType(),
                                    savedProfile.getUpdatedAt()
                            ));
                });
    }

    @Transactional
    public Mono<ReserveTrancheDto> lockTranche(TrancheLockRequest req) {
        return policyRepository.findFirstByMerchantIdAndActiveTrueOrderByEffectiveFromDesc(req.merchantId())
                .switchIfEmpty(Mono.error(new IllegalStateException("Active reserve policy not found for merchant")))
                .flatMap(policy -> {
                    BigDecimal initialAmount = req.eligibleVolume()
                            .multiply(policy.getHoldRate())
                            .setScale(2, RoundingMode.HALF_UP);

                    LocalDate captureDate = req.captureDate() != null ? req.captureDate() : LocalDate.now();
                    LocalDate maturityDate = captureDate.plusDays(policy.getMaturityDays());

                    ReserveTranche tranche = ReserveTranche.builder()
                            .merchantId(req.merchantId())
                            .policyId(policy.getId())
                            .captureBatchRef(req.captureBatchRef())
                            .captureDate(captureDate)
                            .maturityDate(maturityDate)
                            .initialAmount(initialAmount)
                            .remainingAmount(initialAmount)
                            .status("LOCKED")
                            .version(null)
                            .createdAt(Instant.now())
                            .build();

                    return trancheRepository.save(tranche)
                            .map(saved -> new ReserveTrancheDto(
                                    saved.getId(),
                                    saved.getMerchantId(),
                                    saved.getPolicyId(),
                                    saved.getCaptureBatchRef(),
                                    saved.getCaptureDate(),
                                    saved.getMaturityDate(),
                                    saved.getInitialAmount(),
                                    saved.getRemainingAmount(),
                                    saved.getStatus()
                            ));
                });
    }

    /**
     * Executes Tier 2 (MATURED_UNRELEASED) then Tier 3 (LOCKED) FIFO drawdowns
     * with optimistic locking retry loop.
     */
    public Mono<FifoDrawdownResult> drawdownFifo(FifoDrawdownRequest req) {
        return Mono.defer(() -> executeFifoDrawdownInternal(req))
                .retryWhen(Retry.backoff(4, Duration.ofMillis(20)).jitter(0.5)
                        .filter(ex -> ex instanceof OptimisticLockingFailureException));
    }

    @Transactional
    protected Mono<FifoDrawdownResult> executeFifoDrawdownInternal(FifoDrawdownRequest req) {
        return trancheRepository.findEligibleTranchesForFifoDrawdown(req.merchantId())
                .collectList()
                .flatMap(tranches -> {
                    BigDecimal remainingNeed = req.requiredAmount();
                    BigDecimal totalDrawn = BigDecimal.ZERO;
                    List<FifoDrawdownResult.TrancheDrawDetail> details = new ArrayList<>();
                    List<ReserveTranche> toSave = new ArrayList<>();

                    for (ReserveTranche tranche : tranches) {
                        if (remainingNeed.compareTo(BigDecimal.ZERO) <= 0) break;

                        BigDecimal available = tranche.getRemainingAmount();
                        BigDecimal draw = available.min(remainingNeed);
                        BigDecimal newRemaining = available.subtract(draw);
                        String initialStatus = tranche.getStatus();
                        String finalStatus = newRemaining.compareTo(BigDecimal.ZERO) == 0 ? "DEPLETED" : initialStatus;

                        tranche.setRemainingAmount(newRemaining);
                        tranche.setStatus(finalStatus);
                        toSave.add(tranche);

                        totalDrawn = totalDrawn.add(draw);
                        remainingNeed = remainingNeed.subtract(draw);

                        details.add(new FifoDrawdownResult.TrancheDrawDetail(
                                tranche.getId(),
                                initialStatus,
                                finalStatus,
                                draw,
                                newRemaining
                        ));
                    }

                    BigDecimal uncoveredDeficit = remainingNeed.max(BigDecimal.ZERO);

                    return trancheRepository.saveAll(toSave)
                            .then(Mono.just(new FifoDrawdownResult(
                                    req.merchantId(),
                                    req.requiredAmount(),
                                    totalDrawn,
                                    uncoveredDeficit,
                                    details
                            )));
                });
    }

    @Transactional
    public Flux<ReserveTrancheDto> releaseMaturedTranches(LocalDate asOfDate) {
        return trancheRepository.findMaturedTranches(asOfDate)
                .flatMap(tranche -> {
                    tranche.setStatus("MATURED_RELEASED");
                    return trancheRepository.save(tranche)
                            .map(saved -> new ReserveTrancheDto(
                                    saved.getId(),
                                    saved.getMerchantId(),
                                    saved.getPolicyId(),
                                    saved.getCaptureBatchRef(),
                                    saved.getCaptureDate(),
                                    saved.getMaturityDate(),
                                    saved.getInitialAmount(),
                                    saved.getRemainingAmount(),
                                    saved.getStatus()
                            ));
                });
    }

    @Transactional
    public Mono<ReunderwritingDecisionDto> evaluateMerchant(UUID merchantId, VelocitySignalPayload signals) {
        return profileRepository.findById(merchantId)
                .flatMap(profile -> policyRepository.findFirstByMerchantIdAndActiveTrueOrderByEffectiveFromDesc(merchantId)
                        .flatMap(policy -> {
                            ReunderwritingDecisionDto decision = scoringEngine.evaluateReunderwriting(profile, policy, signals);

                            if (!decision.previousState().equals(decision.newState())) {
                                profile.setAccountState(decision.newState());
                                profile.setUpdatedAt(Instant.now());

                                UnderwritingAuditLog audit = UnderwritingAuditLog.builder()
                                        .merchantId(merchantId)
                                        .triggerReason(decision.triggerReason())
                                        .previousState(decision.previousState())
                                        .newState(decision.newState())
                                        .previousHoldRate(decision.previousHoldRate())
                                        .newHoldRate(decision.newHoldRate())
                                        .actor_id("AUTOMATED_UNDERWRITING_ENGINE")
                                        .createdAt(Instant.now())
                                        .build();

                                return profileRepository.save(profile)
                                        .then(auditLogRepository.save(audit))
                                        .thenReturn(decision);
                            }
                            return Mono.just(decision);
                        }));
    }
}
