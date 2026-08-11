package com.hasnika.insurance.claimsfinance.service;

import com.hasnika.insurance.claimsfinance.dto.ClaimRequest;
import com.hasnika.insurance.claimsfinance.dto.ClaimResponse;
import com.hasnika.insurance.claimsfinance.dto.PolicyDTO;
import com.hasnika.insurance.claimsfinance.entity.Claim;
import com.hasnika.insurance.claimsfinance.repository.ClaimRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Service handling claim submission, 5-year waiting period validation, fraud evaluation, and retrieval.
 */
@Slf4j
@Service
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final WebClient webClient;
    private final WebClient.Builder webClientBuilder;

    public ClaimService(ClaimRepository claimRepository, WebClient.Builder webClientBuilder) {
        this.claimRepository = claimRepository;
        this.webClient = webClientBuilder.baseUrl("http://localhost:8083/api/v1").build();
        this.webClientBuilder = webClientBuilder;
    }

    public Mono<List<Claim>> getUserClaims(String userId) {
        return claimRepository.findByUserId(userId).collectList();
    }

    public Mono<List<Claim>> getAllClaims() {
        return claimRepository.findAll().collectList();
    }

    public Mono<ClaimResponse> fileClaim(ClaimRequest request, String userId) {
        final String uid = (userId != null && !userId.isEmpty() && !"null".equalsIgnoreCase(userId)) ? userId : "usr-investor-001";
        log.info("Filing claim for policy: {}, user: {}", request.getPolicyId(), uid);

        final BigDecimal claimAmt = request.getClaimAmount() != null ? request.getClaimAmount() : new BigDecimal("5000.00");

        return webClient.get()
                .uri("/policies/{id}", request.getPolicyId())
                .retrieve()
                .bodyToMono(PolicyDTO.class)
                .onErrorResume(e -> {
                    log.warn("Policy lookup fallback for policyId={}: {}", request.getPolicyId(), e.getMessage());
                    PolicyDTO fallback = new PolicyDTO();
                    fallback.setProtectionStartDate(LocalDate.now().plusYears(5));
                    return Mono.just(fallback);
                })
                .flatMap(policy -> {
                    LocalDate protDate = policy.getProtectionStartDate() != null ? policy.getProtectionStartDate() : LocalDate.now().plusYears(5);
                    if (!protDate.isBefore(LocalDate.now()) && !protDate.isEqual(LocalDate.now())) {
                        log.warn("Claim rejected: Mandatory 5-year tenure/waiting period active until {}", protDate);
                        return claimRepository.save(Claim.builder()
                                .claimId(UUID.randomUUID().toString())
                                .claimNumber("CLM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                                .policyId(request.getPolicyId())
                                .userId(uid)
                                .claimStatus("REJECTED_WAITING_PERIOD")
                                .submittedAt(Instant.now())
                                .baselineValue(new BigDecimal("10000.00"))
                                .currentValue(new BigDecimal("5000.00"))
                                .grossLoss(claimAmt)
                                .grossLossPct(new BigDecimal("10.00"))
                                .build())
                                .map(saved -> new ClaimResponse(saved.getClaimId(), "REJECTED_WAITING_PERIOD", "Claims cannot be filed during the mandatory 5-year tenure period from policy purchase date."));
                    }

                    String finalStatus = "UNDER_REVIEW"; // All claims should be reviewed by an analyst

                    BigDecimal coveragePct = policy.getCoveragePercentage() != null ? policy.getCoveragePercentage() : new BigDecimal("70.00");
                    BigDecimal policyPortValue = policy.getPortfolioValue() != null ? policy.getPortfolioValue() : new BigDecimal("10000.00");
                    BigDecimal policyCovAmount = policy.getCoverageAmount() != null ? policy.getCoverageAmount() : new BigDecimal("7000.00");

                    BigDecimal calculatedGrossLoss = claimAmt; // User entered the actual gross loss
                    BigDecimal calculatedPayout = calculatedGrossLoss.multiply(coveragePct.divide(new BigDecimal("100.0"), 4, java.math.RoundingMode.HALF_UP)).setScale(2, java.math.RoundingMode.HALF_UP);
                    
                    if (calculatedPayout.compareTo(policyCovAmount) > 0) {
                        calculatedPayout = policyCovAmount;
                    }

                    Claim claim = Claim.builder()
                            .claimId(UUID.randomUUID().toString())
                            .claimNumber("CLM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                            .policyId(request.getPolicyId())
                            .userId(uid)
                            .claimStatus(finalStatus)
                            .submittedAt(Instant.now())
                            .baselineValue(policyPortValue)
                            .currentValue(policyPortValue.subtract(calculatedGrossLoss))
                            .grossLoss(calculatedGrossLoss)
                            .grossLossPct(new BigDecimal("10.00"))
                            .eligibleLoss(calculatedGrossLoss)
                            .payoutAmount(calculatedPayout)
                            .policyLimit(policyCovAmount)
                            .build();

                    return claimRepository.save(claim)
                            .map(saved -> new ClaimResponse(saved.getClaimId(), saved.getClaimStatus(), "Claim submitted successfully"));
                })
                .onErrorResume(e -> {
                    log.error("Error filing claim: {}", e.getMessage(), e);
                    String fallbackClaimId = UUID.randomUUID().toString();
                    return Mono.just(new ClaimResponse(fallbackClaimId, "REJECTED_WAITING_PERIOD", "Claim request failed: " + e.getMessage()));
                });
    }

    public Mono<Void> processCrash(Object event) {
        log.info("Processing portfolio crash event: {}", event);
        return Mono.empty();
    }

    public Mono<List<Claim>> getPendingClaims() {
        return claimRepository.findByClaimStatus("UNDER_REVIEW").collectList();
    }

    public Mono<ClaimResponse> approveClaim(String claimId) {
        return claimRepository.findById(claimId)
                .flatMap(claim -> {
                    return webClient.get()
                            .uri("/policies/{id}", claim.getPolicyId())
                            .retrieve()
                            .bodyToMono(PolicyDTO.class)
                            .flatMap(policy -> {
                                BigDecimal coveragePct = policy.getCoveragePercentage() != null ? policy.getCoveragePercentage() : new BigDecimal("70.00");
                                BigDecimal payout = claim.getGrossLoss().multiply(coveragePct.divide(new BigDecimal("100.0"), 4, java.math.RoundingMode.HALF_UP)).setScale(2, java.math.RoundingMode.HALF_UP);
                                
                                claim.setPayoutAmount(payout);
                                claim.setClaimStatus("APPROVED");
                                claim.setApprovedAt(Instant.now());
                                claim.setNew(false);
                                
                                return claimRepository.save(claim)
                                        .flatMap(saved -> {
                                            java.util.Map<String, Object> event = java.util.Map.of(
                                                    "eventId", UUID.randomUUID().toString(),
                                                    "eventType", "PAYMENT_TRANSFER",
                                                    "title", "Claim Approved",
                                                    "message", "Claim " + saved.getClaimNumber() + " approved. Payout: " + payout,
                                                    "timestamp", Instant.now()
                                            );
                                            return webClientBuilder.build().post()
                                                    .uri("http://localhost:8085/api/v1/notifications/send/" + saved.getUserId())
                                                    .bodyValue(event)
                                                    .retrieve()
                                                    .bodyToMono(Void.class)
                                                    .onErrorResume(e -> Mono.empty())
                                                    .then(Mono.just(new ClaimResponse(saved.getClaimId(), "APPROVED", "Claim approved and payout initiated.")));
                                        });
                            });
                });
    }

    public Mono<ClaimResponse> rejectClaim(String claimId, String reason) {
        return claimRepository.findById(claimId)
                .flatMap(claim -> {
                    claim.setClaimStatus("REJECTED");
                    claim.setRejectionReason(reason);
                    claim.setNew(false);
                    return claimRepository.save(claim)
                            .flatMap(saved -> {
                                java.util.Map<String, Object> event = java.util.Map.of(
                                        "eventId", UUID.randomUUID().toString(),
                                        "eventType", "CLAIM_REJECTED",
                                        "title", "Claim Rejected",
                                        "message", "Claim " + saved.getClaimNumber() + " was rejected: " + reason,
                                        "timestamp", Instant.now()
                                );
                                return webClientBuilder.build().post()
                                        .uri("http://localhost:8085/api/v1/notifications/send/" + saved.getUserId())
                                        .bodyValue(event)
                                        .retrieve()
                                        .bodyToMono(Void.class)
                                        .onErrorResume(e -> Mono.empty())
                                        .then(Mono.just(new ClaimResponse(saved.getClaimId(), "REJECTED", "Claim rejected.")));
                            });
                });
    }
}
