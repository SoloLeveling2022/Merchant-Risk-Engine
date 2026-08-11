package com.hasnika.insurance.identity.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Table("roles")
public class Role implements Persistable<String> {
    @Id
    private String  roleId;
    private String  roleName;
    private String  description;
    private Instant createdAt;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return roleId; }

    @Override
    public boolean isNew() { return isNew; }
}
