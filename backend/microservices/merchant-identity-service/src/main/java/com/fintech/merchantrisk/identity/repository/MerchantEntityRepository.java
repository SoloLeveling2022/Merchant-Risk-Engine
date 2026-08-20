package com.fintech.merchantrisk.identity.repository;

import com.fintech.merchantrisk.identity.entity.MerchantEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface MerchantEntityRepository extends ReactiveCrudRepository<MerchantEntity, UUID> {
    Mono<MerchantEntity> findByMid(String mid);
}
