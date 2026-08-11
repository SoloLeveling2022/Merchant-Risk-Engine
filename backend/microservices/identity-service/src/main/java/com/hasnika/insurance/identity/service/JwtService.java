package com.hasnika.insurance.identity.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * JWT generation and validation service.
 */
@Slf4j
@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiry-ms}")
    private long expiryMs;

    @Value("${app.jwt.refresh-expiry-ms}")
    private long refreshExpiryMs;

    @Value("${app.jwt.issuer}")
    private String issuer;

    public String generateAccessToken(String userId, String email, List<String> roles) {
        return Jwts.builder()
                .issuer(issuer)
                .subject(userId)
                .claim("email", email)
                .claim("roles", String.join(",", roles))
                .claim("jti", UUID.randomUUID().toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiryMs))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    public String generateRefreshToken(String userId) {
        return Jwts.builder()
                .issuer(issuer)
                .subject(userId)
                .claim("type", "REFRESH")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpiryMs))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    public Claims validateAndExtractClaims(String token) {
        return Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUserId(String token) {
        return validateAndExtractClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            validateAndExtractClaims(token);
            return true;
        } catch (Exception e) {
            log.warn("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }
}
