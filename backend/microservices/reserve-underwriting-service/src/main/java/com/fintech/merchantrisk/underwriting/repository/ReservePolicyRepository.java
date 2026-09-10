package com.fintech.merchantrisk.underwriting.repository;

import com.fintech.merchantrisk.underwriting.entity.ReservePolicy;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface ReservePolicyRepository extends ReactiveCrudRepository<ReservePolicy, UUID> {
    Mono<ReservePolicy> findFirstByMerchantIdAndActiveTrueOrderByEffectiveFromDesc(UUID merchantId);
}
