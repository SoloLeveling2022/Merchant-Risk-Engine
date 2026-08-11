package com.hasnika.insurance.identity.service;

import com.hasnika.insurance.identity.dto.AuthResponse;
import com.hasnika.insurance.identity.dto.LoginRequest;
import com.hasnika.insurance.identity.dto.RegisterRequest;
import com.hasnika.insurance.identity.entity.RefreshToken;
import com.hasnika.insurance.identity.entity.Role;
import com.hasnika.insurance.identity.entity.User;
import com.hasnika.insurance.identity.entity.UserRole;
import com.hasnika.insurance.identity.repository.RefreshTokenRepository;
import com.hasnika.insurance.identity.repository.RoleRepository;
import com.hasnika.insurance.identity.repository.UserRepository;
import com.hasnika.insurance.identity.repository.UserRoleRepository;
import com.hasnika.insurance.identity.exception.BusinessRuleException;
import com.hasnika.insurance.identity.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * Core authentication service.
 * Handles registration, login, and token refresh.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository         userRepository;
    private final RoleRepository         roleRepository;
    private final UserRoleRepository     userRoleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService             jwtService;
    private final PasswordEncoder        passwordEncoder;
    private final WebClient.Builder      webClientBuilder;

    public Mono<List<User>> getAllUsers() {
        return userRepository.findAllInvestors().collectList();
    }

    public Mono<AuthResponse> register(RegisterRequest request) {
        return userRepository.existsByEmail(request.getEmail())
                .flatMap(exists -> {
                    if (exists) {
                        return Mono.error(new BusinessRuleException("EMAIL_ALREADY_EXISTS",
                                "Email " + request.getEmail() + " is already registered"));
                    }

                    String fName = request.getFirstName();
                    String lName = request.getLastName();
                    if ((fName == null || fName.isBlank()) && request.getFullName() != null && !request.getFullName().isBlank()) {
                        String[] parts = request.getFullName().trim().split("\\s+", 2);
                        fName = parts[0];
                        lName = parts.length > 1 ? parts[1] : "";
                    }
                    if (fName == null || fName.isBlank()) fName = "User";
                    if (lName == null) lName = "";

                    String userId = UUID.randomUUID().toString();
                    User user = User.builder()
                            .userId(userId)
                            .email(request.getEmail())
                            .passwordHash(passwordEncoder.encode(request.getPassword()))
                            .firstName(fName)
                            .lastName(lName)
                            .phoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber() : "")
                            .isActive(true)
                            .isEmailVerified(false)
                            .kycStatus("NOT_SUBMITTED")
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .createdBy("SYSTEM")
                            .updatedBy("SYSTEM")
                            .isNew(true)
                            .build();
                    return userRepository.save(user);
                })
                .flatMap(savedUser -> {
                    String assignedRoleName = (request.getRole() != null && !request.getRole().isBlank()) 
                            ? request.getRole() 
                            : "ROLE_INVESTOR";
                    return roleRepository.findByRoleName(assignedRoleName)
                            .switchIfEmpty(roleRepository.findByRoleName("ROLE_INVESTOR"))
                            .flatMap(role -> {
                                UserRole userRole = UserRole.builder()
                                        .userRoleId(UUID.randomUUID().toString())
                                        .userId(savedUser.getUserId())
                                        .roleId(role.getRoleId())
                                        .assignedAt(Instant.now())
                                        .assignedBy("SYSTEM")
                                        .isNew(true)
                                        .build();
                                return userRoleRepository.save(userRole)
                                        .flatMap(ur -> buildAuthResponse(savedUser, List.of(role.getRoleName())));
                            });
                })
                .doOnSuccess(authResp -> {
                    java.util.Map<String, Object> event = java.util.Map.of(
                            "eventType", "USER_REGISTERED",
                            "entityId", authResp.getUserId(),
                            "actorId", authResp.getUserId(),
                            "eventSource", "identity-service"
                    );
                    webClientBuilder.build().post().uri("http://localhost:8085/api/v1/audit/log")
                        .bodyValue(event).retrieve().bodyToMono(Void.class)
                        .onErrorResume(e -> Mono.empty()).subscribe();
                });
    }

    public Mono<AuthResponse> login(LoginRequest request) {
        return userRepository.findByEmail(request.getEmail())
                .switchIfEmpty(Mono.error(new BusinessRuleException("INVALID_CREDENTIALS", "Invalid email or password")))
                .flatMap(user -> {
                    if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                        return Mono.error(new BusinessRuleException("INVALID_CREDENTIALS", "Invalid email or password"));
                    }
                    if (!user.isActive()) {
                        return Mono.error(new BusinessRuleException("ACCOUNT_INACTIVE", "Account is deactivated"));
                    }
                    return userRoleRepository.findRoleNamesByUserId(user.getUserId())
                            .collectList()
                            .flatMap(roles -> {
                                if (roles == null || roles.isEmpty()) {
                                    roles = List.of(inferRoleFromEmail(user.getEmail()));
                                }
                                return buildAuthResponse(user, roles);
                            });
                });
    }

    public Mono<AuthResponse> refresh(String refreshToken) {
        String tokenHash = hashToken(refreshToken);
        return refreshTokenRepository.findByTokenHashAndIsRevokedFalse(tokenHash)
                .switchIfEmpty(Mono.error(new BusinessRuleException("INVALID_REFRESH_TOKEN", "Refresh token is invalid or revoked")))
                .flatMap(rt -> {
                    if (rt.getExpiresAt().isBefore(Instant.now())) {
                        return Mono.error(new BusinessRuleException("REFRESH_TOKEN_EXPIRED", "Refresh token has expired"));
                    }
                    return userRepository.findById(rt.getUserId())
                            .switchIfEmpty(Mono.error(new ResourceNotFoundException("User", rt.getUserId())))
                            .flatMap(user -> userRoleRepository.findRoleNamesByUserId(user.getUserId())
                                    .collectList()
                                    .flatMap(roles -> {
                                        if (roles == null || roles.isEmpty()) {
                                            roles = List.of(inferRoleFromEmail(user.getEmail()));
                                        }
                                        return buildAuthResponse(user, roles);
                                    }));
                });
    }

    private Mono<AuthResponse> buildAuthResponse(User user, List<String> roles) {
        if (roles == null || roles.isEmpty()) {
            roles = List.of(inferRoleFromEmail(user.getEmail()));
        }

        String accessToken  = jwtService.generateAccessToken(user.getUserId(), user.getEmail(), roles);
        String refreshToken = jwtService.generateRefreshToken(user.getUserId());

        RefreshToken rt = RefreshToken.builder()
                .tokenId(UUID.randomUUID().toString())
                .userId(user.getUserId())
                .tokenHash(hashToken(refreshToken))
                .expiresAt(Instant.now().plusMillis(604_800_000L))
                .isRevoked(false)
                .createdAt(Instant.now())
                .build();

        return refreshTokenRepository.save(rt)
                .thenReturn(AuthResponse.builder()
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .tokenType("Bearer")
                        .expiresIn(3600L)
                        .userId(user.getUserId())
                        .email(user.getEmail())
                        .fullName(user.getFirstName() + (user.getLastName() != null && !user.getLastName().isBlank() ? " " + user.getLastName() : ""))
                        .kycStatus(user.getKycStatus())
                        .roles(roles)
                        .build());
    }

    private String inferRoleFromEmail(String email) {
        if (email == null) return "ROLE_INVESTOR";
        String lower = email.toLowerCase();
        if (lower.contains("underwriter")) return "ROLE_UNDERWRITER";
        if (lower.contains("claims")) return "ROLE_CLAIMS_ANALYST";
        if (lower.contains("admin")) return "ROLE_ADMIN";
        if (lower.contains("compliance")) return "ROLE_COMPLIANCE";
        return "ROLE_INVESTOR";
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Token hashing failed", e);
        }
    }

    public Mono<List<String>> seedDemoUsers() {
        record SeedRole(String id, String name, String desc) {}
        List<SeedRole> rolesToSeed = List.of(
                new SeedRole("role-investor-000001",    "ROLE_INVESTOR",       "Portfolio investor purchasing insurance"),
                new SeedRole("role-underwriter-000002", "ROLE_UNDERWRITER",    "Underwriting and risk assessment analyst"),
                new SeedRole("role-claims-000003",      "ROLE_CLAIMS_ANALYST", "Claims processing and review analyst"),
                new SeedRole("role-admin-000004",       "ROLE_ADMIN",          "Platform administrator"),
                new SeedRole("role-compliance-000005",  "ROLE_COMPLIANCE",     "Compliance and audit officer")
        );

        Mono<Void> ensureRoles = reactor.core.publisher.Flux.fromIterable(rolesToSeed)
                .flatMap(r -> roleRepository.findByRoleName(r.name())
                        .switchIfEmpty(Mono.defer(() -> roleRepository.save(Role.builder()
                                .roleId(r.id())
                                .roleName(r.name())
                                .description(r.desc())
                                .createdAt(Instant.now())
                                .isNew(true)
                                .build()))
                        )
                ).then();

        record SeedUser(String email, String password, String firstName, String lastName, String roleName) {}
        List<SeedUser> seeds = List.of(
                new SeedUser("underwriter@gmail.com", "underwriter", "Demo", "Underwriter",   "ROLE_UNDERWRITER"),
                new SeedUser("claims@gmail.com",      "claims",      "Demo", "ClaimsAnalyst", "ROLE_CLAIMS_ANALYST"),
                new SeedUser("admin@gmail.com",       "admin",       "Demo", "Admin",         "ROLE_ADMIN"),
                new SeedUser("compliance@gmail.com",  "compliance",  "Demo", "Compliance",    "ROLE_COMPLIANCE")
        );

        return ensureRoles.thenMany(reactor.core.publisher.Flux.fromIterable(seeds))
                .flatMap(seed -> userRepository.findByEmail(seed.email())
                        .flatMap(existingUser -> {
                            existingUser.setPasswordHash(passwordEncoder.encode(seed.password()));
                            existingUser.setActive(true);
                            existingUser.setEmailVerified(true);
                            existingUser.setKycStatus("APPROVED");
                            existingUser.setNew(false);
                            return userRepository.save(existingUser)
                                    .flatMap(savedUser -> roleRepository.findByRoleName(seed.roleName())
                                            .flatMap(role -> userRoleRepository.existsByUserIdAndRoleId(savedUser.getUserId(), role.getRoleId())
                                                    .flatMap(hasRole -> {
                                                        if (hasRole) {
                                                            return Mono.just("UPDATED: " + seed.email());
                                                        }
                                                        UserRole ur = UserRole.builder()
                                                                .userRoleId(UUID.randomUUID().toString())
                                                                .userId(savedUser.getUserId())
                                                                .roleId(role.getRoleId())
                                                                .assignedAt(Instant.now())
                                                                .assignedBy("SYSTEM")
                                                                .isNew(true)
                                                                .build();
                                                        return userRoleRepository.save(ur).thenReturn("UPDATED & ROLE ASSIGNED: " + seed.email());
                                                    })
                                            )
                                    );
                        })
                        .switchIfEmpty(Mono.defer(() -> {
                            String userId = UUID.randomUUID().toString();
                            User user = User.builder()
                                    .userId(userId)
                                    .email(seed.email())
                                    .passwordHash(passwordEncoder.encode(seed.password()))
                                    .firstName(seed.firstName())
                                    .lastName(seed.lastName())
                                    .phoneNumber("")
                                    .isActive(true)
                                    .isEmailVerified(true)
                                    .kycStatus("APPROVED")
                                    .createdAt(Instant.now())
                                    .updatedAt(Instant.now())
                                    .createdBy("SYSTEM")
                                    .updatedBy("SYSTEM")
                                    .isNew(true)
                                    .build();

                            return userRepository.save(user)
                                    .flatMap(savedUser -> roleRepository.findByRoleName(seed.roleName())
                                            .flatMap(role -> {
                                                UserRole userRole = UserRole.builder()
                                                        .userRoleId(UUID.randomUUID().toString())
                                                        .userId(savedUser.getUserId())
                                                        .roleId(role.getRoleId())
                                                        .assignedAt(Instant.now())
                                                        .assignedBy("SYSTEM")
                                                        .isNew(true)
                                                        .build();
                                                return userRoleRepository.save(userRole)
                                                        .thenReturn("CREATED: " + seed.email() + " -> " + seed.roleName());
                                            })
                                    );
                        }))
                )
                .collectList();
    }
}
