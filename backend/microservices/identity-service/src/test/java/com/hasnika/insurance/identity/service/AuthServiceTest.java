package com.hasnika.insurance.identity.service;

import com.hasnika.insurance.identity.dto.AuthResponse;
import com.hasnika.insurance.identity.dto.LoginRequest;
import com.hasnika.insurance.identity.dto.RegisterRequest;
import com.hasnika.insurance.identity.entity.Role;
import com.hasnika.insurance.identity.entity.User;
import com.hasnika.insurance.identity.entity.UserRole;
import com.hasnika.insurance.identity.entity.RefreshToken;
import com.hasnika.insurance.identity.exception.BusinessRuleException;
import com.hasnika.insurance.identity.repository.RefreshTokenRepository;
import com.hasnika.insurance.identity.repository.RoleRepository;
import com.hasnika.insurance.identity.repository.UserRepository;
import com.hasnika.insurance.identity.repository.UserRoleRepository;
import com.hasnika.insurance.identity.repository.KycRecordRepository;
import com.hasnika.insurance.identity.config.SecurityConfig;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;
import java.util.UUID;
import java.util.List;
import com.hasnika.insurance.identity.entity.KycRecord;
import com.hasnika.insurance.identity.dto.KycStatus;
import org.springframework.security.config.web.server.ServerHttpSecurity;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private KycRecordRepository kycRecordRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private WebClient.Builder webClientBuilder;

    @Mock
    private WebClient webClient;

    @Mock
    private WebClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private WebClient.RequestBodySpec requestBodySpec;

    @Mock
    private WebClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    @InjectMocks
    private AuthService authService;

    private User mockUser;
    private Role mockRole;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .userId(UUID.randomUUID().toString())
                .email("test@gmail.com")
                .passwordHash("hashedpassword")
                .firstName("Test")
                .lastName("User")
                .isActive(true)
                .build();

        mockRole = Role.builder()
                .roleId("role-1")
                .roleName("ROLE_INVESTOR")
                .build();
    }

    @Test
    void shouldRegisterNewUserSuccessfully() {
        // Arrange
        RegisterRequest request = new RegisterRequest();
        request.setEmail("newuser@gmail.com");
        request.setPassword("password123");
        request.setFirstName("New");
        request.setLastName("User");
        request.setRole("ROLE_INVESTOR");

        when(userRepository.existsByEmail(anyString())).thenReturn(Mono.just(false));
        when(passwordEncoder.encode(anyString())).thenReturn("hashedpassword");
        when(userRepository.save(any(User.class))).thenReturn(Mono.just(mockUser));
        when(roleRepository.findByRoleName(anyString())).thenReturn(Mono.just(mockRole));
        when(userRoleRepository.save(any(UserRole.class))).thenReturn(Mono.just(new UserRole()));
        when(jwtService.generateAccessToken(anyString(), anyString(), any())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(anyString())).thenReturn("refresh-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(Mono.just(new RefreshToken()));

        // Mock WebClient chain for audit log
        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(Void.class)).thenReturn(Mono.empty());

        // Act
        Mono<AuthResponse> responseMono = authService.register(request);

        // Assert
        StepVerifier.create(responseMono)
                .expectNextMatches(response -> 
                        response.getAccessToken().equals("access-token") &&
                        response.getRefreshToken().equals("refresh-token") &&
                        response.getEmail().equals(mockUser.getEmail()))
                .verifyComplete();
    }

    @Test
    void shouldThrowExceptionWhenRegisteringExistingEmail() {
        // Arrange
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@gmail.com");

        when(userRepository.existsByEmail("test@gmail.com")).thenReturn(Mono.just(true));

        // Act
        Mono<AuthResponse> responseMono = authService.register(request);

        // Assert
        StepVerifier.create(responseMono)
                .expectErrorMatches(throwable -> 
                        throwable instanceof BusinessRuleException &&
                        throwable.getMessage().contains("already registered"))
                .verify();
    }

    @Test
    void shouldAuthenticateValidUser() {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setEmail("test@gmail.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("test@gmail.com")).thenReturn(Mono.just(mockUser));
        when(passwordEncoder.matches("password123", "hashedpassword")).thenReturn(true);
        when(userRoleRepository.findRoleNamesByUserId(mockUser.getUserId())).thenReturn(Flux.just("ROLE_INVESTOR"));
        when(jwtService.generateAccessToken(anyString(), anyString(), any())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(anyString())).thenReturn("refresh-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(Mono.just(new RefreshToken()));

        // Act
        Mono<AuthResponse> responseMono = authService.login(request);

        // Assert
        StepVerifier.create(responseMono)
                .expectNextMatches(response -> 
                        response.getAccessToken().equals("access-token") &&
                        response.getEmail().equals("test@gmail.com") &&
                        response.getRoles().contains("ROLE_INVESTOR"))
                .verifyComplete();
    }

    @Test
    void shouldHandleKycService() {
        KycService kycService = new KycService(kycRecordRepository, userRepository, webClientBuilder);
        KycRecord mockRecord = KycRecord.builder().kycId("k1").userId("u1").build();
        User mUser = User.builder().userId("u2").email("u@a.com").build();
        User admin = User.builder().userId("u3").email("admin@gmail.com").build();

        // submitPan
        when(kycRecordRepository.findByUserId("u1")).thenReturn(Mono.just(mockRecord));
        when(kycRecordRepository.save(any())).thenReturn(Mono.just(mockRecord));
        when(userRepository.updateKycStatus(anyString(), anyString())).thenReturn(Mono.just(1));
        
        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(Void.class)).thenReturn(Mono.empty());

        StepVerifier.create(kycService.submitPan("u1", "ABCDE1234F")).expectNextCount(1).verifyComplete();
        StepVerifier.create(kycService.submitPan("u1", "invalid")).expectNextCount(1).verifyComplete(); // rejection path

        // approve/reject
        StepVerifier.create(kycService.approveKyc("u1")).expectNextCount(1).verifyComplete();
        StepVerifier.create(kycService.rejectKyc("u1", "reason")).expectNextCount(1).verifyComplete();
        StepVerifier.create(kycService.rejectKyc("u1", null)).expectNextCount(1).verifyComplete();

        // getKycRecord
        lenient().when(userRepository.findById(anyString())).thenReturn(Mono.just(mUser));
        when(kycRecordRepository.findByUserId("u2")).thenReturn(Mono.empty());
        StepVerifier.create(kycService.getKycRecord("u1")).expectNextCount(1).verifyComplete();
        StepVerifier.create(kycService.getKycRecord("u2")).expectNextCount(1).verifyComplete();
        
        lenient().when(userRepository.findById("u4")).thenReturn(Mono.empty());
        when(kycRecordRepository.findByUserId("u4")).thenReturn(Mono.empty());
        StepVerifier.create(kycService.getKycRecord("u4")).expectNextCount(1).verifyComplete();

        // getAllKycRecords
        when(kycRecordRepository.findAll()).thenReturn(Flux.just(mockRecord));
        when(userRepository.findAllInvestors()).thenReturn(Flux.just(mUser, admin));
        StepVerifier.create(kycService.getAllKycRecords()).expectNextMatches(list -> list.size() == 2).verifyComplete();

        // getPendingKycRecords
        when(kycRecordRepository.findByKycStatus(anyString())).thenReturn(Flux.just(mockRecord));
        StepVerifier.create(kycService.getPendingKycRecords()).expectNextCount(1).verifyComplete();
        
        // submitPan empty pan
        when(kycRecordRepository.findByUserId("u3")).thenReturn(Mono.empty());
        when(kycRecordRepository.save(any())).thenReturn(Mono.just(mockRecord));
        StepVerifier.create(kycService.submitPan("u3", null)).expectNextCount(1).verifyComplete();
    }

    @Test
    void shouldHandleJwtAndSecurity() {
        JwtService jwtSvc = new JwtService();
        ReflectionTestUtils.setField(jwtSvc, "secret", "my-super-secret-key-for-jwt-signing-that-is-long-enough");
        ReflectionTestUtils.setField(jwtSvc, "expiryMs", 3600000L);
        ReflectionTestUtils.setField(jwtSvc, "refreshExpiryMs", 7200000L);
        ReflectionTestUtils.setField(jwtSvc, "issuer", "hasnika-insurance");

        String token = jwtSvc.generateAccessToken("u1", "email", List.of("ROLE_USER"));
        String refToken = jwtSvc.generateRefreshToken("u1");

        org.junit.jupiter.api.Assertions.assertTrue(jwtSvc.isTokenValid(token));
        org.junit.jupiter.api.Assertions.assertFalse(jwtSvc.isTokenValid("invalid"));
        org.junit.jupiter.api.Assertions.assertEquals("u1", jwtSvc.extractUserId(token));

        SecurityConfig sc = new SecurityConfig();
        org.junit.jupiter.api.Assertions.assertNotNull(sc.passwordEncoder());
        org.junit.jupiter.api.Assertions.assertNotNull(sc.springSecurityFilterChain(ServerHttpSecurity.http()));
    }

    @Test
    void shouldHandleAuthServiceEdgeCasesAndSeeding() {
        // getAllUsers
        when(userRepository.findAllInvestors()).thenReturn(Flux.just(mockUser));
        StepVerifier.create(authService.getAllUsers()).expectNextMatches(l -> l.size() == 1).verifyComplete();

        // login failure (inactive)
        User inactiveUser = User.builder().userId("i1").email("i@i.com").passwordHash("hash").isActive(false).build();
        when(userRepository.findByEmail("i@i.com")).thenReturn(Mono.just(inactiveUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        StepVerifier.create(authService.login(new LoginRequest("i@i.com", "hash"))).expectError(BusinessRuleException.class).verify();

        // login infer role
        User noRoleUser = User.builder().userId("n1").email("admin@test.com").passwordHash("hash").isActive(true).build();
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Mono.just(noRoleUser));
        when(userRoleRepository.findRoleNamesByUserId("n1")).thenReturn(Flux.empty());
        when(jwtService.generateAccessToken(anyString(), anyString(), any())).thenReturn("access");
        when(jwtService.generateRefreshToken(anyString())).thenReturn("refresh");
        when(refreshTokenRepository.save(any())).thenReturn(Mono.just(new RefreshToken()));
        StepVerifier.create(authService.login(new LoginRequest("admin@test.com", "hash"))).expectNextCount(1).verifyComplete();

        // refresh success
        RefreshToken validRt = RefreshToken.builder().userId("n1").expiresAt(Instant.now().plusSeconds(100)).build();
        RefreshToken expRt = RefreshToken.builder().userId("n1").expiresAt(Instant.now().minusSeconds(100)).build();
        when(refreshTokenRepository.findByTokenHashAndIsRevokedFalse(anyString())).thenAnswer(inv -> {
            String hash = inv.getArgument(0);
            if (hash.equals(org.springframework.test.util.ReflectionTestUtils.invokeMethod(authService, "hashToken", "exp"))) {
                return Mono.just(expRt);
            }
            return Mono.just(validRt);
        });
        when(userRepository.findById("n1")).thenReturn(Mono.just(noRoleUser));
        StepVerifier.create(authService.refresh("some-token")).expectNextCount(1).verifyComplete();

        // refresh expired
        StepVerifier.create(authService.refresh("exp")).expectError(BusinessRuleException.class).verify();

        // seedDemoUsers
        when(roleRepository.findByRoleName(anyString())).thenReturn(Mono.empty());
        when(roleRepository.save(any())).thenReturn(Mono.just(mockRole));
        when(userRepository.findByEmail(anyString())).thenReturn(Mono.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(userRepository.save(any())).thenReturn(Mono.just(mockUser));
        when(userRoleRepository.save(any())).thenReturn(Mono.just(new UserRole()));
        StepVerifier.create(authService.seedDemoUsers()).expectNextCount(1).verifyComplete();

        // seedDemoUsers exists
        when(userRepository.findByEmail("underwriter@gmail.com")).thenReturn(Mono.just(mockUser));
        when(roleRepository.findByRoleName(anyString())).thenReturn(Mono.just(mockRole));
        when(userRoleRepository.existsByUserIdAndRoleId(anyString(), anyString())).thenReturn(Mono.just(false));
        StepVerifier.create(authService.seedDemoUsers()).expectNextCount(1).verifyComplete();
    }
}
