package com.hasnika.insurance.identity.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.annotation.Version;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table("users")
public class User implements Persistable<String> {

    @Id
    private String  userId;
    private String  email;
    private String  passwordHash;
    private String  firstName;
    private String  lastName;
    private String  phoneNumber;
    private boolean isActive;
    private boolean isEmailVerified;

    @Column("kyc_status")
    @Builder.Default
    private String kycStatus = "NOT_SUBMITTED";

    private Instant createdAt;
    private Instant updatedAt;
    private String  createdBy;
    private String  updatedBy;

    @Version
    private Long version;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return userId; }

    @Override
    public boolean isNew() { return isNew || version == null; }
}
