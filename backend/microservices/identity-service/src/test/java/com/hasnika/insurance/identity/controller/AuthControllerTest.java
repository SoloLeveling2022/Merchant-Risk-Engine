package com.hasnika.insurance.identity.controller;

import com.hasnika.insurance.identity.dto.AuthResponse;
import com.hasnika.insurance.identity.dto.LoginRequest;
import com.hasnika.insurance.identity.dto.RegisterRequest;
import com.hasnika.insurance.identity.entity.KycRecord;
import com.hasnika.insurance.identity.service.AuthService;
import com.hasnika.insurance.identity.service.KycService;
import com.hasnika.insurance.identity.dto.KycSubmitRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import org.springframework.test.context.ContextConfiguration;

@WebFluxTest(controllers = {AuthController.class, KycController.class}, excludeAutoConfiguration = {ReactiveSecurityAutoConfiguration.class})
@ContextConfiguration(classes = {AuthController.class, KycController.class})
public class AuthControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private AuthService authService;

    @MockBean
    private KycService kycService;

    @Test
    void shouldReturn201OnSuccessfulRegistration() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@gmail.com");
        request.setPassword("password123");
        request.setFirstName("Test");

        AuthResponse mockResponse = AuthResponse.builder()
                .accessToken("access")
                .refreshToken("refresh")
                .email("test@gmail.com")
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(Mono.just(mockResponse));

        webTestClient.post()
                .uri("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isCreated()
                .expectBody()
                .jsonPath("$.data.email").isEqualTo("test@gmail.com")
                .jsonPath("$.data.accessToken").isEqualTo("access");
    }

    @Test
    void shouldHandleInvalidAuthRequests() {
        RegisterRequest regReq = new RegisterRequest();
        webTestClient.post().uri("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).bodyValue(regReq).exchange().expectStatus().isBadRequest();
        
        LoginRequest logReq = new LoginRequest();
        webTestClient.post().uri("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).bodyValue(logReq).exchange().expectStatus().isBadRequest();
    }

    @Test
    void shouldReturn200OnSuccessfulLogin() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@gmail.com");
        request.setPassword("password123");

        AuthResponse mockResponse = AuthResponse.builder()
                .accessToken("access")
                .email("test@gmail.com")
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(Mono.just(mockResponse));

        webTestClient.post()
                .uri("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.data.email").isEqualTo("test@gmail.com")
                .jsonPath("$.data.accessToken").isEqualTo("access");
    }



    @Test
    void shouldRefreshSuccessfully() {
        AuthResponse mockResponse = AuthResponse.builder()
                .accessToken("new-access")
                .email("test@gmail.com")
                .build();

        when(authService.refresh(anyString())).thenReturn(Mono.just(mockResponse));

        webTestClient.post()
                .uri("/api/v1/auth/refresh")
                .header("X-Refresh-Token", "valid-refresh-token")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.data.accessToken").isEqualTo("new-access");
    }

    @Test
    void shouldHandleKycLifecycle() {
        KycRecord mockRecord = KycRecord.builder().kycId("k1").userId("u1").build();
        when(kycService.getKycRecord(anyString())).thenReturn(Mono.just(mockRecord));
        when(kycService.getPendingKycRecords()).thenReturn(Mono.just(java.util.List.of(mockRecord)));
        when(kycService.getAllKycRecords()).thenReturn(Mono.just(java.util.List.of(mockRecord)));
        when(kycService.submitPan(anyString(), anyString())).thenReturn(Mono.just(mockRecord));
        when(kycService.approveKyc(anyString())).thenReturn(Mono.just(mockRecord));
        when(kycService.rejectKyc(anyString(), any())).thenReturn(Mono.just(mockRecord));

        webTestClient.get().uri("/api/v1/auth/kyc/status").header("X-User-Id", "u1").exchange().expectStatus().isOk();
        webTestClient.get().uri("/api/v1/auth/kyc/pending").exchange().expectStatus().isOk();
        webTestClient.get().uri("/api/v1/auth/kyc/all").exchange().expectStatus().isOk();

        KycSubmitRequest req = KycSubmitRequest.builder().panNumber("PAN123").build();
        webTestClient.post().uri("/api/v1/auth/kyc/submit").header("X-User-Id", "u1").bodyValue(req).exchange().expectStatus().isOk();
        webTestClient.post().uri("/api/v1/auth/kyc/approve/u1").exchange().expectStatus().isOk();
        webTestClient.post().uri("/api/v1/auth/kyc/reject/u1").bodyValue(java.util.Map.of("reason", "test")).exchange().expectStatus().isOk();
        webTestClient.post().uri("/api/v1/auth/kyc/reject/u1").exchange().expectStatus().isOk();
    }
}
