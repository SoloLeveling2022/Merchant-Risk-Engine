package com.fintech.merchantrisk.identity.security;

import io.jsonwebtoken.Jwts;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Component
public class MerchantJwtProvider {

    private KeyPair keyPair;
    private static final String KEY_ID = "mre-rsa-key-1";

    @PostConstruct
    public void init() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            this.keyPair = generator.generateKeyPair();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Failed to generate RSA key pair", e);
        }
    }

    public String generateToken(UUID merchantId, String mid, String mcc, String role, String email) {
        Instant now = Instant.now();
        Instant expiry = now.plus(24, ChronoUnit.HOURS);

        return Jwts.builder()
                .header().keyId(KEY_ID).and()
                .subject(email)
                .claim("merchant_id", merchantId.toString())
                .claim("mid", mid)
                .claim("mcc", mcc)
                .claim("roles", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(keyPair.getPrivate(), Jwts.SIG.RS256)
                .compact();
    }

    public Map<String, Object> getJwks() {
        RSAPublicKey publicKey = (RSAPublicKey) keyPair.getPublic();
        String n = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey.getModulus().toByteArray());
        String e = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey.getPublicExponent().toByteArray());

        Map<String, Object> jwk = Map.of(
                "kty", "RSA",
                "use", "sig",
                "alg", "RS256",
                "kid", KEY_ID,
                "n", n,
                "e", e
        );

        return Map.of("keys", java.util.List.of(jwk));
    }
}
