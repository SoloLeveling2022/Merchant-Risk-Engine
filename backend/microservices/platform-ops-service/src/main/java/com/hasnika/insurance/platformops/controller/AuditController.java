package com.hasnika.insurance.platformops.controller;

import com.hasnika.insurance.platformops.service.AuditService;
import com.hasnika.insurance.platformops.dto.AuditEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @PostMapping("/log")
    public Mono<Void> logEvent(@RequestBody AuditEvent event) {
        auditService.onAuditEvent(event);
        return Mono.empty();
    }
}
