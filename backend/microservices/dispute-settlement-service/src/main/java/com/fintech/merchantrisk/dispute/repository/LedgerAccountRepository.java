package com.fintech.merchantrisk.dispute.repository;

import com.fintech.merchantrisk.dispute.entity.LedgerAccount;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface LedgerAccountRepository extends ReactiveCrudRepository<LedgerAccount, UUID> {
    Mono<LedgerAccount> findByMerchantIdAndAccountTypeAndCurrency(UUID merchantId, String accountType, String currency);
    Flux<LedgerAccount> findAllByMerchantId(UUID merchantId);
}
