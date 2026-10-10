package com.fintech.merchantrisk.platformops.controller;

import com.fintech.merchantrisk.platformops.dto.ControlTowerAlertDto;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;
import reactor.util.concurrent.Queues;

import java.time.Duration;

@RestController
public class ControlTowerSseController {

    private final Sinks.Many<ControlTowerAlertDto> alertSink =
            Sinks.many().multicast().onBackpressureBuffer(Queues.SMALL_BUFFER_SIZE, false);

    @GetMapping(value = "/api/v1/ops/stream/control-tower", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<ControlTowerAlertDto>> streamControlTower() {
        Flux<ServerSentEvent<ControlTowerAlertDto>> alerts = alertSink.asFlux()
                .map(a -> ServerSentEvent.<ControlTowerAlertDto>builder()
                        .id(a.alertId().toString())
                        .event("control-tower-alert")
                        .data(a)
                        .build());

        Flux<ServerSentEvent<ControlTowerAlertDto>> heartbeats = Flux.interval(Duration.ofSeconds(15))
                .map(i -> ServerSentEvent.<ControlTowerAlertDto>builder()
                        .comment("heartbeat")
                        .build());

        return Flux.merge(alerts, heartbeats);
    }
}
