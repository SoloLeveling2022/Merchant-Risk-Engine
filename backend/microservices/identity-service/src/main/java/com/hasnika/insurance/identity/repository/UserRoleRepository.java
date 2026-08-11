package com.hasnika.insurance.identity.repository;

import com.hasnika.insurance.identity.entity.UserRole;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface UserRoleRepository extends R2dbcRepository<UserRole, String> {

    Flux<UserRole> findByUserId(String userId);

    Mono<Boolean> existsByUserIdAndRoleId(String userId, String roleId);

    @Query("SELECT r.role_name FROM roles r " +
           "JOIN user_roles ur ON r.role_id = ur.role_id " +
           "WHERE ur.user_id = :userId")
    Flux<String> findRoleNamesByUserId(String userId);
}
