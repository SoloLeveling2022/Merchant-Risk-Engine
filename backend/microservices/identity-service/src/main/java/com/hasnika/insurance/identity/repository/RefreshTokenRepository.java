package com.hasnika.insurance.identity.repository;

import com.hasnika.insurance.identity.entity.RefreshToken;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
public interface RefreshTokenRepository extends ReactiveCrudRepository<RefreshToken, String> {
    Mono<RefreshToken> findByTokenHashAndIsRevokedFalse(String tokenHash);
}
