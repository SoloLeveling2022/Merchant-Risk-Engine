package com.hasnika.insurance.portfoliomarket.service;


import com.hasnika.insurance.portfoliomarket.dto.HoldingInput;
import com.hasnika.insurance.portfoliomarket.entity.Portfolio;
import com.hasnika.insurance.portfoliomarket.entity.PortfolioHolding;
import com.hasnika.insurance.portfoliomarket.entity.PortfolioVersion;
import com.hasnika.insurance.portfoliomarket.repository.PortfolioHoldingRepository;
import com.hasnika.insurance.portfoliomarket.repository.PortfolioRepository;
import com.hasnika.insurance.portfoliomarket.repository.PortfolioVersionRepository;
import com.opencsv.CSVReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/**
 * Portfolio Service — handles CSV/Excel upload, manual entry, update, and change detection.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioImportService {

    private final PortfolioRepository        portfolioRepository;
    private final PortfolioHoldingRepository holdingRepository;
    private final PortfolioVersionRepository versionRepository;
    private final WebClient.Builder          webClientBuilder;

    public Mono<List<Portfolio>> getUserPortfolios(String userId) {
        return portfolioRepository.findByUserId(userId).collectList();
    }

    public Mono<Portfolio> getPortfolioById(String portfolioId) {
        return portfolioRepository.findById(portfolioId);
    }

    public Mono<List<PortfolioHolding>> getPortfolioHoldings(String portfolioId) {
        return holdingRepository.findByPortfolioId(portfolioId)
                .filter(h -> Boolean.TRUE.equals(h.getIsActive()))
                .collectList();
    }

    public Mono<List<Portfolio>> getAllPortfolios() {
        return portfolioRepository.findAll().collectList();
    }

    public Mono<Portfolio> importFromCsv(String userId, String portfolioName, byte[] csvData) {
        return Mono.fromCallable(() -> parseCsv(csvData))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(holdings -> createOrUpdatePortfolio(userId, portfolioName, holdings, "CSV_IMPORT"));
    }

    private List<HoldingInput> parseCsv(byte[] data) throws Exception {
        List<HoldingInput> holdings = new ArrayList<>();
        String content = new String(data, java.nio.charset.StandardCharsets.UTF_8).replace("\uFEFF", "");

        try (CSVReader reader = new CSVReader(new StringReader(content))) {
            String[] line;
            boolean firstLine = true;
            while ((line = reader.readNext()) != null) {
                if (firstLine) {
                    firstLine = false;
                    if (line[0].toLowerCase().contains("symbol")) continue;
                }
                if (line.length >= 3 && !line[0].isBlank()) {
                    String symbol = line[0].trim().toUpperCase();
                    BigDecimal qty = new BigDecimal(line[1].trim());
                    BigDecimal avgPrice = new BigDecimal(line[2].trim());
                    holdings.add(new HoldingInput(symbol, qty, avgPrice));
                }
            }
        }
        return holdings;
    }

    public Mono<Portfolio> importManual(String userId, String portfolioName, List<HoldingInput> holdings) {
        return createOrUpdatePortfolio(userId, portfolioName, holdings, "MANUAL_ENTRY");
    }

    public Mono<Portfolio> updatePortfolio(String portfolioId, String newName, List<HoldingInput> holdings) {
        return portfolioRepository.findById(portfolioId)
                .flatMap(portfolio -> {
                    if (newName != null && !newName.isBlank()) {
                        portfolio.setPortfolioName(newName);
                    }
                    
                    Mono<List<PortfolioHolding>> updateHoldingsMono;
                    if (holdings != null && !holdings.isEmpty()) {
                        updateHoldingsMono = holdingRepository.findByPortfolioId(portfolioId)
                                .collectList()
                                .flatMap(existingHoldings -> {
                                    Map<String, PortfolioHolding> existingMap = new HashMap<>();
                                    for (PortfolioHolding h : existingHoldings) {
                                        existingMap.put(h.getSymbol().toUpperCase(), h);
                                    }

                                    List<PortfolioHolding> toSave = new ArrayList<>();
                                    Set<String> updatedSymbols = new HashSet<>();

                                    for (HoldingInput input : holdings) {
                                        String sym = input.symbol().toUpperCase();
                                        updatedSymbols.add(sym);
                                        if (existingMap.containsKey(sym)) {
                                            PortfolioHolding h = existingMap.get(sym);
                                            h.setQuantity(input.quantity());
                                            h.setAveragePrice(input.averagePrice());
                                            h.setUpdatedAt(Instant.now());
                                            h.setNew(false);
                                            toSave.add(h);
                                        } else {
                                            PortfolioHolding nh = PortfolioHolding.builder()
                                                    .holdingId(UUID.randomUUID().toString())
                                                    .portfolioId(portfolioId)
                                                    .symbol(sym)
                                                    .quantity(input.quantity())
                                                    .averagePrice(input.averagePrice())
                                                    .assetClass("EQUITY")
                                                    .isActive(true)
                                                    .createdAt(Instant.now())
                                                    .updatedAt(Instant.now())
                                                    .createdBy(portfolio.getUserId())
                                                    .isNew(true)
                                                    .build();
                                            toSave.add(nh);
                                        }
                                    }

                                    List<PortfolioHolding> toDelete = new ArrayList<>();
                                    for (PortfolioHolding h : existingHoldings) {
                                        if (!updatedSymbols.contains(h.getSymbol().toUpperCase())) {
                                            toDelete.add(h);
                                        }
                                    }

                                    return holdingRepository.deleteAll(toDelete)
                                            .then(holdingRepository.saveAll(toSave).collectList());
                                });
                    } else {
                        updateHoldingsMono = holdingRepository.findByPortfolioId(portfolioId).collectList();
                    }

                    return updateHoldingsMono.flatMap(savedHoldings -> {
                        BigDecimal totalVal = savedHoldings.stream()
                                .filter(h -> Boolean.TRUE.equals(h.getIsActive()))
                                .map(h -> h.getQuantity().multiply(h.getAveragePrice()))
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                        portfolio.setTotalValue(totalVal);
                        portfolio.setUpdatedAt(Instant.now());
                        portfolio.setNew(false);
                        return portfolioRepository.save(portfolio);
                    })
                    .flatMap(savedPortfolio -> {
                        return webClientBuilder.baseUrl("http://localhost:8083/api/v1").build()
                                .post()
                                .uri("/policies/re-underwrite/portfolio/{id}", savedPortfolio.getPortfolioId())
                                .retrieve()
                                .bodyToMono(Void.class)
                                .onErrorResume(e -> {
                                    log.error("Failed to trigger re-underwrite for edited portfolio {}", savedPortfolio.getPortfolioId(), e);
                                    return Mono.empty();
                                })
                                .thenReturn(savedPortfolio);
                    });
                });
    }

    private Mono<Portfolio> createOrUpdatePortfolio(String userId, String portfolioName,
                                                     List<HoldingInput> inputs, String importType) {
        BigDecimal totalVal = inputs.stream()
                .map(h -> h.quantity().multiply(h.averagePrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return portfolioRepository.findByUserId(userId)
                .filter(p -> p.getPortfolioName().equalsIgnoreCase(portfolioName))
                .next()
                .flatMap(existing -> {
                    existing.setTotalValue(totalVal);
                    existing.setLastRevaluedAt(Instant.now());
                    existing.setUpdatedAt(Instant.now());
                    existing.setNew(false);
                    return portfolioRepository.save(existing)
                            .flatMap(p -> saveHoldingsAndVersion(p, inputs));
                })
                .switchIfEmpty(Mono.defer(() -> {
                    Portfolio newP = Portfolio.builder()
                            .portfolioId(UUID.randomUUID().toString())
                            .userId(userId)
                            .portfolioName(portfolioName)
                            .portfolioStatus("ACTIVE")
                            .currency("INR")
                            .totalValue(totalVal)
                            .lastRevaluedAt(Instant.now())
                            .createdAt(Instant.now())
                            .createdBy(userId)
                            .updatedAt(Instant.now())
                            .updatedBy(userId)
                            .isNew(true)
                            .build();

                    return portfolioRepository.save(newP)
                            .flatMap(p -> saveHoldingsAndVersion(p, inputs));
                }));
    }

    private Mono<Portfolio> saveHoldingsAndVersion(Portfolio portfolio, List<HoldingInput> inputs) {
        List<PortfolioHolding> holdings = inputs.stream()
                .map(in -> PortfolioHolding.builder()
                        .holdingId(UUID.randomUUID().toString())
                        .portfolioId(portfolio.getPortfolioId())
                        .symbol(in.symbol())
                        .quantity(in.quantity())
                        .averagePrice(in.averagePrice())
                        .assetClass("EQUITY")
                        .isActive(true)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .createdBy(portfolio.getUserId())
                        .isNew(true)
                        .build())
                .toList();

        PortfolioVersion pv = PortfolioVersion.builder()
                .versionId(UUID.randomUUID().toString())
                .portfolioId(portfolio.getPortfolioId())
                .totalValue(portfolio.getTotalValue())
                .versionTimestamp(Instant.now())
                .isNew(true)
                .build();

        return holdingRepository.saveAll(holdings).then()
                .then(versionRepository.save(pv))
                .doOnSuccess(v -> {
                    Map<String, Object> event = Map.of(
                            "eventType", "PORTFOLIO_IMPORTED",
                            "portfolioId", portfolio.getPortfolioId(),
                            "userId", portfolio.getUserId(),
                            "totalValue", portfolio.getTotalValue(),
                            "holdingCount", inputs.size(),
                            "eventId", UUID.randomUUID().toString()
                    );
                    webClientBuilder.build().post().uri("http://localhost:8085/api/v1/audit/log")
                            .bodyValue(event).retrieve().bodyToMono(Void.class)
                            .onErrorResume(e -> Mono.empty()).subscribe();
                })
                .thenReturn(portfolio);
    }

    public Mono<Portfolio> simulateMarket(String portfolioId) {
        return portfolioRepository.findById(portfolioId)
                .flatMap(portfolio -> holdingRepository.findByPortfolioId(portfolioId)
                        .collectList()
                        .flatMap(holdings -> {
                            Random rand = new Random();
                            return Flux.fromIterable(holdings)
                                    .flatMap(h -> {
                                        double fluctuation = (rand.nextDouble() * 0.80) - 0.40;
                                        BigDecimal change = BigDecimal.valueOf(1 + fluctuation);
                                        BigDecimal newPrice = h.getAveragePrice().multiply(change).setScale(4, java.math.RoundingMode.HALF_UP);
                                        h.setAveragePrice(newPrice);
                                        h.setNew(false);
                                        return holdingRepository.save(h);
                                    })
                                    .collectList();
                        })
                        .flatMap(savedHoldings -> {
                            BigDecimal totalValue = savedHoldings.stream()
                                    .map(sh -> sh.getQuantity().multiply(sh.getAveragePrice()))
                                    .reduce(BigDecimal.ZERO, BigDecimal::add);

                            portfolio.setTotalValue(totalValue);
                            portfolio.setLastRevaluedAt(Instant.now());
                            portfolio.setNew(false);
                            return portfolioRepository.save(portfolio);
                        })
                        .flatMap(saved -> {
                            return webClientBuilder.baseUrl("http://localhost:8083/api/v1").build()
                                    .post()
                                    .uri("/policies/re-underwrite/portfolio/{id}", saved.getPortfolioId())
                                    .retrieve()
                                    .bodyToMono(Void.class)
                                    .onErrorResume(e -> {
                                        log.error("Failed to trigger re-underwrite for portfolio {}", saved.getPortfolioId(), e);
                                        return Mono.empty();
                                    })
                                    .thenReturn(saved);
                        })
                );
    }
}
