package com.hasnika.insurance.core.service;

import com.hasnika.insurance.core.dto.*;
import com.hasnika.insurance.core.entity.CoverageTranche;
import com.hasnika.insurance.core.entity.Policy;
import com.hasnika.insurance.core.entity.Quote;
import com.hasnika.insurance.core.repository.CoverageTrancheRepository;
import com.hasnika.insurance.core.repository.PolicyRepository;
import com.hasnika.insurance.core.repository.QuoteRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Policy Service — manages policy purchase, vesting schedule, and re-underwriting.
 */
@Slf4j
@Service
public class PolicyService {

    private final PolicyRepository policyRepository;
    private final QuoteRepository quoteRepository;
    private final CoverageTrancheRepository trancheRepository;
    private final UnderwritingService underwritingService;
    private final WebClient webClient;

    public PolicyService(PolicyRepository policyRepository, QuoteRepository quoteRepository,
                         CoverageTrancheRepository trancheRepository, UnderwritingService underwritingService,
                         WebClient.Builder webClientBuilder) {
        this.policyRepository = policyRepository;
        this.quoteRepository = quoteRepository;
        this.trancheRepository = trancheRepository;
        this.underwritingService = underwritingService;
        this.webClient = webClientBuilder.baseUrl("http://localhost:8082/api/v1").build();
    }

