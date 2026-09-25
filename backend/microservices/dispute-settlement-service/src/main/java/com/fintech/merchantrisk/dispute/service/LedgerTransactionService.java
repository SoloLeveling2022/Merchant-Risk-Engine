package com.fintech.merchantrisk.dispute.service;

import com.fintech.merchantrisk.dispute.dto.CaptureSettlementRequest;
import com.fintech.merchantrisk.dispute.dto.LedgerTransactionDto;
import com.fintech.merchantrisk.dispute.dto.TrialBalanceReport;
import com.fintech.merchantrisk.dispute.entity.LedgerAccount;
import com.fintech.merchantrisk.dispute.entity.LedgerEntry;
import com.fintech.merchantrisk.dispute.entity.LedgerTransaction;
import com.fintech.merchantrisk.dispute.repository.LedgerAccountRepository;
import com.fintech.merchantrisk.dispute.repository.LedgerEntryRepository;
import com.fintech.merchantrisk.dispute.repository.LedgerTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class LedgerTransactionService {

    private final LedgerAccountRepository accountRepository;
    private final LedgerTransactionRepository transactionRepository;
    private final LedgerEntryRepository entryRepository;

    public static final String ACC_CLEARING_ASSET = "CARD_NETWORK_CLEARING_ASSET";
    public static final String ACC_SETTLEMENT = "MERCHANT_SETTLEMENT_ACCOUNT";
    public static final String ACC_ESCROW = "ROLLING_RESERVE_ESCROW";
    public static final String ACC_CB_LIABILITY = "CHARGEBACK_LIABILITY_ACCOUNT";
    public static final String ACC_FEE = "FEE_ACCOUNT";

    @Transactional
    public Mono<LedgerAccount> getOrCreateAccount(UUID merchantId, String accountType, String currency) {
        return accountRepository.findByMerchantIdAndAccountTypeAndCurrency(merchantId, accountType, currency)
                .switchIfEmpty(Mono.defer(() -> {
                    String normalBalance = ACC_CLEARING_ASSET.equals(accountType) ? "DEBIT" : "CREDIT";
                    LedgerAccount acc = LedgerAccount.builder()
                            .merchantId(merchantId)
                            .accountType(accountType)
                            .normalBalance(normalBalance)
                            .currency(currency)
                            .postedBalance(BigDecimal.ZERO)
                            .version(null)
                            .build();
                    return accountRepository.save(acc);
                }));
    }

    /**
     * Stage 1: Capture
     * Gross capture booked to CARD_NETWORK_CLEARING_ASSET (Debit).
     * Processing fee to FEE_ACCOUNT (Credit).
     * Reserve hold to ROLLING_RESERVE_ESCROW (Credit).
     * Remainder to MERCHANT_SETTLEMENT_ACCOUNT (Credit).
     */
    @Transactional
    public Mono<LedgerTransactionDto> processCapture(CaptureSettlementRequest req) {
        return transactionRepository.findByIdempotencyKey(req.idempotencyKey())
                .flatMap(this::buildTransactionDto)
                .switchIfEmpty(Mono.defer(() -> {
                    String currency = req.currency() != null ? req.currency() : "USD";
                    BigDecimal gross = req.grossAmount();
                    BigDecimal fee = gross.multiply(req.processingFeeRate())
                            .add(req.processingFeeFixed())
                            .setScale(2, RoundingMode.HALF_UP);
                    BigDecimal reserve = gross.multiply(req.reserveHoldRate())
                            .setScale(2, RoundingMode.HALF_UP);
                    BigDecimal netSettlement = gross.subtract(fee).subtract(reserve);

                    LedgerTransaction tx = LedgerTransaction.builder()
                            .idempotencyKey(req.idempotencyKey())
                            .merchantId(req.merchantId())
                            .txCategory("CAPTURE")
                            .referenceId(UUID.randomUUID().toString())
                            .createdAt(Instant.now())
                            .build();

                    return transactionRepository.save(tx).flatMap(savedTx ->
                            Mono.zip(
                                    getOrCreateAccount(req.merchantId(), ACC_CLEARING_ASSET, currency),
                                    getOrCreateAccount(req.merchantId(), ACC_FEE, currency),
                                    getOrCreateAccount(req.merchantId(), ACC_ESCROW, currency),
                                    getOrCreateAccount(req.merchantId(), ACC_SETTLEMENT, currency)
                            ).flatMap(tuple -> {
                                LedgerAccount clearing = tuple.getT1();
                                LedgerAccount feeAcc = tuple.getT2();
                                LedgerAccount escrow = tuple.getT3();
                                LedgerAccount settlement = tuple.getT4();

                                // Update posted balances
                                clearing.setPostedBalance(clearing.getPostedBalance().add(gross));
                                feeAcc.setPostedBalance(feeAcc.getPostedBalance().add(fee));
                                escrow.setPostedBalance(escrow.getPostedBalance().add(reserve));
                                settlement.setPostedBalance(settlement.getPostedBalance().add(netSettlement));

                                List<LedgerEntry> entries = List.of(
                                        createEntry(savedTx.getId(), clearing.getId(), "DEBIT", gross),
                                        createEntry(savedTx.getId(), feeAcc.getId(), "CREDIT", fee),
                                        createEntry(savedTx.getId(), escrow.getId(), "CREDIT", reserve),
                                        createEntry(savedTx.getId(), settlement.getId(), "CREDIT", netSettlement)
                                );

                                return accountRepository.saveAll(List.of(clearing, feeAcc, escrow, settlement))
                                        .then(entryRepository.saveAll(entries).collectList())
                                        .map(savedEntries -> new LedgerTransactionDto(
                                                savedTx.getId(),
                                                savedTx.getIdempotencyKey(),
                                                savedTx.getMerchantId(),
                                                savedTx.getTxCategory(),
                                                savedTx.getReferenceId(),
                                                savedEntries.stream().map(e -> new LedgerTransactionDto.LedgerEntryDto(
                                                        e.getId(),
                                                        findAccountTypeById(e.getAccountId(), List.of(clearing, feeAcc, escrow, settlement)),
                                                        e.getDirection(),
                                                        e.getAmount()
                                                )).toList(),
                                                savedTx.getCreatedAt()
                                        ));
                            })
                    );
                }));
    }

    private LedgerEntry createEntry(UUID txId, UUID accId, String dir, BigDecimal amt) {
        return LedgerEntry.builder()
                .transactionId(txId)
                .accountId(accId)
                .direction(dir)
                .amount(amt)
                .createdAt(Instant.now())
                .build();
    }

    private String findAccountTypeById(UUID accId, List<LedgerAccount> accounts) {
        return accounts.stream()
                .filter(a -> a.getId().equals(accId))
                .map(LedgerAccount::getAccountType)
                .findFirst()
                .orElse("UNKNOWN");
    }

    private Mono<LedgerTransactionDto> buildTransactionDto(LedgerTransaction tx) {
        return entryRepository.findAllByTransactionId(tx.getId())
                .collectList()
                .map(entries -> new LedgerTransactionDto(
                        tx.getId(),
                        tx.getIdempotencyKey(),
                        tx.getMerchantId(),
                        tx.getTxCategory(),
                        tx.getReferenceId(),
                        entries.stream().map(e -> new LedgerTransactionDto.LedgerEntryDto(
                                e.getId(),
                                "ACCOUNT",
                                e.getDirection(),
                                e.getAmount()
                        )).toList(),
                        tx.getCreatedAt()
                ));
    }

    @Transactional(readOnly = true)
    public Mono<TrialBalanceReport> getTrialBalance(UUID merchantId) {
        return accountRepository.findAllByMerchantId(merchantId)
                .collectList()
                .map(accounts -> {
                    BigDecimal totalDebits = BigDecimal.ZERO;
                    BigDecimal totalCredits = BigDecimal.ZERO;
                    BigDecimal assetBalance = BigDecimal.ZERO;
                    BigDecimal liabilityBalance = BigDecimal.ZERO;
                    BigDecimal revenueBalance = BigDecimal.ZERO;
                    Map<String, BigDecimal> balanceMap = new HashMap<>();

                    for (LedgerAccount acc : accounts) {
                        balanceMap.put(acc.getAccountType(), acc.getPostedBalance());
                        if (ACC_CLEARING_ASSET.equals(acc.getAccountType())) {
                            assetBalance = assetBalance.add(acc.getPostedBalance());
                            totalDebits = totalDebits.add(acc.getPostedBalance());
                        } else if (ACC_FEE.equals(acc.getAccountType())) {
                            revenueBalance = revenueBalance.add(acc.getPostedBalance());
                            totalCredits = totalCredits.add(acc.getPostedBalance());
                        } else {
                            liabilityBalance = liabilityBalance.add(acc.getPostedBalance());
                            totalCredits = totalCredits.add(acc.getPostedBalance());
                        }
                    }

                    boolean isBalanced = assetBalance.compareTo(liabilityBalance.add(revenueBalance)) == 0;

                    return new TrialBalanceReport(
                            merchantId,
                            totalDebits,
                            totalCredits,
                            isBalanced,
                            assetBalance,
                            liabilityBalance,
                            revenueBalance,
                            balanceMap,
                            Instant.now()
                    );
                });
    }
}
