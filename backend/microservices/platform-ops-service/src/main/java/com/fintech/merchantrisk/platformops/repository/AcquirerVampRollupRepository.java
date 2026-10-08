package com.fintech.merchantrisk.platformops.repository;

import com.fintech.merchantrisk.platformops.entity.AcquirerVampRollup;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface AcquirerVampRollupRepository extends ReactiveCrudRepository<AcquirerVampRollup, UUID> {
    Mono<AcquirerVampRollup> findByAcquirerRegionAndReportingMonth(String acquirerRegion, String reportingMonth);
}
