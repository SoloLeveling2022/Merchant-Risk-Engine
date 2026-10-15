package com.fintech.merchantrisk.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Strips client-supplied internal security headers to prevent proxy header spoofing (CVE-2025-41235).
 * Operates at HIGHEST_PRECEDENCE before any downstream routing or authentication filter.
 */
@Component
public class HeaderSanitizationFilter implements GlobalFilter, Ordered {

    private static final String[] UNTRUSTED_HEADERS = {
            "X-Merchant-Id",
            "X-User-Roles",
            "X-User-Id",
            "X-Risk-Tier"
    };

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest.Builder requestBuilder = exchange.getRequest().mutate();
        for (String header : UNTRUSTED_HEADERS) {
            requestBuilder.headers(headers -> headers.remove(header));
        }
        return chain.filter(exchange.mutate().request(requestBuilder.build()).build());
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
