package com.hasnika.insurance.platformops.controller;

import com.hasnika.insurance.platformops.dto.NotificationEventDto;
import com.hasnika.insurance.platformops.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping({"/api/v1/notifications", "/api/notifications"})
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping(value = "/stream/{userId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<NotificationEventDto> streamNotifications(@PathVariable String userId) {
        return notificationService.streamNotifications(userId);
    }

    @PostMapping("/send/{userId}")
    public void sendNotification(@PathVariable String userId, @RequestBody NotificationEventDto event) {
        notificationService.sendNotification(userId, event);
    }

    @PostMapping("/broadcast")
    public void broadcastNotification(@RequestBody NotificationEventDto event) {
        notificationService.broadcastNotification(event);
    }
}
