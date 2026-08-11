package com.hasnika.insurance.platformops.controller;

import com.hasnika.insurance.platformops.dto.AuditEvent;
import com.hasnika.insurance.platformops.service.AuditService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;

@WebFluxTest(controllers = AuditController.class, excludeAutoConfiguration = {ReactiveSecurityAutoConfiguration.class})
public class AuditControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private AuditService auditService;

    @Test
    void shouldLogEvent() {
        AuditEvent event = new AuditEvent();
        event.setEventType("TEST_EVENT");

        doNothing().when(auditService).onAuditEvent(any(AuditEvent.class));

        webTestClient.post()
                .uri("/api/v1/audit/log")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(event)
                .exchange()
                .expectStatus().isOk();
    }

    @Test
    void shouldHandleEmptyEvent() {
        AuditEvent event = new AuditEvent();

        doNothing().when(auditService).onAuditEvent(any(AuditEvent.class));

        webTestClient.post()
                .uri("/api/v1/audit/log")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(event)
                .exchange()
                .expectStatus().isOk();
    }
}
