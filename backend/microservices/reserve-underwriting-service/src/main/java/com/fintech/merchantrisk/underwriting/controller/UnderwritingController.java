package com.fintech.merchantrisk.underwriting.controller;

import com.fintech.merchantrisk.underwriting.dto.*;
import com.fintech.merchantrisk.underwriting.service.ReserveUnderwritingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.util.concurrent.Queues;

import java.time.Duration;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class UnderwritingController {

    private final ReserveUnderwritingService underwritingService;

    private final Sinks.Many<RiskTransitionEvent> alertSink =
            Sinks.many().multicast().onBackpressureBuffer(Queues.SMALL_BUFFER_SIZE, false);

    @PostMapping("/api/v1/underwriting/profiles")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<MerchantRiskProfileDto> createProfile(@RequestBody OnboardRiskProfileRequest request) {
        return underwritingService.onboardProfile(request);
    }

    @PostMapping("/api/v1/underwriting/merchants/{merchantId}/evaluate")
    public Mono<ReunderwritingDecisionDto> evaluateMerchant(
            @PathVariable UUID merchantId,
            @RequestBody VelocitySignalPayload signals
    ) {
        return underwritingService.evaluateMerchant(merchantId, signals);
    }

    @PostMapping("/api/v1/underwriting/tranches/lock")
    public Mono<ReserveTrancheDto> lockTranche(@RequestBody TrancheLockRequest request) {
        return underwritingService.lockTranche(request);
    }

    @PostMapping("/api/v1/underwriting/tranches/drawdown-fifo")
    public Mono<FifoDrawdownResult> drawdownFifo(@RequestBody FifoDrawdownRequest request) {
        return underwritingService.drawdownFifo(request);
    }

    @PostMapping("/api/v1/underwriting/tranches/release-matured")
    public Flux<ReserveTrancheDto> releaseMatured(@RequestBody(required = false) ReleaseRunRequest request) {
        LocalDate asOfDate = request != null && request.asOfDate() != null ? request.asOfDate() : LocalDate.now();
        return underwritingService.releaseMaturedTranches(asOfDate);
    }

    @GetMapping(value = "/api/v1/underwriting/stream/risk-alerts", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<RiskTransitionEvent>> streamAlerts() {
        Flux<ServerSentEvent<RiskTransitionEvent>> events = alertSink.asFlux()
                .map(event -> ServerSentEvent.<RiskTransitionEvent>builder()
                        .id(event.eventId().toString())
                        .event("risk-transition")
                        .data(event)
                        .build());

        Flux<ServerSentEvent<RiskTransitionEvent>> heartbeat = Flux.interval(Duration.ofSeconds(15))
                .map(i -> ServerSentEvent.<RiskTransitionEvent>builder().comment("heartbeat").build());

        return Flux.merge(events, heartbeat);
    }
}
