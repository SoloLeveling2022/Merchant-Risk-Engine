package com.fintech.merchantrisk.velocity.service;

import com.fintech.merchantrisk.velocity.dto.SchemeRatioReport;
import com.fintech.merchantrisk.velocity.entity.MerchantVelocitySnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class VelocityAnomalyEngineTest {

    private VelocityAnomalyEngine engine;

    @BeforeEach
    void setUp() {
        engine = new VelocityAnomalyEngine();
    }

    @Test
    void testVisaVampExcessiveThresholdBreached() {
        // 1500 disputes across 100,000 CNP transactions = 1.50% (150 bps)
        MerchantVelocitySnapshot snapshot = MerchantVelocitySnapshot.builder()
                .merchantId(UUID.randomUUID())
                .windowDate(LocalDate.now())
                .visaTc40CountMtd(1000L)
                .visaTc15CountMtd(500L)
                .visaExcludedCountMtd(0L)
                .settledCnpCountMtd(100000L)
                .enumeratedAuthCountMtd(100L)
                .totalAuthCountMtd(10000L)
                .mcSalesPrevMonth(5000L)
                .mcChargebacksMtd(10L)
                .updatedAt(Instant.now())
                .build();

        SchemeRatioReport report = engine.evaluateRatios(snapshot);

        assertEquals(new BigDecimal("150.0000"), report.visaVampRatioBps());
        assertEquals("EXCESSIVE", report.visaVampTier());
    }

    @Test
    void testMastercardLaggedCtrHecmBreached() {
        // 350 chargebacks against 10,000 prior month sales = 3.50% (350 bps) -> HECM
        MerchantVelocitySnapshot snapshot = MerchantVelocitySnapshot.builder()
                .merchantId(UUID.randomUUID())
                .windowDate(LocalDate.now())
                .visaTc40CountMtd(10L)
                .visaTc15CountMtd(10L)
                .visaExcludedCountMtd(0L)
                .settledCnpCountMtd(50000L)
                .enumeratedAuthCountMtd(50L)
                .totalAuthCountMtd(10000L)
                .mcSalesPrevMonth(10000L)
                .mcChargebacksMtd(350L)
                .updatedAt(Instant.now())
                .build();

        SchemeRatioReport report = engine.evaluateRatios(snapshot);

        assertEquals(new BigDecimal("350.0000"), report.mastercardLaggedCtrBps());
        assertEquals("HECM", report.mastercardEcpTier());
    }
}
