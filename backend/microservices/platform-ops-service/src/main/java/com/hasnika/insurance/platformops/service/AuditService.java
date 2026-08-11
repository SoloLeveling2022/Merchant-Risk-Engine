package com.hasnika.insurance.platformops.service;

import com.hasnika.insurance.platformops.entity.AuditLog;
import com.hasnika.insurance.platformops.repository.AuditLogRepository;
import com.hasnika.insurance.platformops.dto.AuditEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper        objectMapper;

    public void onAuditEvent(AuditEvent event) {
        log.debug("Audit event received: type={} entityId={}", event.getEventType(), event.getEntityId());
        persistAuditEvent(event)
                .subscribe(
                        saved -> log.debug("Audit log persisted: auditId={}", saved.getAuditId()),
                        error -> log.error("Failed to persist audit event: {}", error.getMessage())
                );
    }

    public Mono<AuditLog> persistAuditEvent(AuditEvent event) {
        try {
            String previousStateJson = event.getPreviousState() != null
                    ? objectMapper.writeValueAsString(event.getPreviousState()) : null;
            String newStateJson = event.getNewState() != null
                    ? objectMapper.writeValueAsString(event.getNewState()) : null;
            String metadataJson = event.getEventMetadata() != null
                    ? objectMapper.writeValueAsString(event.getEventMetadata()) : null;

            AuditLog log = AuditLog.builder()
                    .auditId(UUID.randomUUID().toString())
                    .eventType(event.getEventType())
                    .eventSource(event.getEventSource())
                    .actorId(event.getActorId())
                    .actorRole(event.getActorRole())
                    .entityType(event.getEntityType())
                    .entityId(event.getEntityId())
                    .actionPerformed(event.getActionPerformed())
                    .previousState(previousStateJson)
                    .newState(newStateJson)
                    .eventMetadata(metadataJson)
                    .ipAddress(event.getIpAddress())
                    .correlationId(event.getCorrelationId())
                    .eventTimestamp(event.getEventTimestamp() != null ? event.getEventTimestamp() : Instant.now())
                    .createdAt(Instant.now())
                    .build();

            return auditLogRepository.save(log);
        } catch (Exception e) {
            return Mono.error(new RuntimeException("Failed to serialize audit event", e));
        }
    }

    public Flux<AuditLog> getAuditLogsForEntity(String entityId) {
        return auditLogRepository.findByEntityIdOrderByEventTimestampDesc(entityId);
    }

    public Flux<AuditLog> getAuditLogsByEventType(String eventType) {
        return auditLogRepository.findByEventTypeOrderByEventTimestampDesc(eventType);
    }

    public Flux<AuditLog> getAuditLogsByActor(String actorId) {
        return auditLogRepository.findByActorIdOrderByEventTimestampDesc(actorId);
    }

    public Flux<AuditLog> getAuditLogsByCorrelationId(String correlationId) {
        return auditLogRepository.findByCorrelationId(correlationId);
    }
}
