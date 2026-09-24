package com.fintech.merchantrisk.dispute.repository;

import com.fintech.merchantrisk.dispute.entity.PayoutBatch;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface PayoutBatchRepository extends ReactiveCrudRepository<PayoutBatch, UUID> {
    Mono<PayoutBatch> findByIdempotencyKey(String idempotencyKey);
}
