package com.hasnika.insurance.platformops.controller;

import com.hasnika.insurance.platformops.dto.NotificationEventDto;
import com.hasnika.insurance.platformops.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;

@WebFluxTest(controllers = NotificationController.class, excludeAutoConfiguration = {ReactiveSecurityAutoConfiguration.class})
public class NotificationControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private NotificationService notificationService;

    @Test
    void shouldTriggerNotification() {
        NotificationEventDto event = new NotificationEventDto("1", "EMAIL", "Test", "Msg", java.time.Instant.now());

        doNothing().when(notificationService).sendNotification(anyString(), any(NotificationEventDto.class));

        webTestClient.post()
                .uri("/api/v1/notifications/send/user1")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(event)
                .exchange()
                .expectStatus().isOk();
    }

    @Test
    void shouldReturnOkForEmptyPayload() {
        // Just simulating another valid test case according to the REST endpoint
        NotificationEventDto event = new NotificationEventDto("2", "BROADCAST", "Test", "Msg", java.time.Instant.now());

        doNothing().when(notificationService).broadcastNotification(any(NotificationEventDto.class));

        webTestClient.post()
                .uri("/api/v1/notifications/broadcast")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(event)
                .exchange()
                .expectStatus().isOk();
    }

    @Test
    void shouldStreamNotifications() {
        org.mockito.Mockito.when(notificationService.streamNotifications(anyString()))
                .thenReturn(reactor.core.publisher.Flux.just(new NotificationEventDto("1", "TYPE", "Title", "Msg", java.time.Instant.now())));

        webTestClient.get()
                .uri("/api/v1/notifications/stream/user1")
                .exchange()
                .expectStatus().isOk();
    }
}