    public Mono<PolicyDTO> mapToDTO(Policy policy, Quote quote) {
        return trancheRepository.findByPolicyId(policy.getPolicyId())
                .collectList()
                .map(tranches -> {
                    BigDecimal portfolioVal = (policy.getTotalInsuredValue() != null && policy.getTotalInsuredValue().compareTo(BigDecimal.ZERO) > 0)
                            ? policy.getTotalInsuredValue()
                            : (quote != null && quote.getPortfolioValue() != null ? quote.getPortfolioValue() : (quote != null && quote.getInsuredValue() != null ? quote.getInsuredValue() : BigDecimal.ZERO));
                            
                    BigDecimal covPct = (policy.getBaseCoveragePct() != null && policy.getBaseCoveragePct().compareTo(BigDecimal.ZERO) > 0)
                            ? policy.getBaseCoveragePct()
                            : (quote != null && quote.getCoveragePercentage() != null ? quote.getCoveragePercentage() : new BigDecimal("70.00"));
                            
                    BigDecimal covLimit = portfolioVal.multiply(covPct.divide(new BigDecimal("100.0"), 4, RoundingMode.HALF_UP)).setScale(2, RoundingMode.HALF_UP);
                            
                    BigDecimal premPct = (policy.getBasePremiumPct() != null && policy.getBasePremiumPct().compareTo(BigDecimal.ZERO) > 0)
                            ? policy.getBasePremiumPct()
                            : (quote != null && quote.getPremiumPercentage() != null ? quote.getPremiumPercentage() : new BigDecimal("2.00"));

                    BigDecimal premAmt = (policy.getBasePremiumAmount() != null && policy.getBasePremiumAmount().compareTo(BigDecimal.ZERO) > 0)
                            ? policy.getBasePremiumAmount()
                            : portfolioVal.multiply(premPct.divide(new BigDecimal("100.0"), 4, RoundingMode.HALF_UP)).setScale(2, RoundingMode.HALF_UP);

                    BigDecimal riskScore = (policy.getBaseRiskScore() != null && policy.getBaseRiskScore().compareTo(BigDecimal.ZERO) > 0)
                            ? policy.getBaseRiskScore()
                            : (quote != null && quote.getRiskScore() != null ? quote.getRiskScore() : new BigDecimal("380.00"));

                    BigDecimal vestedPct = BigDecimal.ZERO;
                    LocalDate now = LocalDate.now();
                    if (!tranches.isEmpty()) {
                        long maturedCount = tranches.stream().filter(t -> t.getEligibilityDate() != null && !now.isBefore(t.getEligibilityDate())).count();
                        if (maturedCount > 0) {
                            vestedPct = covPct.multiply(new BigDecimal(maturedCount)).divide(new BigDecimal(tranches.size()), 2, RoundingMode.HALF_UP);
                        } else {
                            vestedPct = new BigDecimal("20.00");
                        }
                    } else {
                        vestedPct = new BigDecimal("20.00");
                    }
                    BigDecimal vestedAmount = portfolioVal.multiply(vestedPct.divide(new BigDecimal("100.0"), 4, RoundingMode.HALF_UP)).setScale(2, RoundingMode.HALF_UP);

                    int maxActiveTrancheNum = tranches.stream()
                            .filter(t -> "ACTIVE".equalsIgnoreCase(t.getTrancheStatus()))
                            .mapToInt(CoverageTranche::getTrancheNumber)
                            .max()
                            .orElse(1);

                    List<PolicyDTO.TrancheDTO> trancheDTOs = tranches.stream().map(t -> {
                        String status = t.getTrancheStatus();
                        if ("ACTIVE".equalsIgnoreCase(status) && t.getTrancheNumber() < maxActiveTrancheNum) {
                            status = "SUPERSEDED";
                        }
                        return PolicyDTO.TrancheDTO.builder()
                                .trancheId(t.getTrancheId())
                                .policyId(t.getPolicyId())
                                .trancheNumber(t.getTrancheNumber())
                                .trancheType(t.getTrancheType())
                                .effectiveDate(t.getEffectiveDate())
                                .waitingPeriodYears(t.getWaitingPeriodYears())
                                .eligibilityDate(t.getEligibilityDate())
                                .riskScore(t.getRiskScore())
                                .coveragePercentage(t.getCoveragePercentage())
                                .premiumPercentage(t.getPremiumPercentage())
                                .insuredValue(t.getInsuredValue())
                                .trancheStatus(status)
                                .coveredSymbols(t.getCoveredSymbols())
                                .build();
                    }).toList();

                    return PolicyDTO.builder()
                            .policyId(policy.getPolicyId())
                            .policyNumber(policy.getPolicyNumber())
                            .policyStatus(policy.getPolicyStatus())
                            .userId(policy.getUserId())
                            .portfolioId(policy.getPortfolioId())
                            .quoteId(policy.getQuoteId())
                            .premiumAmount(premAmt)
                            .annualPremium(premAmt)
                            .coverageLimit(covLimit)
                            .coverageAmount(covLimit)
                            .insuredValue(portfolioVal)
                            .totalInsuredValue(portfolioVal)
                            .portfolioValue(portfolioVal)
                            .riskScore(riskScore)
                            .coveragePercentage(covPct)
                            .premiumPercentage(premPct)
                            .currentVestedCoveragePercentage(vestedPct)
                            .currentVestedCoverageAmount(vestedAmount)
                            .tranches(trancheDTOs)
                            .createdAt(policy.getCreatedAt())
                            .policyStartDate(policy.getPolicyStartDate() != null ? policy.getPolicyStartDate() : LocalDate.now())
                            .policyEndDate(policy.getPolicyEndDate() != null ? policy.getPolicyEndDate() : LocalDate.now().plusYears(5))
                            .tenureYears(policy.getTenureYears() != null ? policy.getTenureYears() : 5)
                            .waitingPeriodYears(policy.getWaitingPeriodYears() != null ? policy.getWaitingPeriodYears() : 5)
                            .protectionStartDate(policy.getProtectionStartDate() != null ? policy.getProtectionStartDate() : LocalDate.now().plusYears(5))
                            .build();
                });
    }

    public Mono<PolicyDTO> getPolicyById(String id) {
        return policyRepository.findById(id)
                .flatMap(policy -> quoteRepository.findById(policy.getQuoteId())
                        .flatMap(quote -> mapToDTO(policy, quote))
                        .switchIfEmpty(mapToDTO(policy, null)));
    }

    public Mono<List<PolicyDTO>> getUserPolicies(String userId) {
        return policyRepository.findByUserId(userId)
                .flatMap(policy -> quoteRepository.findById(policy.getQuoteId())
                        .flatMap(quote -> mapToDTO(policy, quote))
                        .switchIfEmpty(mapToDTO(policy, null)))
                .collectList();
    }

