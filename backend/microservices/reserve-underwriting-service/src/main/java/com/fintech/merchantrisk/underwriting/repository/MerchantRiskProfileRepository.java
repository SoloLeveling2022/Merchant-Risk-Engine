package com.fintech.merchantrisk.underwriting.repository;

import com.fintech.merchantrisk.underwriting.entity.MerchantRiskProfile;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MerchantRiskProfileRepository extends ReactiveCrudRepository<MerchantRiskProfile, UUID> {
}
