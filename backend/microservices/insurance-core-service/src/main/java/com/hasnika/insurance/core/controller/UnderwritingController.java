package com.hasnika.insurance.core.controller;

import jakarta.validation.Valid;
import com.hasnika.insurance.core.dto.QuoteRequest;
import com.hasnika.insurance.core.dto.QuoteResponse;
import com.hasnika.insurance.core.service.UnderwritingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/underwriting")
@Slf4j
@RequiredArgsConstructor
public class UnderwritingController {

    private final UnderwritingService underwritingService;

    @PostMapping("/quote")
    public Mono<ResponseEntity<QuoteResponse>> getQuote(@Valid @RequestBody QuoteRequest request) {
        log.info("Request quote for portfolio: {}", request.getPortfolioId());
        return underwritingService.generateQuote(request)
                .map(ResponseEntity::ok);
    }
}
