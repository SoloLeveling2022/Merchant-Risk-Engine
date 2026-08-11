package com.hasnika.insurance.apigateway.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Injects a unique X-Correlation-Id into every request for distributed tracing.
 */
@Slf4j
@Component
public class CorrelationIdFilter implements GlobalFilter, Ordered {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

    @Override
    public int getOrder() {
        return -200; // Execute before JWT filter
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String correlationId = exchange.getRequest().getHeaders()
                .getFirst(CORRELATION_ID_HEADER);

        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        final String finalCorrelationId = correlationId;
        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header(CORRELATION_ID_HEADER, finalCorrelationId)
                .build();

        log.debug("CorrelationId={} assigned to request path={}", finalCorrelationId,
                exchange.getRequest().getURI().getPath());

        exchange.getResponse().beforeCommit(() -> {
            exchange.getResponse().getHeaders()
                    .add(CORRELATION_ID_HEADER, finalCorrelationId);
            return Mono.empty();
        });

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }
}
