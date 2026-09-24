package com.fintech.merchantrisk.dispute.repository;

import com.fintech.merchantrisk.dispute.entity.LedgerEntry;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.UUID;

@Repository
public interface LedgerEntryRepository extends ReactiveCrudRepository<LedgerEntry, UUID> {
    Flux<LedgerEntry> findAllByTransactionId(UUID transactionId);
}
