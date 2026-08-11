package com.hasnika.insurance.identity.repository;

import com.hasnika.insurance.identity.entity.Role;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
public interface RoleRepository extends R2dbcRepository<Role, String> {
    Mono<Role> findByRoleName(String roleName);
}
