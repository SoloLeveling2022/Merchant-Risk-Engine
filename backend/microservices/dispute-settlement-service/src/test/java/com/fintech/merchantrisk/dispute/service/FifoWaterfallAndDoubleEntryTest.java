package com.fintech.merchantrisk.dispute.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FifoWaterfallAndDoubleEntryTest {

    record SimulatedTranche(String name, String initialStatus, BigDecimal initialAmount, BigDecimal remainingAmount, String finalStatus) {}

    @Test
    void test4TierFifoWaterfallMatchesBlueprint() {
        BigDecimal claimAmount = BigDecimal.valueOf(2500.00);
        BigDecimal settlementBalance = BigDecimal.valueOf(500.00);

        // Tier 1: Settlement funds consumed first
        BigDecimal tier1Draw = settlementBalance.min(claimAmount);
        BigDecimal remainingNeed = claimAmount.subtract(tier1Draw);
        assertEquals(new BigDecimal("500.00"), tier1Draw);
        assertEquals(new BigDecimal("2000.00"), remainingNeed);

        // Tranches in FIFO order: T1 (Matured), T2 (Locked), T3 (Locked)
        List<SimulatedTranche> tranches = List.of(
                new SimulatedTranche("T1", "MATURED_UNRELEASED", BigDecimal.valueOf(400.00), BigDecimal.valueOf(400.00), "DEPLETED"),
                new SimulatedTranche("T2", "LOCKED", BigDecimal.valueOf(1000.00), BigDecimal.valueOf(1000.00), "DEPLETED"),
                new SimulatedTranche("T3", "LOCKED", BigDecimal.valueOf(1500.00), BigDecimal.valueOf(1500.00), "LOCKED")
        );

        List<SimulatedTranche> updatedTranches = new ArrayList<>();
        BigDecimal totalEscrowDraw = BigDecimal.ZERO;

        for (SimulatedTranche t : tranches) {
            if (remainingNeed.compareTo(BigDecimal.ZERO) <= 0) {
                updatedTranches.add(t);
                continue;
            }
            BigDecimal draw = t.remainingAmount.min(remainingNeed);
            BigDecimal newRem = t.remainingAmount.subtract(draw);
            String status = newRem.compareTo(BigDecimal.ZERO) == 0 ? "DEPLETED" : t.initialStatus;
            totalEscrowDraw = totalEscrowDraw.add(draw);
            remainingNeed = remainingNeed.subtract(draw);
            updatedTranches.add(new SimulatedTranche(t.name, t.initialStatus, t.initialAmount, newRem, status));
        }

        assertEquals(new BigDecimal("2000.00"), totalEscrowDraw);
        assertEquals(new BigDecimal("0.00"), remainingNeed, "Uncovered clawback deficit should be $0.00");

        // Verify individual tranches
        SimulatedTranche t1 = updatedTranches.get(0);
        assertEquals("DEPLETED", t1.finalStatus);
        assertEquals(new BigDecimal("0.00"), t1.remainingAmount);

        SimulatedTranche t2 = updatedTranches.get(1);
        assertEquals("DEPLETED", t2.finalStatus);
        assertEquals(new BigDecimal("0.00"), t2.remainingAmount);

        SimulatedTranche t3 = updatedTranches.get(2);
        assertEquals("LOCKED", t3.finalStatus);
        assertEquals(new BigDecimal("900.00"), t3.remainingAmount, "T3 should have $900.00 remaining locked");
    }

    @Test
    void testFiveStageDoubleEntryTrialBalance() {
        // Stage 1: Capture $1000 sale, $29.30 fee, $100 reserve (10%), $870.70 settlement
        BigDecimal asset = BigDecimal.valueOf(1000.00);
        BigDecimal fee = BigDecimal.valueOf(29.30);
        BigDecimal escrow = BigDecimal.valueOf(100.00);
        BigDecimal settlement = BigDecimal.valueOf(870.70);
        BigDecimal cbLiability = BigDecimal.ZERO;

        assertEquals(asset, settlement.add(escrow).add(cbLiability).add(fee), "Stage 1 Balance: Assets = L + R");

        // Stage 2: Partial Payout $800.00
        settlement = settlement.subtract(BigDecimal.valueOf(800.00)); // $70.70
        asset = asset.subtract(BigDecimal.valueOf(800.00));           // $200.00
        assertEquals(asset, settlement.add(escrow).add(cbLiability).add(fee), "Stage 2 Balance");

        // Stage 3: Chargeback $200 + $15 fee
        // Draws $70.70 settlement, $100.00 escrow, and leaves -$44.30 settlement clawback deficit
        settlement = settlement.subtract(BigDecimal.valueOf(115.00)); // -$44.30
        escrow = escrow.subtract(BigDecimal.valueOf(100.00));         // $0.00
        cbLiability = cbLiability.add(BigDecimal.valueOf(200.00));    // $200.00
        fee = fee.add(BigDecimal.valueOf(15.00));                     // $44.30
        assertEquals(asset, settlement.add(escrow).add(cbLiability).add(fee), "Stage 3 Balance");

        // Stage 4: Network Settle $200.00
        cbLiability = cbLiability.subtract(BigDecimal.valueOf(200.00)); // $0.00
        asset = asset.subtract(BigDecimal.valueOf(200.00));             // $0.00
        assertEquals(asset, settlement.add(escrow).add(cbLiability).add(fee), "Stage 4 Balance");

        // Stage 5: Recovery Capture $500.00 (15% reserve $75.00, $14.80 fee, nets $410.20 auto-curing deficit)
        asset = asset.add(BigDecimal.valueOf(500.00));                // $500.00
        fee = fee.add(BigDecimal.valueOf(14.80));                     // $59.10
        escrow = escrow.add(BigDecimal.valueOf(75.00));               // $75.00
        settlement = settlement.add(BigDecimal.valueOf(410.20));      // $365.90
        assertEquals(asset, settlement.add(escrow).add(cbLiability).add(fee), "Stage 5 Balance: $500 = $500");
    }
}
