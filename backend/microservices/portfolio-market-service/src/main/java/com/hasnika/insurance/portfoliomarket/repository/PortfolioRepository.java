package com.hasnika.insurance.portfoliomarket.repository;

import com.hasnika.insurance.portfoliomarket.entity.Portfolio;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface PortfolioRepository extends R2dbcRepository<Portfolio, String> {
    Flux<Portfolio> findByUserId(String userId);
}
