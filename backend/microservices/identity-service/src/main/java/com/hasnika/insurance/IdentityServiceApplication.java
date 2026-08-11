package com.hasnika.insurance;

import com.hasnika.insurance.identity.service.AuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@Slf4j
@SpringBootApplication
public class IdentityServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(IdentityServiceApplication.class, args);
    }

    @Bean
    public ApplicationRunner demoDataSeeder(AuthService authService) {
        return args -> {
            authService.seedDemoUsers()
                    .doOnSuccess(results -> log.info("Demo users seed complete: {}", results))
                    .doOnError(err -> log.error("Demo users seed error: {}", err.getMessage()))
                    .subscribe();
        };
    }
}

