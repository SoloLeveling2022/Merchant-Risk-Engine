package com.fintech.merchantrisk.identity.controller;

import com.fintech.merchantrisk.identity.dto.*;
import com.fintech.merchantrisk.identity.security.MerchantJwtProvider;
import com.fintech.merchantrisk.identity.service.MerchantIdentityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class MerchantAuthController {

    private final MerchantIdentityService identityService;
    private final MerchantJwtProvider jwtProvider;

    @PostMapping("/api/v1/auth/login")
    public Mono<JwtTokenResponse> login(@RequestBody MerchantLoginRequest request) {
        return identityService.login(request);
    }

    @PostMapping("/api/v1/merchants/kyb")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<MerchantEntityDto> onboardKyb(@RequestBody MerchantKybOnboardRequest request) {
        return identityService.onboardKyb(request);
    }

    @GetMapping("/api/v1/merchants/{merchantId}/descriptors")
    public Mono<MerchantDescriptorDto> getDescriptors(@PathVariable UUID merchantId) {
        return identityService.getDescriptors(merchantId);
    }

    @GetMapping("/.well-known/jwks.json")
    public Mono<Map<String, Object>> getJwks() {
        return Mono.fromSupplier(jwtProvider::getJwks);
    }
}
