package com.fintech.merchantrisk.velocity.repository;

import com.fintech.merchantrisk.velocity.entity.MerchantVelocitySnapshot;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.UUID;

@Repository
public interface MerchantVelocitySnapshotRepository extends ReactiveCrudRepository<MerchantVelocitySnapshot, UUID> {
    Mono<MerchantVelocitySnapshot> findByMerchantIdAndWindowDate(UUID merchantId, LocalDate windowDate);
    Mono<MerchantVelocitySnapshot> findTopByMerchantIdOrderByWindowDateDesc(UUID merchantId);
}
