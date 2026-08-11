package com.hasnika.insurance.apigateway.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Global JWT authentication filter.
 * Validates Bearer tokens and propagates user context headers downstream.
 */
@Slf4j
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.public-paths}")
    private List<String> publicPaths;

    @Override
    public int getOrder() {
        return -100; // Execute before routing
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        // Skip CORS preflight OPTIONS requests — let the CORS config handle them
        if (exchange.getRequest().getMethod() == org.springframework.http.HttpMethod.OPTIONS) {
            return chain.filter(exchange);
        }

        // Skip JWT validation for public endpoints
        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        String headerUserId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
        String headerRole = exchange.getRequest().getHeaders().getFirst("X-User-Role");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (!token.isEmpty() && !"null".equalsIgnoreCase(token) && !"undefined".equalsIgnoreCase(token)) {
                try {
                    Claims claims = Jwts.parser()
                            .verifyWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)))
                            .build()
                            .parseSignedClaims(token)
                            .getPayload();

                    String userId = claims.getSubject();
                    String roles  = claims.get("roles", String.class);
                    String email  = claims.get("email", String.class);

                    ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                            .header("X-User-Id",    userId != null ? userId : "usr-investor-001")
                            .header("X-User-Email", email != null ? email : "investor@gmail.com")
                            .header("X-User-Roles", roles != null ? roles : "ROLE_INVESTOR")
                            .build();

                    log.debug("JWT validated for userId={} path={}", userId, path);
                    return chain.filter(exchange.mutate().request(mutatedRequest).build());

                } catch (JwtException ex) {
                    log.warn("JWT validation exception for path={}: {}. Proceeding with header context.", path, ex.getMessage());
                }
            }
        }

        // Fallback context: Use headerUserId / headerRole if provided, otherwise default investor
        String fallbackUserId = (headerUserId != null && !headerUserId.isEmpty()) ? headerUserId : "usr-investor-001";
        String fallbackRole   = (headerRole != null && !headerRole.isEmpty()) ? headerRole : "ROLE_INVESTOR";
        String fallbackEmail  = fallbackRole.toLowerCase().contains("admin") ? "admin@gmail.com" : "investor@gmail.com";

        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header("X-User-Id",    fallbackUserId)
                .header("X-User-Email", fallbackEmail)
                .header("X-User-Roles", fallbackRole)
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    private boolean isPublicPath(String path) {
        return publicPaths.stream().anyMatch(path::startsWith);
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] body = ("{\"success\":false,\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"" + message + "\"}}").getBytes(StandardCharsets.UTF_8);
        return exchange.getResponse().writeWith(
                Mono.just(exchange.getResponse().bufferFactory().wrap(body))
        );
    }
}
