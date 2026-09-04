package com.fintech.merchantrisk.velocity.config;

import io.netty.channel.ChannelOption;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;

@Configuration
public class WebClientConfig {

    @Bean
    @LoadBalanced
    public WebClient.Builder loadBalancedWebClientBuilder() {
        ConnectionProvider provider = ConnectionProvider.builder("velocity-client-pool")
                .maxConnections(500)
                .pendingAcquireMaxCount(1000)
                .pendingAcquireTimeout(Duration.ofSeconds(5))
                .maxIdleTime(Duration.ofSeconds(20))
                .evictInBackground(Duration.ofSeconds(30))
                .lifo()
                .build();

        HttpClient httpClient = HttpClient.create(provider)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 3000)
                .responseTimeout(Duration.ofSeconds(5));

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient));
    }
}
