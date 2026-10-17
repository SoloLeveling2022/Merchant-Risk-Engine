package com.fintech.merchantrisk.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .cors(cors -> {})
                .authorizeExchange(exchanges -> exchanges
                        .pathMatchers("/api/v1/auth/**", "/api/v1/merchants/kyb", "/.well-known/jwks.json", "/actuator/**").permitAll()
                        .anyExchange().permitAll() // Token verification delegated to JwtRelayGlobalFilter
                )
                .build();
    }
}
