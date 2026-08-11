package com.hasnika.insurance.core.repository;

import com.hasnika.insurance.core.entity.Quote;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuoteRepository extends R2dbcRepository<Quote, String> {
}
