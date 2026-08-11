package com.hasnika.insurance.identity.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("kyc_records")
public class KycRecord implements Persistable<String> {
    @Id
    private String kycId;
    private String userId;
    private String kycStatus;
    private Boolean autoApproved;
    private String panNumber;
    private Boolean panValid;
    private String reviewNotes;
    private Instant reviewedAt;
    private String reviewedBy;
    private Instant createdAt;
    private String createdBy;
    private Instant updatedAt;
    private String updatedBy;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return kycId; }

    @Override
    public boolean isNew() { return isNew; }
}
