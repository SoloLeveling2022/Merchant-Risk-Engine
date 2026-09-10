package com.fintech.merchantrisk.underwriting.repository;

import com.fintech.merchantrisk.underwriting.entity.UnderwritingAuditLog;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UnderwritingAuditLogRepository extends ReactiveCrudRepository<UnderwritingAuditLog, UUID> {
}
