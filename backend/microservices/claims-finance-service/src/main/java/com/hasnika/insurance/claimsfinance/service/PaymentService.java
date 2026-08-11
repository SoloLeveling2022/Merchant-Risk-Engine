package com.hasnika.insurance.claimsfinance.service;

import com.hasnika.insurance.claimsfinance.dto.PaymentRequest;
import com.hasnika.insurance.claimsfinance.dto.PaymentResponse;
import com.hasnika.insurance.claimsfinance.dto.PolicyDTO;
import com.hasnika.insurance.claimsfinance.entity.Transaction;
import com.hasnika.insurance.claimsfinance.repository.TransactionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
public class PaymentService {

    private final TransactionRepository transactionRepository;
    private final WebClient webClient;

    public PaymentService(TransactionRepository transactionRepository, WebClient.Builder webClientBuilder) {
        this.transactionRepository = transactionRepository;
        this.webClient = webClientBuilder.baseUrl("http://localhost:8083/api/v1").build();
    }

    public Mono<PaymentResponse> processInitialPayment(PaymentRequest request, String userId) {
        Transaction tx = Transaction.builder()
                .transactionId(UUID.randomUUID().toString())
                .userId(userId)
                .policyId(request.getQuoteId()) // using quote id initially before policy exists
                .amount(request.getAmount())
                .transactionType(request.getTransactionType() != null ? request.getTransactionType() : "INITIAL_PREMIUM")
                .status("SUCCESS")
                .createdAt(Instant.now())
                .build();
        
        return transactionRepository.save(tx)
                .map(saved -> new PaymentResponse(saved.getTransactionId(), "SUCCESS", "Initial premium payment processed successfully."));
    }

    public Mono<PaymentResponse> payPremium(String policyId, String userId) {
        return webClient.get()
                .uri("/policies/{id}", policyId)
                .retrieve()
                .bodyToMono(PolicyDTO.class)
                .flatMap(policy -> {
                    BigDecimal basePremium = policy.getAnnualPremium() != null ? policy.getAnnualPremium() : new BigDecimal("2000.00");
                    BigDecimal calculatedAmount = basePremium;
                    
                    // Penalty Logic: 1% per day late
                    if (policy.getNextPremiumDueDate() != null && policy.getNextPremiumDueDate().isBefore(LocalDate.now())) {
                        long daysLate = ChronoUnit.DAYS.between(policy.getNextPremiumDueDate(), LocalDate.now());
                        BigDecimal penaltyPct = new BigDecimal("0.01").multiply(new BigDecimal(daysLate));
                        BigDecimal penaltyAmount = basePremium.multiply(penaltyPct);
                        calculatedAmount = basePremium.add(penaltyAmount);
                        log.info("Late premium detected for policy {}. Days late: {}. Penalty: {}", policyId, daysLate, penaltyAmount);
                    }

                    final BigDecimal finalAmount = calculatedAmount;

                    Transaction tx = Transaction.builder()
                            .transactionId(UUID.randomUUID().toString())
                            .userId(userId)
                            .policyId(policyId)
                            .amount(finalAmount)
                            .transactionType("RENEWAL_PREMIUM")
                            .status("SUCCESS")
                            .createdAt(Instant.now())
                            .build();

                    return transactionRepository.save(tx)
                            .flatMap(saved -> {
                                return webClient.put()
                                        .uri("/policies/{id}/advance-premium", policyId)
                                        .retrieve()
                                        .bodyToMono(Void.class)
                                        .onErrorResume(e -> Mono.empty())
                                        .then(Mono.just(new PaymentResponse(saved.getTransactionId(), "SUCCESS", "Premium paid successfully. Amount: " + finalAmount)));
                            });
                });
    }

    public Mono<java.util.List<Transaction>> getUserTransactions(String userId) {
        return transactionRepository.findByUserId(userId).collectList();
    }
}
