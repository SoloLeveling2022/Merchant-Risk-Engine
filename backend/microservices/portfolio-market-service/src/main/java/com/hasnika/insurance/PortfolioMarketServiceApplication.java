package com.hasnika.insurance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveUserDetailsServiceAutoConfiguration;

@SpringBootApplication
public class PortfolioMarketServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PortfolioMarketServiceApplication.class, args);
    }
}
