package com.hasnika.insurance.platformops.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuditEvent {

    @Builder.Default
    private String auditId = UUID.randomUUID().toString();

    private String eventType;
    private String eventSource;
    private String actorId;
    private String actorRole;
    private String entityType;
    private String entityId;
    private String actionPerformed;
    private Object previousState;
    private Object newState;
    private Object eventMetadata;
    private String ipAddress;
    private String correlationId;

    @Builder.Default
    private Instant eventTimestamp = Instant.now();
}
