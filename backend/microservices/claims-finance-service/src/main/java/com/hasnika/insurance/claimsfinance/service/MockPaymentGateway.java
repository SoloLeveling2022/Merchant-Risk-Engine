package com.hasnika.insurance.claimsfinance.service;

import com.hasnika.insurance.claimsfinance.dto.PaymentStatus;
import com.hasnika.insurance.claimsfinance.dto.PaymentType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Mock Payment Gateway.
 */
@Slf4j
@Component
public class MockPaymentGateway {

    private static final double FAILURE_RATE = 0.05;

    public Mono<MockPaymentResult> initiatePayment(String paymentType, BigDecimal amount, String referenceId) {
        return Mono.fromCallable(() -> {
            String gatewayRef = "MOCK-GW-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

            Thread.sleep(ThreadLocalRandom.current().nextInt(50, 200));

            boolean success = ThreadLocalRandom.current().nextDouble() > FAILURE_RATE;

            if (success) {
                log.info("Mock payment SUCCESS: type={} amount={} ref={} gatewayRef={}",
                        paymentType, amount, referenceId, gatewayRef);
                return new MockPaymentResult(
                        PaymentStatus.COMPLETED.name(),
                        gatewayRef,
                        "Payment processed successfully",
                        null
                );
            } else {
                log.warn("Mock payment FAILED: type={} amount={} ref={}", paymentType, amount, referenceId);
                return new MockPaymentResult(
                        PaymentStatus.FAILED.name(),
                        gatewayRef,
                        null,
                        "MOCK_GATEWAY_DECLINED: Simulated payment failure"
                );
            }
        }).subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic());
    }

    public Mono<MockPaymentResult> initiateClaimPayout(BigDecimal payoutAmount, UUID claimId) {
        return initiatePayment(
                PaymentType.CLAIM_PAYOUT.name(),
                payoutAmount,
                "CLAIM-" + claimId
        );
    }

    public Mono<MockPaymentResult> collectPremium(BigDecimal premiumAmount, UUID policyId) {
        return initiatePayment(
                PaymentType.PREMIUM.name(),
                premiumAmount,
                "PREMIUM-" + policyId
        );
    }

    public record MockPaymentResult(
            String status,
            String gatewayReference,
            String successMessage,
            String failureReason
    ) {}
}
