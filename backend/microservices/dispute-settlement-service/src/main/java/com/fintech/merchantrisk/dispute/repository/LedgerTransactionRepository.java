package com.fintech.merchantrisk.dispute.repository;

import com.fintech.merchantrisk.dispute.entity.LedgerTransaction;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface LedgerTransactionRepository extends ReactiveCrudRepository<LedgerTransaction, UUID> {
    Mono<LedgerTransaction> findByIdempotencyKey(String idempotencyKey);
}
