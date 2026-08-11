package com.hasnika.insurance.identity.controller;

import com.hasnika.insurance.identity.dto.ApiResponse;
import com.hasnika.insurance.identity.dto.KycSubmitRequest;
import com.hasnika.insurance.identity.entity.KycRecord;
import com.hasnika.insurance.identity.service.KycService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth/kyc")
@RequiredArgsConstructor
public class KycController {

    private final KycService kycService;

    @GetMapping("/status")
    public Mono<ApiResponse<KycRecord>> getKycStatus(@RequestHeader("X-User-Id") String userId) {
        return kycService.getKycRecord(userId)
                .map(ApiResponse::ok)
                .defaultIfEmpty(ApiResponse.ok(null));
    }

    @GetMapping("/pending")
    public Mono<ApiResponse<java.util.List<KycRecord>>> getPendingKycRecords() {
        return kycService.getPendingKycRecords()
                .map(ApiResponse::ok);
    }

    @PostMapping("/submit")
    public Mono<ApiResponse<KycRecord>> submitKyc(@RequestHeader("X-User-Id") String userId, @RequestBody KycSubmitRequest request) {
        return kycService.submitPan(userId, request.getPanNumber())
                .map(ApiResponse::ok);
    }

    @GetMapping("/all")
    public Mono<ApiResponse<java.util.List<KycRecord>>> getAllKycRecords() {
        return kycService.getAllKycRecords()
                .map(ApiResponse::ok);
    }

    @PostMapping("/approve/{userId}")
    public Mono<ApiResponse<KycRecord>> approveKyc(@PathVariable("userId") String userId) {
        return kycService.approveKyc(userId)
                .map(ApiResponse::ok);
    }

    @PostMapping("/reject/{userId}")
    public Mono<ApiResponse<KycRecord>> rejectKyc(@PathVariable("userId") String userId, @RequestBody(required = false) java.util.Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return kycService.rejectKyc(userId, reason)
                .map(ApiResponse::ok);
    }
}
