package com.hasnika.insurance.platformops.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import org.springframework.data.domain.Persistable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("audit_logs")
public class AuditLog implements Persistable<String> {
    @Id
    private String auditId;
    private String eventType;
    private String eventSource;
    private String actorId;
    private String actorRole;
    private String entityType;
    private String entityId;
    private String actionPerformed;
    private String previousState;
    private String newState;
    private String eventMetadata;
    private String ipAddress;
    private String correlationId;
    private Instant eventTimestamp;
    private Instant createdAt;

    @org.springframework.data.annotation.Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return auditId; }

    @Override
    public boolean isNew() { return isNew; }
}
