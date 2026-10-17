package com.fintech.merchantrisk.gateway.filter;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Key resolver for Redis-backed distributed rate limiting, keyed by verified merchant ID.
 */
@Component
public class MerchantKeyResolver implements KeyResolver {

    @Override
    public Mono<String> resolve(ServerWebExchange exchange) {
        String merchantId = exchange.getRequest().getHeaders().getFirst("X-Merchant-Id");
        if (merchantId != null && !merchantId.isBlank()) {
            return Mono.just(merchantId);
        }
        return Mono.justOrEmpty(exchange.getRequest().getRemoteAddress())
                .map(addr -> addr.getAddress().getHostAddress())
                .defaultIfEmpty("anonymous");
    }
}
