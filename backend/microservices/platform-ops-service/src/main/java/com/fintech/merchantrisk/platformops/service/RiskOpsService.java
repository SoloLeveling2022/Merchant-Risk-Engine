package com.fintech.merchantrisk.platformops.service;

import com.fintech.merchantrisk.platformops.dto.AcquirerVampRollupDto;
import com.fintech.merchantrisk.platformops.dto.EcpComplianceStatusDto;
import com.fintech.merchantrisk.platformops.dto.RiskOpsOverrideDto;
import com.fintech.merchantrisk.platformops.dto.RiskOverrideRequest;
import com.fintech.merchantrisk.platformops.entity.AcquirerVampRollup;
import com.fintech.merchantrisk.platformops.entity.EcpComplianceTracker;
import com.fintech.merchantrisk.platformops.entity.RiskOpsOverride;
import com.fintech.merchantrisk.platformops.repository.AcquirerVampRollupRepository;
import com.fintech.merchantrisk.platformops.repository.EcpComplianceTrackerRepository;
import com.fintech.merchantrisk.platformops.repository.RiskOpsOverrideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RiskOpsService {

    private final AcquirerVampRollupRepository vampRollupRepository;
    private final EcpComplianceTrackerRepository ecpTrackerRepository;
    private final RiskOpsOverrideRepository overrideRepository;

    public Mono<AcquirerVampRollupDto> getPortfolioVampHealth(String region, String month) {
        String reg = (region != null && !region.isBlank()) ? region : "US";
        String repMonth = (month != null && !month.isBlank()) ? month : "2026-11";

        return vampRollupRepository.findByAcquirerRegionAndReportingMonth(reg, repMonth)
                .defaultIfEmpty(createSampleRollup(reg, repMonth))
                .map(r -> new AcquirerVampRollupDto(
                        r.getId(),
                        r.getAcquirerRegion(),
                        r.getReportingMonth(),
                        r.getPortfolioTc40Count(),
                        r.getPortfolioTc15Count(),
                        r.getPortfolioExcludedCount(),
                        r.getPortfolioTc05Count(),
                        r.getAcquirerVampRatioBps(),
                        r.getTierStatus(),
                        r.getComputedAt()
                ));
    }

    private AcquirerVampRollup createSampleRollup(String region, String month) {
        // Sample compliant rollup: 42 bps across 2,000,000 CNP transactions
        return AcquirerVampRollup.builder()
                .id(UUID.randomUUID())
                .acquirerRegion(region)
                .reportingMonth(month)
                .portfolioTc40Count(5200L)
                .portfolioTc15Count(3200L)
                .portfolioExcludedCount(0L)
                .portfolioTc05Count(2000000L)
                .acquirerVampRatioBps(42) // 0.42% < 50 bps limit
                .tierStatus("COMPLIANT")
                .computedAt(Instant.now())
                .build();
    }

    public Mono<EcpComplianceStatusDto> getEcpStatus(UUID merchantId) {
        return ecpTrackerRepository.findById(merchantId)
                .defaultIfEmpty(EcpComplianceTracker.builder()
                        .merchantId(merchantId)
                        .currentTier("NONE")
                        .violationMonthsCount(0)
                        .consecutiveCleanMonths(3)
                        .projectedMonthlyFineUsd(BigDecimal.ZERO)
                        .lastEvaluatedMonth("2026-11")
                        .build())
                .map(t -> new EcpComplianceStatusDto(
                        t.getMerchantId(),
                        t.getCurrentTier(),
                        t.getViolationMonthsCount(),
                        t.getConsecutiveCleanMonths(),
                        Math.max(0, 3 - t.getConsecutiveCleanMonths()),
                        calculateEcpFine(t.getCurrentTier(), t.getViolationMonthsCount()),
                        t.getLastEvaluatedMonth()
                ));
    }

    private BigDecimal calculateEcpFine(String tier, int months) {
        if ("HECM".equalsIgnoreCase(tier)) {
            if (months <= 1) return BigDecimal.ZERO;
            if (months == 2) return BigDecimal.valueOf(1000);
            if (months == 3) return BigDecimal.valueOf(2000);
            if (months <= 6) return BigDecimal.valueOf(10000);
            if (months <= 11) return BigDecimal.valueOf(50000);
            if (months <= 18) return BigDecimal.valueOf(100000);
            return BigDecimal.valueOf(200000);
        } else if ("ECM".equalsIgnoreCase(tier)) {
            if (months <= 1) return BigDecimal.ZERO;
            if (months <= 3) return BigDecimal.valueOf(1000);
            if (months <= 6) return BigDecimal.valueOf(5000);
            if (months <= 11) return BigDecimal.valueOf(25000);
            if (months <= 18) return BigDecimal.valueOf(50000);
            return BigDecimal.valueOf(100000);
        }
        return BigDecimal.ZERO;
    }

    @Transactional
    public Mono<RiskOpsOverrideDto> recordOverride(UUID merchantId, RiskOverrideRequest req, String correlationId) {
        RiskOpsOverride override = RiskOpsOverride.builder()
                .merchantId(merchantId)
                .analystId(req.analystId())
                .actionType(req.actionType())
                .justification(req.justification())
                .correlationId(correlationId != null ? correlationId : UUID.randomUUID().toString())
                .createdAt(Instant.now())
                .build();

        return overrideRepository.save(override)
                .map(saved -> new RiskOpsOverrideDto(
                        saved.getId(),
                        saved.getMerchantId(),
                        saved.getAnalystId(),
                        saved.getActionType(),
                        saved.getJustification(),
                        saved.getCorrelationId(),
                        saved.getCreatedAt()
                ));
    }
}
