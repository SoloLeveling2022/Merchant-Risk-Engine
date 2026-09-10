package com.fintech.merchantrisk.underwriting.repository;

import com.fintech.merchantrisk.underwriting.entity.ReserveTranche;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.UUID;

@Repository
public interface ReserveTrancheRepository extends ReactiveCrudRepository<ReserveTranche, UUID> {

    @Query("SELECT * FROM reserve_tranches " +
           "WHERE merchant_id = :merchantId " +
           "AND status IN ('MATURED_UNRELEASED', 'LOCKED') " +
           "AND remaining_amount > 0 " +
           "ORDER BY CASE WHEN status = 'MATURED_UNRELEASED' THEN 0 ELSE 1 END, capture_date ASC, id ASC")
    Flux<ReserveTranche> findEligibleTranchesForFifoDrawdown(UUID merchantId);

    @Query("SELECT * FROM reserve_tranches " +
           "WHERE maturity_date <= :asOfDate " +
           "AND status = 'LOCKED' " +
           "AND remaining_amount > 0")
    Flux<ReserveTranche> findMaturedTranches(LocalDate asOfDate);

    Mono<ReserveTranche> findByCaptureBatchRef(String captureBatchRef);
}
