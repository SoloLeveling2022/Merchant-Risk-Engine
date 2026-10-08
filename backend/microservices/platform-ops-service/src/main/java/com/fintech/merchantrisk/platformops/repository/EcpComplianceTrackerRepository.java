package com.fintech.merchantrisk.platformops.repository;

import com.fintech.merchantrisk.platformops.entity.EcpComplianceTracker;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface EcpComplianceTrackerRepository extends ReactiveCrudRepository<EcpComplianceTracker, UUID> {
}
