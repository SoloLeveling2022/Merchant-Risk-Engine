package com.hasnika.insurance.core.repository;

import com.hasnika.insurance.core.entity.Policy;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface PolicyRepository extends R2dbcRepository<Policy, String> {
    Flux<Policy> findByUserId(String userId);
    Flux<Policy> findByPortfolioId(String portfolioId);
    Flux<Policy> findByPolicyStatus(String policyStatus);
}
