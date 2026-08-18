package com.fintech.merchantrisk.identity.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("merchant_entities")
public class MerchantEntity {

    @Id
    @Column("merchant_id")
    private UUID merchantId;

    @Column("mid")
    private String mid;

    @Column("legal_name")
    private String legalName;

    @Column("mcc")
    private String mcc;

    @Column("billing_descriptor_prefix")
    private String billingDescriptorPrefix;

    @Column("kyb_status")
    private String kybStatus;

    @Column("ubo_identity_hash")
    private String uboIdentityHash;

    @Column("onboarded_at")
    private Instant onboardedAt;

    @Version
    @Column("version")
    private Long version;
}
