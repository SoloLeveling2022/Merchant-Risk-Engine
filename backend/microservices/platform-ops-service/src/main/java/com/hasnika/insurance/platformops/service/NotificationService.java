package com.hasnika.insurance.platformops.service;

import com.hasnika.insurance.platformops.dto.NotificationEventDto;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NotificationService {

    private final Map<String, Sinks.Many<NotificationEventDto>> userSinks = new ConcurrentHashMap<>();

    public Flux<NotificationEventDto> streamNotifications(String userId) {
        Sinks.Many<NotificationEventDto> sink = userSinks.computeIfAbsent(userId, 
                id -> Sinks.many().multicast().onBackpressureBuffer());
        return sink.asFlux();
    }

    public void sendNotification(String userId, NotificationEventDto event) {
        Sinks.Many<NotificationEventDto> sink = userSinks.get(userId);
        if (sink != null) {
            sink.tryEmitNext(event);
        }
    }

    public void broadcastNotification(NotificationEventDto event) {
        userSinks.values().forEach(sink -> sink.tryEmitNext(event));
    }
}
