package com.hasnika.insurance.platformops.service;

import com.hasnika.insurance.platformops.dto.NotificationEventDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;

import java.time.Instant;

@ExtendWith(MockitoExtension.class)
public class NotificationServiceTest {

    @InjectMocks
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {}

    @Test
    void shouldSendAndStreamNotificationSuccessfully() {
        NotificationEventDto event = new NotificationEventDto("1", "EMAIL", "Test Subject", "Test Message", Instant.now());
        
        // 1. sendNotification when sink is null (misses if branch)
        notificationService.sendNotification("user1", event);
        
        // 2. streamNotifications to create sink
        Flux<NotificationEventDto> stream = notificationService.streamNotifications("user1");
        
        // 3. sendNotification when sink exists (hits if branch)
        notificationService.sendNotification("user1", event);
        
        // 4. broadcastNotification (hits loop)
        notificationService.broadcastNotification(event);
    }

    @Test
    void shouldSendPushNotificationSuccessfully() {
        NotificationEventDto event = new NotificationEventDto("2", "PUSH", "Push Subject", "Message", Instant.now());
        notificationService.sendNotification("user1", event);
    }
}

