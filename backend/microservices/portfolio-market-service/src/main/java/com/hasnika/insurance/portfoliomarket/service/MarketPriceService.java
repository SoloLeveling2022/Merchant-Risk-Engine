package com.hasnika.insurance.portfoliomarket.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarketPriceService {

    private final SyntheticPriceGenerator priceGenerator;
    private final Map<String, BigDecimal> currentPrices = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        currentPrices.put("AAPL", new BigDecimal("150.00"));
        currentPrices.put("MSFT", new BigDecimal("300.00"));
        currentPrices.put("TSLA", new BigDecimal("800.00"));
        currentPrices.put("RELIANCE", new BigDecimal("2500.00"));
        currentPrices.put("TCS", new BigDecimal("3500.00"));
        currentPrices.put("HDFCBANK", new BigDecimal("1600.00"));
        currentPrices.put("NVDA", new BigDecimal("450.00"));
    }

    public Mono<BigDecimal> getCurrentPrice(String symbol) {
        BigDecimal current = currentPrices.getOrDefault(symbol, new BigDecimal("100.00"));
        SyntheticPriceGenerator.ScenarioParams params = priceGenerator.getScenarioParams("BULL_MARKET");
        BigDecimal nextPrice = priceGenerator.nextPrice(current, params.driftMu(), params.volatilitySigma());
        currentPrices.put(symbol, nextPrice);
        return Mono.just(nextPrice);
    }
}
