package com.fintech.merchantrisk.dispute;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class DisputeSettlementServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(DisputeSettlementServiceApplication.class, args);
    }
}
