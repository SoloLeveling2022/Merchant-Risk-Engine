package com.hasnika.insurance.core.controller;

import jakarta.validation.Valid;
import com.hasnika.insurance.core.dto.PolicyDTO;
import com.hasnika.insurance.core.dto.PurchaseRequest;
import com.hasnika.insurance.core.dto.PurchaseResponse;
import com.hasnika.insurance.core.service.PolicyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v1/policies")
@Slf4j
@RequiredArgsConstructor
public class PolicyController {

    private final PolicyService policyService;

    @GetMapping("/{id}")
    public Mono<ResponseEntity<PolicyDTO>> getPolicyById(@PathVariable("id") String id) {
        return policyService.getPolicyById(id)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{userId}")
    public Mono<ResponseEntity<List<PolicyDTO>>> getUserPolicies(@PathVariable("userId") String userId) {
        return policyService.getUserPolicies(userId)
                .map(ResponseEntity::ok);
    }

    @GetMapping("/all")
    public Mono<ResponseEntity<List<PolicyDTO>>> getAllPolicies() {
        return policyService.getAllPolicies()
                .map(ResponseEntity::ok);
    }

    @GetMapping("/pending-endorsements")
    public Mono<ResponseEntity<List<PolicyDTO>>> getPendingEndorsements() {
        return policyService.getPendingEndorsements()
                .map(ResponseEntity::ok);
    }

    @PostMapping("/purchase")
    public Mono<ResponseEntity<PurchaseResponse>> purchasePolicy(
            @Valid @RequestBody PurchaseRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return policyService.purchasePolicy(request, userId)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.badRequest().build());
    }

    @PutMapping("/{policyId}/advance-premium")
    public Mono<ResponseEntity<Void>> advancePremium(@PathVariable String policyId) {
        return policyService.advancePremium(policyId)
                .map(v -> ResponseEntity.ok().<Void>build())
                .defaultIfEmpty(ResponseEntity.ok().<Void>build());
    }

    @PostMapping("/re-underwrite/portfolio/{portfolioId}")
    public Mono<ResponseEntity<Void>> reUnderwritePolicy(@PathVariable("portfolioId") String portfolioId) {
        return policyService.reUnderwritePolicy(portfolioId)
                .then(Mono.just(ResponseEntity.ok().<Void>build()))
                .onErrorResume(err -> {
                    log.warn("Re-underwriting skipped/failed for portfolio {}: {}", portfolioId, err.getMessage());
                    return Mono.just(ResponseEntity.ok().build());
                });
    }

    @PostMapping("/{id}/endorsements/{trancheId}/accept")
    public Mono<ResponseEntity<PolicyDTO>> acceptEndorsement(
            @PathVariable("id") String policyId,
            @PathVariable("trancheId") String trancheId) {
        return policyService.acceptEndorsement(policyId, trancheId)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/endorsements/{trancheId}/reject")
    public Mono<ResponseEntity<PolicyDTO>> rejectEndorsement(
            @PathVariable("id") String policyId,
            @PathVariable("trancheId") String trancheId) {
        return policyService.rejectEndorsement(policyId, trancheId)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}
