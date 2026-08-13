# Merchant Risk Engine - System Architecture Blueprint

## 1. Domain Service Mapping
The platform consists of 7 Spring Boot 3.4 microservices orchestrated via reactive Eureka discovery and WebFlux Netty event loops:

```
                    +---------------------------+
                    |    API Gateway (8080)     |
                    | (Header Stripping, JWT,   |
                    |   Redis Rate Limiter)     |
                    +-------------+-------------+
                                  |
    +---------------+-------------+-------------+---------------+
    |               |                           |               |
+---v---+       +---v---+                   +---v---+       +---v---+
| M-ID  |       | M-VEL |                   | R-UND |       | D-SET |
| (8084)|       | (8081)|                   | (8082)|       | (8083)|
+-------+       +-------+                   +-------+       +-------+
                    |                           |               |
                    +-------------+-------------+---------------+
                                  |
                            +-----v-----+
                            | P-OPS     |
                            | (8085)    |
                            +-----------+
```

1. **`api-gateway` (Port 8080)**: WebFlux gateway with Redis rate limiting, JWT relay, and CVE-2025-41235 header sanitization.
2. **`eureka-server` (Port 8761)**: Service discovery registry.
3. **`merchant-identity-service` (Port 8084)**: KYB onboarding, merchant entity registry, RSA asymmetric JWT issuance with JWKS.
4. **`merchant-velocity-service` (Port 8081)**: Real-time telemetry ingestion, Visa VAMP (150 bps threshold, Enumeration 20%), Mastercard lagged CTR, anomaly scoring, SSE alert broadcast.
5. **`reserve-underwriting-service` (Port 8082)**: Dynamic rolling reserve tranches, Adyen MPL exposure calculations, 5-state operational escalation machine, FIFO drawdown coordination.
6. **`dispute-settlement-service` (Port 8083)**: Zero-sum double-entry ledger, 4-tier FIFO waterfall, 24h post-payout bust-out detection, Visa CE 3.0 / RDR arbitration.
7. **`platform-ops-service` (Port 8085)**: Acquirer portfolio VAMP monitoring (50 bps / 70 bps), Mastercard ECP graduation tracker, manual analyst overrides, multiplexed control-tower SSE.
