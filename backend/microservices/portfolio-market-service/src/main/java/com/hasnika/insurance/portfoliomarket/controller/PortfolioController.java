package com.hasnika.insurance.portfoliomarket.controller;

import jakarta.validation.Valid;
import com.hasnika.insurance.portfoliomarket.dto.HoldingInput;
import com.hasnika.insurance.portfoliomarket.dto.UpdatePortfolioRequest;
import com.hasnika.insurance.portfoliomarket.entity.Portfolio;
import com.hasnika.insurance.portfoliomarket.entity.PortfolioHolding;
import com.hasnika.insurance.portfoliomarket.service.PortfolioImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v1/portfolios")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioImportService portfolioImportService;

    @PostMapping("/upload/manual")
    public Mono<ResponseEntity<Portfolio>> importManual(
            @RequestParam("userId") String userId,
            @RequestParam("portfolioName") String portfolioName,
            @RequestBody List<HoldingInput> holdings) {
        
        return portfolioImportService.importManual(userId, portfolioName, holdings)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.badRequest().build());
    }

    @GetMapping("/user/{userId}")
    public Mono<ResponseEntity<List<Portfolio>>> getUserPortfolios(@PathVariable("userId") String userId) {
        return portfolioImportService.getUserPortfolios(userId)
                .map(ResponseEntity::ok);
    }

    @GetMapping("/{portfolioId}")
    public Mono<ResponseEntity<Portfolio>> getPortfolioById(@PathVariable("portfolioId") String portfolioId) {
        return portfolioImportService.getPortfolioById(portfolioId)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @GetMapping("/{portfolioId}/holdings")
    public Mono<ResponseEntity<List<PortfolioHolding>>> getPortfolioHoldings(@PathVariable("portfolioId") String portfolioId) {
        return portfolioImportService.getPortfolioHoldings(portfolioId)
                .map(ResponseEntity::ok);
    }

    @GetMapping("/all")
    public Mono<ResponseEntity<List<Portfolio>>> getAllPortfolios() {
        return portfolioImportService.getAllPortfolios()
                .map(ResponseEntity::ok);
    }

    @PostMapping("/{userId}/{portfolioName}/import/csv")
    public Mono<ResponseEntity<Portfolio>> importCsv(
            @PathVariable("userId") String userId,
            @PathVariable("portfolioName") String portfolioName,
            @RequestPart("file") FilePart filePart) {
        
        String decodedName;
        try {
            decodedName = java.net.URLDecoder.decode(portfolioName, java.nio.charset.StandardCharsets.UTF_8.name());
        } catch (Exception e) {
            decodedName = portfolioName;
        }

        final String finalPortfolioName = decodedName;

        return org.springframework.core.io.buffer.DataBufferUtils.join(filePart.content())
                .flatMap(dataBuffer -> {
                    byte[] bytes = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(bytes);
                    org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);
                    return portfolioImportService.importFromCsv(userId, finalPortfolioName, bytes);
                })
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.badRequest().build());
    }

    @PutMapping("/{portfolioId}")
    public Mono<ResponseEntity<Portfolio>> updatePortfolio(
            @PathVariable("portfolioId") String portfolioId,
            @Valid @RequestBody UpdatePortfolioRequest request) {
        
        return portfolioImportService.updatePortfolio(portfolioId, request.portfolioName(), request.holdings())
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PutMapping("/{portfolioId}/holdings")
    public Mono<ResponseEntity<Portfolio>> updateHoldings(
            @PathVariable("portfolioId") String portfolioId,
            @RequestBody List<HoldingInput> holdings) {
        
        return portfolioImportService.updatePortfolio(portfolioId, null, holdings)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping("/{portfolioId}/simulate-market")
    public Mono<ResponseEntity<Portfolio>> simulateMarket(@PathVariable("portfolioId") String portfolioId) {
        return portfolioImportService.simulateMarket(portfolioId)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}
