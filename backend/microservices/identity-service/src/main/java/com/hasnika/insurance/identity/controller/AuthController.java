package com.hasnika.insurance.identity.controller;

import com.hasnika.insurance.identity.dto.AuthResponse;
import com.hasnika.insurance.identity.dto.LoginRequest;
import com.hasnika.insurance.identity.dto.RegisterRequest;
import com.hasnika.insurance.identity.entity.User;
import com.hasnika.insurance.identity.service.AuthService;
import com.hasnika.insurance.identity.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @GetMapping("/users")
    public Mono<ApiResponse<List<User>>> getAllUsers() {
        return authService.getAllUsers()
                .map(ApiResponse::ok);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registration request for email={}", request.getEmail());
        return authService.register(request)
                .map(ApiResponse::created);
    }

    @PostMapping("/login")
    public Mono<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login attempt for email={}", request.getEmail());
        return authService.login(request)
                .map(ApiResponse::ok);
    }

    @PostMapping("/refresh")
    public Mono<ApiResponse<AuthResponse>> refresh(@RequestHeader("X-Refresh-Token") String refreshToken) {
        return authService.refresh(refreshToken)
                .map(ApiResponse::ok);
    }

    @PostMapping("/seed-users")
    public Mono<ApiResponse<List<String>>> seedDemoUsers() {
        log.info("Seeding demo users for all roles");
        return authService.seedDemoUsers()
                .map(ApiResponse::ok);
    }
}