    public Mono<List<PolicyDTO>> getAllPolicies() {
        return policyRepository.findAll()
                .flatMap(policy -> quoteRepository.findById(policy.getQuoteId())
                        .flatMap(quote -> mapToDTO(policy, quote))
                        .switchIfEmpty(mapToDTO(policy, null)))
                .collectList();
    }

    public Mono<List<PolicyDTO>> getPendingEndorsements() {
        return policyRepository.findByPolicyStatus("ENDORSEMENT_PENDING")
                .flatMap(policy -> quoteRepository.findById(policy.getQuoteId())
                        .flatMap(quote -> mapToDTO(policy, quote))
                        .switchIfEmpty(mapToDTO(policy, null)))
                .collectList();
    }

    public Mono<PurchaseResponse> purchasePolicy(PurchaseRequest request, String userId) {
        final String uid = userId != null ? userId : "DEMO-USER-ID";
        log.info("Purchasing policy for quote: {}", request.getQuoteId());

        return quoteRepository.findById(request.getQuoteId())
                .flatMap(quote -> {
                    return policyRepository.findByPortfolioId(quote.getPortfolioId())
                            .next()
                            .flatMap(existing -> Mono.<Policy>error(new IllegalStateException("Only one active policy can exist for a portfolio.")))
                            .switchIfEmpty(Mono.defer(() -> {
                                BigDecimal totalInsVal = (quote.getInsuredValue() != null && quote.getInsuredValue().compareTo(BigDecimal.ZERO) > 0)
                                        ? quote.getInsuredValue()
                                        : ((quote.getPortfolioValue() != null && quote.getPortfolioValue().compareTo(BigDecimal.ZERO) > 0)
                                                ? quote.getPortfolioValue()
                                                : (quote.getCoverageAmount() != null ? quote.getCoverageAmount() : new BigDecimal("500000.00")));

                                        int tenure = request.getTenureYears() != null ? request.getTenureYears() : 5;
                                        int waiting = (int) Math.ceil(tenure * 0.4);

                                        BigDecimal fallbackRiskScore = quote.getRiskScore() != null ? quote.getRiskScore() : new BigDecimal("380.0000");
                                        BigDecimal fallbackCoveragePct;
                                        BigDecimal fallbackPremiumPct;
                                        if (fallbackRiskScore.compareTo(new BigDecimal("200")) <= 0) {
                                            fallbackCoveragePct = new BigDecimal("80.0000");
                                            fallbackPremiumPct = new BigDecimal("1.5000");
                                        } else if (fallbackRiskScore.compareTo(new BigDecimal("400")) <= 0) {
                                            fallbackCoveragePct = new BigDecimal("70.0000");
                                            fallbackPremiumPct = new BigDecimal("2.0000");
                                        } else if (fallbackRiskScore.compareTo(new BigDecimal("600")) <= 0) {
                                            fallbackCoveragePct = new BigDecimal("60.0000");
                                            fallbackPremiumPct = new BigDecimal("3.0000");
                                        } else if (fallbackRiskScore.compareTo(new BigDecimal("800")) <= 0) {
                                            fallbackCoveragePct = new BigDecimal("50.0000");
                                            fallbackPremiumPct = new BigDecimal("5.0000");
                                        } else {
                                            fallbackCoveragePct = new BigDecimal("40.0000");
                                            fallbackPremiumPct = new BigDecimal("8.0000");
                                        }

                                        Policy policy = Policy.builder()
                                                .policyId(UUID.randomUUID().toString())
                                                .policyNumber("POL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                                                .userId(uid)
                                                .portfolioId(quote.getPortfolioId())
                                                .quoteId(quote.getQuoteId())
                                                .policyStatus("COVERAGE_ACTIVE")
                                                .baseRiskScore(fallbackRiskScore)
                                                .baseCoveragePct(quote.getCoveragePercentage() != null ? quote.getCoveragePercentage() : fallbackCoveragePct)
                                                .basePremiumPct(quote.getPremiumPercentage() != null ? quote.getPremiumPercentage() : fallbackPremiumPct)
                                                .basePremiumAmount(quote.getPremiumAmount() != null ? quote.getPremiumAmount() : new BigDecimal("0.0000"))
                                                .totalInsuredValue(totalInsVal)
                                                .insuredThresholdPct(quote.getInsuredThresholdPct() != null ? quote.getInsuredThresholdPct() : new BigDecimal("20.0000"))
                                                .currency("INR")
                                                .policyStartDate(LocalDate.now())
                                                .policyEndDate(LocalDate.now().plusYears(tenure))
                                                .tenureYears(tenure)
                                                .waitingPeriodYears(waiting)
                                                .protectionStartDate(LocalDate.now().plusYears(waiting))
                                                .nextPremiumDueDate(LocalDate.now().plusYears(1))
                                        .premiumStatus("PAID")
                                        .createdAt(Instant.now())
                                        .updatedAt(Instant.now())
                                        .createdBy(uid)
                                        .updatedBy(uid)
                                        .build();

                                return policyRepository.save(policy)
                                        .flatMap(savedPolicy -> {
                                            CoverageTranche tranche = CoverageTranche.builder()
                                                    .trancheId(UUID.randomUUID().toString())
                                                    .policyId(savedPolicy.getPolicyId())
                                                    .trancheNumber(1)
                                                    .trancheType("ORIGINAL")
                                                    .effectiveDate(LocalDate.now())
                                                    .waitingPeriodYears(waiting)
                                                    .eligibilityDate(LocalDate.now().plusYears(waiting))
                                                    .riskScore(savedPolicy.getBaseRiskScore())
                                                    .coveragePercentage(savedPolicy.getBaseCoveragePct())
                                                    .premiumPercentage(savedPolicy.getBasePremiumPct())
                                                    .insuredValue(savedPolicy.getTotalInsuredValue())
                                                    .trancheStatus("ACTIVE")
                                                    .createdAt(Instant.now())
                                                    .createdBy(uid)
                                                    .updatedAt(Instant.now())
                                                    .updatedBy(uid)
                                                    .build();

                                            return trancheRepository.save(tranche).thenReturn(savedPolicy);
                                        });
                            }));
                })
                .map(saved -> new PurchaseResponse("Policy purchased successfully!", saved.getPolicyId()))
                .switchIfEmpty(Mono.error(new RuntimeException("Quote not found")));
    }

    public Mono<Void> advancePremium(String policyId) {
        return policyRepository.findById(policyId)
                .flatMap(policy -> {
                    policy.setPremiumStatus("PAID");
                    policy.setNextPremiumDueDate(policy.getNextPremiumDueDate() != null ? policy.getNextPremiumDueDate().plusYears(1) : LocalDate.now().plusYears(1));
                    policy.setNew(false);
                    return policyRepository.save(policy).then();
                });
    }

    public Mono<Void> reUnderwritePolicy(String portfolioId) {
        log.info("Re-underwriting policy for portfolio: {}", portfolioId);

        return policyRepository.findByPortfolioId(portfolioId)
                .next()
                .flatMap(policy -> {
                    return webClient.get()
                            .uri("/portfolios/{id}", portfolioId)
                            .retrieve()
                            .bodyToMono(PortfolioDTO.class)
                            .flatMap(portfolio -> {
                                BigDecimal portfolioValue = portfolio.getTotalValue() != null ? portfolio.getTotalValue() : BigDecimal.ZERO;

                                return webClient.get()
                                        .uri("/portfolios/{id}/holdings", portfolioId)
                                        .retrieve()
                                        .bodyToFlux(PortfolioHoldingDTO.class)
                                        .collectList()
                                        .flatMap(holdings -> {
                                            BigDecimal totalRiskWeight = BigDecimal.ZERO;
                                            BigDecimal totalWeight = BigDecimal.ZERO;
                                            StringBuilder symbolSb = new StringBuilder();

                                            for (PortfolioHoldingDTO h : holdings) {
                                                BigDecimal holdingValue = h.getQuantity().multiply(h.getAveragePrice());
                                                BigDecimal beta = underwritingService.getBetaForSymbol(h.getSymbol());
                                                totalRiskWeight = totalRiskWeight.add(beta.multiply(holdingValue));
                                                totalWeight = totalWeight.add(holdingValue);
                                                if (symbolSb.length() > 0) symbolSb.append(",");
                                                symbolSb.append(h.getSymbol());
                                            }

                                            BigDecimal avgBeta = totalWeight.compareTo(BigDecimal.ZERO) > 0
                                                    ? totalRiskWeight.divide(totalWeight, 4, RoundingMode.HALF_UP)
                                                    : new BigDecimal("1.0");

                                            BigDecimal baseRiskScore = new BigDecimal("320.0");
                                            BigDecimal riskScore = baseRiskScore.multiply(avgBeta).min(new BigDecimal("1000.0")).setScale(0, RoundingMode.HALF_UP);

                                            BigDecimal coveragePercentage = new BigDecimal("70.00");
                                            BigDecimal premiumPercentage = new BigDecimal("2.00");

                                            String coveredJson = symbolSb.length() > 0 
                                                    ? "[\"" + String.join("\",\"", symbolSb.toString().split(",")) + "\"]" 
                                                    : "[]";

                                            policy.setPolicyStatus("ENDORSEMENT_PENDING");
                                            policy.setUpdatedAt(Instant.now());
                                            policy.setNew(false);

                                            return policyRepository.save(policy)
                                                    .flatMap(savedPolicy -> {
                                                        return trancheRepository.findByPolicyId(savedPolicy.getPolicyId())
                                                                .collectList()
                                                                .flatMap(existingTranches -> {
                                                                    Optional<CoverageTranche> existingPending = existingTranches.stream()
                                                                            .filter(t -> "PENDING_ACCEPTANCE".equalsIgnoreCase(t.getTrancheStatus())
                                                                                      || "PENDING".equalsIgnoreCase(t.getTrancheStatus())
                                                                                      || "PENDING_APPROVAL".equalsIgnoreCase(t.getTrancheStatus()))
                                                                            .findFirst();

                                                                    if (existingPending.isPresent()) {
                                                                        CoverageTranche pending = existingPending.get();
                                                                        pending.setRiskScore(riskScore);
                                                                        pending.setCoveragePercentage(coveragePercentage);
                                                                        pending.setPremiumPercentage(premiumPercentage);
                                                                        pending.setInsuredValue(portfolioValue);
                                                                        pending.setCoveredSymbols(coveredJson);
                                                                        pending.setUpdatedAt(Instant.now());
                                                                        pending.setNew(false);
                                                                        log.info("Updating existing pending endorsement tranche #{} for policy {}", pending.getTrancheNumber(), savedPolicy.getPolicyId());
                                                                        return trancheRepository.save(pending);
                                                                    }

                                                                    int nextTrancheNum = existingTranches.size() + 1;
                                                                    CoverageTranche tranche = CoverageTranche.builder()
                                                                            .trancheId(UUID.randomUUID().toString())
                                                                            .policyId(savedPolicy.getPolicyId())
                                                                            .trancheNumber(nextTrancheNum)
                                                                            .trancheType("ENDORSEMENT")
                                                                            .effectiveDate(LocalDate.now())
                                                                            .waitingPeriodYears(savedPolicy.getWaitingPeriodYears() != null ? savedPolicy.getWaitingPeriodYears() : 5)
                                                                            .eligibilityDate(savedPolicy.getProtectionStartDate() != null ? savedPolicy.getProtectionStartDate() : LocalDate.now().plusYears(5))
                                                                            .riskScore(riskScore)
                                                                            .coveragePercentage(coveragePercentage)
                                                                            .premiumPercentage(premiumPercentage)
                                                                            .insuredValue(portfolioValue)
                                                                            .coveredSymbols(coveredJson)
                                                                            .trancheStatus("PENDING_ACCEPTANCE")
                                                                            .createdAt(Instant.now())
                                                                            .createdBy("SYSTEM")
                                                                            .updatedAt(Instant.now())
                                                                            .updatedBy("SYSTEM")
                                                                            .build();
                                                                    tranche.setNew(true);
                                                                    log.info("Creating pending endorsement tranche #{} for policy {}", nextTrancheNum, savedPolicy.getPolicyId());
                                                                    return trancheRepository.save(tranche);
                                                                });
                                                    });
                                        });
                            });
                })
                .then();
    }

    public Mono<PolicyDTO> acceptEndorsement(String policyId, String trancheId) {
        log.info("Accepting endorsement tranche {} for policy {}", trancheId, policyId);
        return trancheRepository.findByPolicyId(policyId)
                .collectList()
                .flatMap(tranches -> {
                    CoverageTranche target = null;
                    for (CoverageTranche t : tranches) {
                        t.setNew(false);
                        if (t.getTrancheId().equals(trancheId)) {
                            t.setTrancheStatus("ACTIVE");
                            t.setUpdatedAt(Instant.now());
                            target = t;
                        } else if ("ACTIVE".equalsIgnoreCase(t.getTrancheStatus())) {
                            t.setTrancheStatus("SUPERSEDED");
                            t.setUpdatedAt(Instant.now());
                        } else if ("PENDING_ACCEPTANCE".equalsIgnoreCase(t.getTrancheStatus()) || "PENDING".equalsIgnoreCase(t.getTrancheStatus())) {
                            t.setTrancheStatus("SUPERSEDED");
                            t.setUpdatedAt(Instant.now());
                        }
                    }

                    if (target == null) {
                        return Mono.error(new IllegalArgumentException("Tranche not found: " + trancheId));
                    }

                    final CoverageTranche savedTranche = target;

                    return trancheRepository.saveAll(tranches)
                            .then(policyRepository.findById(policyId))
                            .flatMap(policy -> {
                                policy.setBaseRiskScore(savedTranche.getRiskScore());
                                policy.setBaseCoveragePct(savedTranche.getCoveragePercentage());
                                policy.setBasePremiumPct(savedTranche.getPremiumPercentage());
                                policy.setTotalInsuredValue(savedTranche.getInsuredValue());
                                BigDecimal updatedPremAmt = savedTranche.getInsuredValue()
                                        .multiply(savedTranche.getPremiumPercentage().divide(new BigDecimal("100.0"), 4, RoundingMode.HALF_UP))
                                        .setScale(2, RoundingMode.HALF_UP);
                                policy.setBasePremiumAmount(updatedPremAmt);
                                policy.setPolicyStatus("COVERAGE_ACTIVE");
                                policy.setUpdatedAt(Instant.now());
                                policy.setNew(false);
                                return policyRepository.save(policy)
                                        .flatMap(p -> quoteRepository.findById(p.getQuoteId())
                                                .flatMap(q -> mapToDTO(p, q))
                                                .switchIfEmpty(mapToDTO(p, null)));
                            });
                });
    }

    public Mono<PolicyDTO> rejectEndorsement(String policyId, String trancheId) {
        log.info("Rejecting endorsement tranche {} for policy {}", trancheId, policyId);
        return trancheRepository.findById(trancheId)
                .flatMap(tranche -> {
                    tranche.setTrancheStatus("REJECTED");
                    tranche.setUpdatedAt(Instant.now());
                    tranche.setNew(false);
                    return trancheRepository.save(tranche)
                            .flatMap(savedTranche -> policyRepository.findById(policyId)
                                    .flatMap(policy -> {
                                        policy.setPolicyStatus("COVERAGE_ACTIVE");
                                        policy.setUpdatedAt(Instant.now());
                                        policy.setNew(false);
                                        return policyRepository.save(policy)
                                                .flatMap(p -> quoteRepository.findById(p.getQuoteId())
                                                        .flatMap(q -> mapToDTO(p, q))
                                                        .switchIfEmpty(mapToDTO(p, null)));
                                    }));
                });
    }
}
