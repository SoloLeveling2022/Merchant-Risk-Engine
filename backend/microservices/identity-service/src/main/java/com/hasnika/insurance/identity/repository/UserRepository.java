package com.hasnika.insurance.identity.repository;

import com.hasnika.insurance.identity.entity.User;
import org.springframework.data.r2dbc.repository.Modifying;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
public interface UserRepository extends R2dbcRepository<User, String> {
    Mono<User> findByEmail(String email);
    Mono<Boolean> existsByEmail(String email);

    @Modifying
    @Query("UPDATE users SET kyc_status = :status WHERE user_id = :userId")
    Mono<Integer> updateKycStatus(String userId, String status);

    @Query("SELECT DISTINCT u.* FROM users u " +
           "INNER JOIN user_roles ur ON u.user_id = ur.user_id " +
           "INNER JOIN roles r ON ur.role_id = r.role_id " +
           "WHERE r.role_name = 'ROLE_INVESTOR'")
    reactor.core.publisher.Flux<User> findAllInvestors();
}
