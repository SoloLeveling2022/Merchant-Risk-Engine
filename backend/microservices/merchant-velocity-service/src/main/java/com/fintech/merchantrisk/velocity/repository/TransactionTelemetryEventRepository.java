package com.fintech.merchantrisk.velocity.repository;

import com.fintech.merchantrisk.velocity.entity.TransactionTelemetryEvent;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface TransactionTelemetryEventRepository extends ReactiveCrudRepository<TransactionTelemetryEvent, UUID> {
    Mono<TransactionTelemetryEvent> findByIdempotencyKey(String idempotencyKey);
}
