package com.hasnika.insurance.core.service;

import com.hasnika.insurance.core.config.InsuranceConstants;
import com.hasnika.insurance.core.dto.PolicyStatus;
import com.hasnika.insurance.core.dto.TrancheStatus;
import com.hasnika.insurance.core.dto.TrancheType;
import com.hasnika.insurance.core.exception.PolicyStateException;
import com.hasnika.insurance.core.entity.Policy;
import com.hasnika.insurance.core.entity.CoverageTranche;
import com.hasnika.insurance.core.repository.PolicyRepository;
import com.hasnika.insurance.core.repository.CoverageTrancheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Policy State Machine + Waiting Period Engine.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PolicyStateMachine {

    private final PolicyRepository         policyRepository;
    private final CoverageTrancheRepository trancheRepository;

    private boolean isValidTransition(PolicyStatus from, PolicyStatus to) {
        if (from == null || to == null) return false;
        return switch (from.name()) {
            case "COVERAGE_ACTIVE"          -> to == PolicyStatus.WAITING_PERIOD_ACTIVE;
            case "WAITING_PERIOD_ACTIVE"    -> to == PolicyStatus.PROTECTION_ACTIVE;
            case "PROTECTION_ACTIVE"        -> to == PolicyStatus.PORTFOLIO_MONITORING
                                            || to == PolicyStatus.CLAIM_ELIGIBLE
                                            || to == PolicyStatus.EXPIRED;
            case "PORTFOLIO_MONITORING"     -> to == PolicyStatus.REUNDERWRITING_REQUIRED
                                            || to == PolicyStatus.CLAIM_ELIGIBLE
                                            || to == PolicyStatus.PROTECTION_ACTIVE;
            case "REUNDERWRITING_REQUIRED"  -> to == PolicyStatus.ENDORSEMENT_PENDING;
            case "ENDORSEMENT_PENDING"      -> to == PolicyStatus.PORTFOLIO_MONITORING
                                            || to == PolicyStatus.CLAIM_ELIGIBLE;
            case "CLAIM_ELIGIBLE"           -> to == PolicyStatus.CLAIM_SUBMITTED
                                            || to == PolicyStatus.PORTFOLIO_MONITORING;
            case "CLAIM_SUBMITTED"          -> to == PolicyStatus.CLAIM_PROCESSING;
            case "CLAIM_PROCESSING"         -> to == PolicyStatus.PROTECTION_ACTIVE
                                            || to == PolicyStatus.EXPIRED;
            case "EXPIRED"                  -> to == PolicyStatus.AUDIT_CLOSED;
            default -> false;
        };
    }

    public Mono<Policy> transition(String policyId, PolicyStatus newStatus, String reason) {
        return policyRepository.findById(policyId)
                .switchIfEmpty(Mono.error(new PolicyStateException("Policy not found: " + policyId)))
                .flatMap(policy -> {
                    PolicyStatus currentStatus = PolicyStatus.valueOf(policy.getPolicyStatus());
                    if (!isValidTransition(currentStatus, newStatus)) {
                        return Mono.error(new PolicyStateException(policyId.toString(),
                                newStatus.name(), currentStatus.name()));
                    }
                    policy.setPolicyStatus(newStatus.name());
                    policy.setUpdatedAt(Instant.now());
                    policy.setUpdatedBy("POLICY_STATE_MACHINE");
                    log.info("Policy {} transitioned: {} → {} reason={}",
                            policyId, currentStatus, newStatus, reason);
                    policy.setNew(false);
                    return policyRepository.save(policy);
                });
    }

    public Mono<Policy> activateWaitingPeriod(String policyId) {
        return transition(policyId, PolicyStatus.WAITING_PERIOD_ACTIVE, "Policy purchased");
    }

    public Mono<Policy> activateProtection(String policyId) {
        return transition(policyId, PolicyStatus.PROTECTION_ACTIVE, "Waiting period completed");
    }

    public Mono<List<CoverageTranche>> getEligibleTranches(String policyId, LocalDate asOfDate) {
        return trancheRepository.findByPolicyId(policyId)
                .filter(tranche -> !tranche.getEligibilityDate().isAfter(asOfDate))
                .collectList()
                .doOnNext(tranches -> log.debug("Policy {} has {} eligible tranches as of {}",
                        policyId, tranches.size(), asOfDate));
    }

    public Mono<List<CoverageTranche>> getAllTranches(String policyId) {
        return trancheRepository.findByPolicyId(policyId).collectList();
    }

    public Mono<CoverageTranche> createEndorsementTranche(String policyId, String endorsementId,
            int trancheNumber, LocalDate effectiveDate,
            java.math.BigDecimal riskScore, java.math.BigDecimal coveragePct,
            java.math.BigDecimal premiumPct, java.math.BigDecimal insuredValue,
            List<String> coveredSymbols) {

        LocalDate eligibilityDate = effectiveDate.plusYears(InsuranceConstants.DEFAULT_WAITING_PERIOD_YEARS);

        CoverageTranche tranche = CoverageTranche.builder()
                .policyId(policyId)
                .endorsementId(endorsementId)
                .trancheNumber(trancheNumber)
                .trancheType(TrancheType.ENDORSEMENT.name())
                .effectiveDate(effectiveDate)
                .waitingPeriodYears(InsuranceConstants.DEFAULT_WAITING_PERIOD_YEARS)
                .eligibilityDate(eligibilityDate)
                .riskScore(riskScore)
                .coveragePercentage(coveragePct)
                .premiumPercentage(premiumPct)
                .insuredValue(insuredValue)
                .coveredSymbols(coveredSymbols != null ? String.join(",", coveredSymbols) : null)
                .trancheStatus(TrancheStatus.WAITING_PERIOD.name())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .createdBy("ENDORSEMENT_ENGINE")
                .build();

        log.info("Creating endorsement tranche: policyId={} tranche={} effectiveDate={} eligibleDate={}",
                policyId, trancheNumber, effectiveDate, eligibilityDate);
        return trancheRepository.save(tranche);
    }
}
