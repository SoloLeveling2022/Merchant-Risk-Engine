package com.hasnika.insurance.platformops.repository;

import com.hasnika.insurance.platformops.entity.AuditLog;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface AuditLogRepository extends ReactiveCrudRepository<AuditLog, String> {
    Flux<AuditLog> findByEntityIdOrderByEventTimestampDesc(String entityId);
    Flux<AuditLog> findByEventTypeOrderByEventTimestampDesc(String eventType);
    Flux<AuditLog> findByActorIdOrderByEventTimestampDesc(String actorId);
    Flux<AuditLog> findByCorrelationId(String correlationId);
}
