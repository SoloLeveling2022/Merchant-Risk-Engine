package com.hasnika.insurance.claimsfinance.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("transactions")
public class Transaction implements Persistable<String> {
    @Id
    private String transactionId;
    private String userId;
    private String policyId;
    private BigDecimal amount;
    private String transactionType;
    private String status;
    private Instant createdAt;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public String getId() { return transactionId; }

    @Override
    public boolean isNew() { return isNew; }
}
