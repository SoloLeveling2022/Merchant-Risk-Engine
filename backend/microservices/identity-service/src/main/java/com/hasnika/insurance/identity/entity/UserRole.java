package com.hasnika.insurance.identity.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Table;
import java.time.Instant;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Table("user_roles")
public class UserRole implements Persistable<String> {

    @Id
    private String userRoleId;
    private String userId;
    private String roleId;
    private Instant assignedAt;
    private String  assignedBy;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return userRoleId; }

    @Override
    public boolean isNew() { return isNew; }
}
