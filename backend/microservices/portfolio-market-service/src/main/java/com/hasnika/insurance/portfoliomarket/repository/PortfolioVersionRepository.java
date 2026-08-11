package com.hasnika.insurance.portfoliomarket.repository;

import com.hasnika.insurance.portfoliomarket.entity.PortfolioVersion;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface PortfolioVersionRepository extends R2dbcRepository<PortfolioVersion, String> {
    Flux<PortfolioVersion> findByPortfolioId(String portfolioId);
}
