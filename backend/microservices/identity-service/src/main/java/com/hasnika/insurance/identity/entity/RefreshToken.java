package com.hasnika.insurance.identity.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Table;
import java.time.Instant;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Table("refresh_tokens")
public class RefreshToken implements Persistable<String> {
    @Id private String  tokenId;
    private String      userId;
    private String      tokenHash;
    private Instant     expiresAt;
    private boolean     isRevoked;
    private Instant     createdAt;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return tokenId; }

    @Override
    public boolean isNew() { return isNew; }
}
