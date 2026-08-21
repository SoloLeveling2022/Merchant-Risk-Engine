package com.fintech.merchantrisk.identity.service;

import com.fintech.merchantrisk.identity.dto.*;
import com.fintech.merchantrisk.identity.entity.MerchantEntity;
import com.fintech.merchantrisk.identity.entity.MerchantUser;
import com.fintech.merchantrisk.identity.repository.MerchantEntityRepository;
import com.fintech.merchantrisk.identity.repository.MerchantUserRepository;
import com.fintech.merchantrisk.identity.security.MerchantJwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MerchantIdentityService {

    private final MerchantEntityRepository merchantEntityRepository;
    private final MerchantUserRepository merchantUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final MerchantJwtProvider jwtProvider;

    @Transactional
    public Mono<MerchantEntityDto> onboardKyb(MerchantKybOnboardRequest request) {
        MerchantEntity entity = MerchantEntity.builder()
                .mid(request.mid())
                .legalName(request.legalName())
                .mcc(request.mcc())
                .billingDescriptorPrefix(request.billingDescriptorPrefix().substring(0, Math.min(6, request.billingDescriptorPrefix().length())))
                .kybStatus("VERIFIED")
                .uboIdentityHash(request.uboIdentityHash())
                .onboardedAt(Instant.now())
                .version(null)
                .build();

        return merchantEntityRepository.save(entity)
                .flatMap(savedMerchant -> {
                    MerchantUser user = MerchantUser.builder()
                            .merchantId(savedMerchant.getMerchantId())
                            .email(request.adminEmail())
                            .passwordHash(passwordEncoder.encode(request.adminPassword()))
                            .role("ROLE_MERCHANT_OWNER")
                            .enabled(true)
                            .createdAt(Instant.now())
                            .build();

                    return merchantUserRepository.save(user)
                            .thenReturn(new MerchantEntityDto(
                                    savedMerchant.getMerchantId(),
                                    savedMerchant.getMid(),
                                    savedMerchant.getLegalName(),
                                    savedMerchant.getMcc(),
                                    savedMerchant.getBillingDescriptorPrefix(),
                                    savedMerchant.getKybStatus(),
                                    savedMerchant.getOnboardedAt()
                            ));
                });
    }

    public Mono<JwtTokenResponse> login(MerchantLoginRequest request) {
        return merchantUserRepository.findByEmail(request.email())
                .filter(user -> passwordEncoder.matches(request.password(), user.getPasswordHash()))
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Invalid credentials")))
                .flatMap(user -> merchantEntityRepository.findById(user.getMerchantId())
                        .map(entity -> {
                            String token = jwtProvider.generateToken(
                                    entity.getMerchantId(),
                                    entity.getMid(),
                                    entity.getMcc(),
                                    user.getRole(),
                                    user.getEmail()
                            );
                            return new JwtTokenResponse(
                                    token,
                                    "Bearer",
                                    86400L,
                                    entity.getMerchantId(),
                                    user.getRole(),
                                    Instant.now()
                            );
                        }));
    }

    public Mono<MerchantDescriptorDto> getDescriptors(UUID merchantId) {
        return merchantEntityRepository.findById(merchantId)
                .map(e -> new MerchantDescriptorDto(
                        e.getMerchantId(),
                        e.getMid(),
                        e.getLegalName(),
                        e.getMcc(),
                        e.getBillingDescriptorPrefix(),
                        e.getKybStatus()
                ));
    }
}
