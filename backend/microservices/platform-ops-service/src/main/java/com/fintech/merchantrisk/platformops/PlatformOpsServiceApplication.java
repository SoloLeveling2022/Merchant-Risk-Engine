package com.fintech.merchantrisk.platformops;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class PlatformOpsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PlatformOpsServiceApplication.class, args);
    }
}
