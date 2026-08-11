package com.hasnika.insurance.claimsfinance.repository;

import com.hasnika.insurance.claimsfinance.entity.Claim;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ClaimRepository extends R2dbcRepository<Claim, String> {
    Flux<Claim> findByUserId(String userId);
    Flux<Claim> findByClaimStatus(String claimStatus);
}
