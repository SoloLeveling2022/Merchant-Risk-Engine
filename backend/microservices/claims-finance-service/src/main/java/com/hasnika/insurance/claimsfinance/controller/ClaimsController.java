package com.hasnika.insurance.claimsfinance.controller;

import jakarta.validation.Valid;
import com.hasnika.insurance.claimsfinance.dto.ClaimRequest;
import com.hasnika.insurance.claimsfinance.dto.ClaimResponse;
import com.hasnika.insurance.claimsfinance.entity.Claim;
import com.hasnika.insurance.claimsfinance.service.ClaimService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v1/claims")
@Slf4j
@RequiredArgsConstructor
public class ClaimsController {

    private final ClaimService claimService;

    @PostMapping("/process-crash")
    public Mono<Void> processCrash(@RequestBody Object event) {
        log.info("Received portfolio crash event via REST");
        return claimService.processCrash(event);
    }

    @GetMapping("/user/{userId}")
    public Mono<ResponseEntity<List<Claim>>> getUserClaims(@PathVariable("userId") String userId) {
        return claimService.getUserClaims(userId)
                .map(ResponseEntity::ok);
    }

    @GetMapping("/all")
    public Mono<ResponseEntity<List<Claim>>> getAllClaims() {
        return claimService.getAllClaims()
                .map(ResponseEntity::ok);
    }

    @GetMapping("/pending")
    public Mono<ResponseEntity<List<Claim>>> getPendingClaims() {
        return claimService.getPendingClaims()
                .map(ResponseEntity::ok);
    }

    @PostMapping
    public Mono<ResponseEntity<ClaimResponse>> fileClaim(
            @Valid @RequestBody ClaimRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return claimService.fileClaim(request, userId)
                .map(res -> {
                    if ("REJECTED_WAITING_PERIOD".equals(res.getStatus())) {
                        return ResponseEntity.badRequest().body(res);
                    }
                    return ResponseEntity.ok(res);
                });
    }

    @PostMapping("/{claimId}/approve")
    public Mono<ResponseEntity<ClaimResponse>> approveClaim(@PathVariable("claimId") String claimId) {
        return claimService.approveClaim(claimId)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping("/{claimId}/reject")
    public Mono<ResponseEntity<ClaimResponse>> rejectClaim(
            @PathVariable("claimId") String claimId,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String reason = body != null ? body.get("rejectionReason") : "Rejected by analyst";
        return claimService.rejectClaim(claimId, reason)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}
