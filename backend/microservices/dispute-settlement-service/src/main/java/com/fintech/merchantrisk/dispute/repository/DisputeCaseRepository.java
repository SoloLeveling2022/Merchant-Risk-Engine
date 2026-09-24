package com.fintech.merchantrisk.dispute.repository;

import com.fintech.merchantrisk.dispute.entity.DisputeCase;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface DisputeCaseRepository extends ReactiveCrudRepository<DisputeCase, UUID> {
    Mono<DisputeCase> findByNetworkDisputeRef(String networkDisputeRef);
}
