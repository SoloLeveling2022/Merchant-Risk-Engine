package com.fintech.merchantrisk.identity.repository;

import com.fintech.merchantrisk.identity.entity.MerchantUser;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface MerchantUserRepository extends ReactiveCrudRepository<MerchantUser, UUID> {
    Mono<MerchantUser> findByEmail(String email);
    Mono<MerchantUser> findByMerchantId(UUID merchantId);
}
