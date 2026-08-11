package com.hasnika.insurance.platformops.dto;

import java.time.Instant;

public record NotificationEventDto(String id, String type, String title, String message, Instant timestamp) {}
