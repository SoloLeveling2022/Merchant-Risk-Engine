package com.fintech.merchantrisk.velocity.controller;

import com.fintech.merchantrisk.velocity.config.SseConfig;
import com.fintech.merchantrisk.velocity.dto.*;
import com.fintech.merchantrisk.velocity.service.VelocityIngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class VelocityStreamController {

    private final VelocityIngestionService velocityService;
    private final SseConfig sseConfig;

    @PostMapping("/api/v1/velocity/ingest")
    public Mono<VelocityIngestionAck> ingest(@RequestBody TransactionTelemetryRequest request) {
        return velocityService.ingestTelemetry(request);
    }

    @GetMapping("/api/v1/velocity/merchants/{merchantId}/ratios")
    public Mono<SchemeRatioReport> getRatios(@PathVariable UUID merchantId) {
        return velocityService.getRatios(merchantId);
    }

    @GetMapping(value = "/api/v1/velocity/stream/{merchantId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<VelocityAlertDto>> streamAlerts(@PathVariable UUID merchantId) {
        return sseConfig.getMerchantStream(merchantId);
    }
}
