package com.hasnika.insurance.identity.repository;

import com.hasnika.insurance.identity.entity.KycRecord;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Flux;

@Repository
public interface KycRecordRepository extends R2dbcRepository<KycRecord, String> {
    Mono<KycRecord> findByUserId(String userId);
    Flux<KycRecord> findByKycStatus(String kycStatus);
}
