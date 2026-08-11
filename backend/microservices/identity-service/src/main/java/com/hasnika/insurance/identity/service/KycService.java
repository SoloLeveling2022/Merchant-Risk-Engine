package com.hasnika.insurance.identity.service;

import com.hasnika.insurance.identity.dto.KycStatus;
import com.hasnika.insurance.identity.entity.KycRecord;
import com.hasnika.insurance.identity.repository.KycRecordRepository;
import com.hasnika.insurance.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Simplified KYC service - validates PAN format and auto-approves.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KycService {

    private final KycRecordRepository kycRecordRepository;
    private final UserRepository userRepository;
    private final WebClient.Builder   webClientBuilder;

    private static final Pattern PAN_PATTERN = Pattern.compile("^[A-Z]{5}[0-9]{4}[A-Z]{1}$");

    public Mono<KycRecord> submitPan(String userId, String panNumber) {
        return kycRecordRepository.findByUserId(userId)
                .switchIfEmpty(createNewKycRecord(userId))
                .flatMap(record -> {
                    boolean isValid = panNumber != null && PAN_PATTERN.matcher(panNumber).matches();
                    
                    record.setPanNumber(panNumber);
                    record.setPanValid(isValid);
                    record.setUpdatedAt(Instant.now());
                    record.setUpdatedBy(userId);
                    
                    if (isValid) {
                        record.setKycStatus(KycStatus.PENDING_VERIFICATION.name());
                        record.setAutoApproved(false);
                        record.setReviewNotes("KYC submission received. Pending Compliance Officer approval.");
                    } else {
                        record.setKycStatus(KycStatus.REJECTED.name());
                        record.setReviewNotes("Invalid PAN format");
                    }
                    
                    record.setNew(false);
                    return kycRecordRepository.save(record);
                })
                .flatMap(savedRecord -> {
                    if (KycStatus.REJECTED.name().equals(savedRecord.getKycStatus())) {
                        Map<String, Object> event = Map.of(
                                "eventType", "KYC_REJECTED",
                                "entityId", savedRecord.getKycId(),
                                "actorId", userId,
                                "eventSource", "kyc-service"
                        );
                        webClientBuilder.build().post().uri("http://localhost:8085/api/v1/audit/log")
                            .bodyValue(event).retrieve().bodyToMono(Void.class).onErrorResume(e -> Mono.empty()).subscribe();
                    }
                    
                    return userRepository.updateKycStatus(userId, savedRecord.getKycStatus())
                            .thenReturn(savedRecord);
                });
    }

    public Mono<KycRecord> approveKyc(String userId) {
        return kycRecordRepository.findByUserId(userId)
                .switchIfEmpty(createNewKycRecord(userId))
                .flatMap(record -> {
                    record.setKycStatus(KycStatus.APPROVED.name());
                    record.setReviewedAt(Instant.now());
                    record.setReviewedBy("COMPLIANCE_OFFICER");
                    record.setReviewNotes("KYC verified and approved by Compliance Officer.");
                    record.setNew(false);
                    return kycRecordRepository.save(record);
                })
                .flatMap(saved -> userRepository.updateKycStatus(userId, KycStatus.APPROVED.name()).thenReturn(saved));
    }

    public Mono<KycRecord> rejectKyc(String userId, String reason) {
        final String note = (reason != null && !reason.trim().isEmpty()) ? reason : "KYC application rejected by Compliance Officer.";
        return kycRecordRepository.findByUserId(userId)
                .switchIfEmpty(createNewKycRecord(userId))
                .flatMap(record -> {
                    record.setKycStatus(KycStatus.REJECTED.name());
                    record.setReviewedAt(Instant.now());
                    record.setReviewedBy("COMPLIANCE_OFFICER");
                    record.setReviewNotes(note);
                    record.setNew(false);
                    return kycRecordRepository.save(record);
                })
                .flatMap(saved -> userRepository.updateKycStatus(userId, KycStatus.REJECTED.name()).thenReturn(saved));
    }

    public Mono<List<KycRecord>> getAllKycRecords() {
        return userRepository.findAllInvestors()
                .collectList()
                .flatMap(investors -> {
                    List<String> investorIds = investors.stream().map(com.hasnika.insurance.identity.entity.User::getUserId).toList();
                    return kycRecordRepository.findAll()
                            .filter(r -> investorIds.contains(r.getUserId()))
                            .collectList()
                            .map(records -> {
                                for (var user : investors) {
                                    boolean hasRecord = records.stream().anyMatch(r -> r.getUserId().equals(user.getUserId()));
                                    if (!hasRecord) {
                                        records.add(KycRecord.builder()
                                                .kycId(UUID.randomUUID().toString())
                                                .userId(user.getUserId())
                                                .kycStatus(user.getKycStatus() != null ? user.getKycStatus() : KycStatus.NOT_SUBMITTED.name())
                                                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt() : Instant.now())
                                                .reviewNotes("Registered user - awaiting KYC submission")
                                                .build());
                                    }
                                }
                                return records;
                            });
                });
    }

    public Mono<KycRecord> getKycRecord(String userId) {
        return kycRecordRepository.findByUserId(userId)
                .switchIfEmpty(userRepository.findById(userId)
                        .map(user -> KycRecord.builder()
                                .userId(userId)
                                .kycStatus(user.getKycStatus() != null ? user.getKycStatus() : KycStatus.NOT_SUBMITTED.name())
                                .build())
                        .switchIfEmpty(Mono.just(KycRecord.builder()
                                .userId(userId)
                                .kycStatus(KycStatus.NOT_SUBMITTED.name())
                                .build())));
    }

    public Mono<List<KycRecord>> getPendingKycRecords() {
        return kycRecordRepository.findByKycStatus(KycStatus.PENDING_VERIFICATION.name())
                .collectList();
    }

    private Mono<KycRecord> createNewKycRecord(String userId) {
        KycRecord record = KycRecord.builder()
                .kycId(UUID.randomUUID().toString())
                .userId(userId)
                .kycStatus(KycStatus.SUBMITTED.name())
                .autoApproved(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .createdBy(userId)
                .updatedBy(userId)
                .build();
        return kycRecordRepository.save(record);
    }
}
