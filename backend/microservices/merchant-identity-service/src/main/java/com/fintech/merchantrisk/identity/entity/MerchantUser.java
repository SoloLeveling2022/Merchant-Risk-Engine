package com.fintech.merchantrisk.identity.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("merchant_users")
public class MerchantUser {

    @Id
    @Column("id")
    private UUID id;

    @Column("merchant_id")
    private UUID merchantId;

    @Column("email")
    private String email;

    @Column("password_hash")
    private String passwordHash;

    @Column("role")
    private String role;

    @Column("enabled")
    private Boolean enabled;

    @Column("created_at")
    private Instant createdAt;
}
