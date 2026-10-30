package com.heyganba.config;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

/** Opt-in only: existing prod/staging initialization remains unchanged. */
@Configuration(proxyBeanMethods = false)
@Profile("jiayou-prod")
public class JiayouBootstrapConfiguration {
    @Bean
    static BeanFactoryPostProcessor jiayouConfigurationGate(Environment environment) {
        // Before datasource construction, SQL init, Flyway or Hibernate can write.
        return factory -> JiayouBootstrapGuard.validateEnvironment(environment);
    }

    @Bean
    FlywayMigrationStrategy jiayouMigrationStrategy(Environment environment) {
        return flyway -> new JiayouBootstrapGuard(environment).run(flyway);
    }
}
