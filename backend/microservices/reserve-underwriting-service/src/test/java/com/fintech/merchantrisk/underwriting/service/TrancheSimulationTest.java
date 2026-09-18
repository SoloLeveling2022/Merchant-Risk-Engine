package com.fintech.merchantrisk.underwriting.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TrancheSimulationTest {

    record SimulatedTranche(
            int dayIdx,
            LocalDate captureDate,
            LocalDate maturityDate,
            BigDecimal initialAmount,
            BigDecimal remainingAmount,
            boolean matured
    ) {}

    @Test
    void test120DayTrancheSimulationMatchesBlueprint() {
        LocalDate startDate = LocalDate.of(2026, 1, 1);
        List<SimulatedTranche> tranches = new ArrayList<>();

        for (int day = 0; day < 120; day++) {
            LocalDate captureDate = startDate.plusDays(day);
            BigDecimal gmv;
            BigDecimal holdRate;
            int maturityDays;

            if (day < 45) { // Days 0-44: baseline $10,000/day @ 10%/90-day
                gmv = BigDecimal.valueOf(10000);
                holdRate = BigDecimal.valueOf(0.10);
                maturityDays = 90;
            } else if (day <= 60) { // Days 45-60: surge $30,000/day @ 15%/120-day
                gmv = BigDecimal.valueOf(30000);
                holdRate = BigDecimal.valueOf(0.15);
                maturityDays = 120;
            } else { // Days 61-119: post-spike $12,000/day @ 15%/120-day
                gmv = BigDecimal.valueOf(12000);
                holdRate = BigDecimal.valueOf(0.15);
                maturityDays = 120;
            }

            BigDecimal principal = gmv.multiply(holdRate).setScale(2, RoundingMode.HALF_UP);
            LocalDate maturityDate = captureDate.plusDays(maturityDays);
            boolean matured = (day + maturityDays) <= 119; // evaluation as of day 119

            tranches.add(new SimulatedTranche(day, captureDate, maturityDate, principal, principal, matured));
        }

        long maturedCount = tranches.stream().filter(SimulatedTranche::matured).count();
        assertEquals(30, maturedCount, "Only first 30 tranches (Days 0-29) should have matured");

        BigDecimal lockedSum = tranches.stream()
                .filter(t -> !t.matured())
                .map(SimulatedTranche::remainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 15 legacy ($15,000) + 16 spike ($72,000) + 59 post-spike ($106,200) = $193,200.00
        assertEquals(new BigDecimal("193200.00"), lockedSum.setScale(2, RoundingMode.HALF_UP),
                "Cumulative locked escrow balance on Day 120 must equal $193,200.00");
    }
}
