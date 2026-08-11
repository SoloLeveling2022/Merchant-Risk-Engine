package com.hasnika.insurance.claimsfinance.repository;

import com.hasnika.insurance.claimsfinance.entity.Transaction;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface TransactionRepository extends R2dbcRepository<Transaction, String> {
    Flux<Transaction> findByPolicyId(String policyId);
    Flux<Transaction> findByUserId(String userId);
}
