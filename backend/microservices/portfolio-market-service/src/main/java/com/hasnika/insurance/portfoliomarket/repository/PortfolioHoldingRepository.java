package com.hasnika.insurance.portfoliomarket.repository;

import com.hasnika.insurance.portfoliomarket.entity.PortfolioHolding;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface PortfolioHoldingRepository extends R2dbcRepository<PortfolioHolding, String> {
    Flux<PortfolioHolding> findByPortfolioId(String portfolioId);
}
