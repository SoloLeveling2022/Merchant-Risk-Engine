package com.fintech.merchantrisk.velocity.service;

import com.fintech.merchantrisk.velocity.config.SseConfig;
import com.fintech.merchantrisk.velocity.dto.*;
import com.fintech.merchantrisk.velocity.entity.MerchantVelocitySnapshot;
import com.fintech.merchantrisk.velocity.entity.TransactionTelemetryEvent;
import com.fintech.merchantrisk.velocity.repository.MerchantVelocitySnapshotRepository;
import com.fintech.merchantrisk.velocity.repository.TransactionTelemetryEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VelocityIngestionService {

    private final TransactionTelemetryEventRepository telemetryRepository;
    private final MerchantVelocitySnapshotRepository snapshotRepository;
    private final VelocityAnomalyEngine anomalyEngine;
    private final SseConfig sseConfig;

    @Transactional
    public Mono<VelocityIngestionAck> ingestTelemetry(TransactionTelemetryRequest req) {
        return telemetryRepository.findByIdempotencyKey(req.idempotencyKey())
                .map(existing -> new VelocityIngestionAck(
                        existing.getId(),
                        existing.getIdempotencyKey(),
                        existing.getMerchantId(),
                        "ALREADY_PROCESSED",
                        List.of(),
                        existing.getOccurredAt()
                ))
                .switchIfEmpty(Mono.defer(() -> {
                    TransactionTelemetryEvent event = TransactionTelemetryEvent.builder()
                            .idempotencyKey(req.idempotencyKey())
                            .merchantId(req.merchantId())
                            .cardNetwork(req.cardNetwork())
                            .eventType(req.eventType())
                            .amount(req.amount())
                            .currency(req.currency() != null ? req.currency() : "USD")
                            .isCnp(req.isCnp() != null ? req.isCnp() : true)
                            .isEnumeratedPattern(req.isEnumeratedPattern() != null ? req.isEnumeratedPattern() : false)
                            .deviceFingerprintHash(req.deviceFingerprintHash())
                            .clientIp(req.clientIp())
                            .occurredAt(req.occurredAt() != null ? req.occurredAt() : Instant.now())
                            .build();

                    return telemetryRepository.save(event)
                            .flatMap(savedEvent -> updateSnapshotAndCheckAnomalies(savedEvent));
                }));
    }

    private Mono<VelocityIngestionAck> updateSnapshotAndCheckAnomalies(TransactionTelemetryEvent event) {
        LocalDate today = LocalDate.now();
        return snapshotRepository.findByMerchantIdAndWindowDate(event.getMerchantId(), today)
                .defaultIfEmpty(createInitialSnapshot(event.getMerchantId(), today))
                .flatMap(snapshot -> {
                    applyEventToSnapshot(snapshot, event);
                    List<String> triggers = anomalyEngine.detectAnomalies(snapshot);

                    if (!triggers.isEmpty()) {
                        sseConfig.broadcastAlert(new VelocityAlertDto(
                                UUID.randomUUID(),
                                event.getMerchantId(),
                                triggers.get(0),
                                "HIGH",
                                "Velocity anomaly triggered: " + String.join(", ", triggers),
                                event.getAmount(),
                                BigDecimal.ZERO,
                                Instant.now()
                        ));
                    }

                    return snapshotRepository.save(snapshot)
                            .thenReturn(new VelocityIngestionAck(
                                    event.getId(),
                                    event.getIdempotencyKey(),
                                    event.getMerchantId(),
                                    "INGESTED",
                                    triggers,
                                    Instant.now()
                            ));
                });
    }

    private MerchantVelocitySnapshot createInitialSnapshot(UUID merchantId, LocalDate date) {
        return MerchantVelocitySnapshot.builder()
                .merchantId(merchantId)
                .windowDate(date)
                .gmv24h(BigDecimal.ZERO)
                .trailing30dAvgDailyGmv(BigDecimal.valueOf(10000.00))
                .aov24h(BigDecimal.ZERO)
                .aov90dMean(BigDecimal.valueOf(100.00))
                .aov90dStddev(BigDecimal.valueOf(20.00))
                .refundCount30d(0L)
                .settledCnpCountMtd(1000L)
                .visaTc40CountMtd(5L)
                .visaTc15CountMtd(3L)
                .visaExcludedCountMtd(0L)
                .mcSalesPrevMonth(5000L)
                .mcChargebacksMtd(10L)
                .enumeratedAuthCountMtd(100L)
                .totalAuthCountMtd(10000L)
                .fulfillmentConfirmedRatio(BigDecimal.valueOf(0.9900))
                .updatedAt(Instant.now())
                .build();
    }

    private void applyEventToSnapshot(MerchantVelocitySnapshot s, TransactionTelemetryEvent e) {
        if ("CAPTURE_SETTLED".equals(e.getEventType())) {
            s.setGmv24h(s.getGmv24h().add(e.getAmount()));
            s.setSettledCnpCountMtd(s.getSettledCnpCountMtd() + 1);
        } else if ("REFUND".equals(e.getEventType())) {
            s.setRefundCount30d(s.getRefundCount30d() + 1);
        }
        if (Boolean.TRUE.equals(e.getIsEnumeratedPattern())) {
            s.setEnumeratedAuthCountMtd(s.getEnumeratedAuthCountMtd() + 1);
        }
        s.setTotalAuthCountMtd(s.getTotalAuthCountMtd() + 1);
        s.setUpdatedAt(Instant.now());
    }

    public Mono<SchemeRatioReport> getRatios(UUID merchantId) {
        LocalDate today = LocalDate.now();
        return snapshotRepository.findByMerchantIdAndWindowDate(merchantId, today)
                .defaultIfEmpty(createInitialSnapshot(merchantId, today))
                .map(anomalyEngine::evaluateRatios);
    }
}
