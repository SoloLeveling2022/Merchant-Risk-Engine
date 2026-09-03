package com.fintech.merchantrisk.velocity.config;

import com.fintech.merchantrisk.velocity.dto.VelocityAlertDto;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;
import reactor.util.concurrent.Queues;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * High-throughput, non-auto-cancelling SSE Sink for velocity alerts.
 * Uses autoCancel = false to prevent closing the sink when the last subscriber disconnects,
 * merged with a 15-second keepalive heartbeat comment frame.
 */
@Configuration
public class SseConfig {

    private final Sinks.Many<VelocityAlertDto> alertSink =
            Sinks.many().multicast().onBackpressureBuffer(Queues.SMALL_BUFFER_SIZE, false);

    private final ConcurrentHashMap<UUID, Sinks.Many<VelocityAlertDto>> merchantSinks = new ConcurrentHashMap<>();

    public void broadcastAlert(VelocityAlertDto alert) {
        alertSink.tryEmitNext(alert);
        Sinks.Many<VelocityAlertDto> mSink = merchantSinks.get(alert.merchantId());
        if (mSink != null) {
            mSink.tryEmitNext(alert);
        }
    }

    public Flux<ServerSentEvent<VelocityAlertDto>> getMerchantStream(UUID merchantId) {
        Sinks.Many<VelocityAlertDto> sink = merchantSinks.computeIfAbsent(
                merchantId,
                id -> Sinks.many().multicast().onBackpressureBuffer(Queues.SMALL_BUFFER_SIZE, false)
        );

        Flux<ServerSentEvent<VelocityAlertDto>> alertFlux = sink.asFlux()
                .map(alert -> ServerSentEvent.<VelocityAlertDto>builder()
                        .id(alert.alertId().toString())
                        .event("velocity-alert")
                        .data(alert)
                        .build());

        Flux<ServerSentEvent<VelocityAlertDto>> heartbeatFlux = Flux.interval(Duration.ofSeconds(15))
                .map(seq -> ServerSentEvent.<VelocityAlertDto>builder()
                        .comment("heartbeat")
                        .build());

        return Flux.merge(alertFlux, heartbeatFlux)
                .doOnCancel(() -> {
                    // Cleanup can be performed if needed
                });
    }
}
