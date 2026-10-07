package com.heyganba.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

@Service
@Slf4j
public class ProductEventService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate isolated;

    public ProductEventService(JdbcTemplate jdbc, PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        isolated = new TransactionTemplate(manager);
        isolated.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        isolated.setTimeout(2);
    }

    public void login(Long userId) {
        record(userId, "auth.login.v1", "AUTH", UUID.randomUUID());
    }

    public void started(Long userId, Module module, UUID key) {
        record(userId, "learning.started.v1", module.name(), key);
    }

    private void record(Long userId, String name, String module, UUID key) {
        try {
            isolated.executeWithoutResult(status -> jdbc.update(
                    "INSERT INTO product_events(user_id, event_name, module, event_key, occurred_at) "
                            + "SELECT ?, ?, ?, ?, CURRENT_TIMESTAMP WHERE NOT EXISTS "
                            + "(SELECT 1 FROM product_events WHERE user_id=? AND event_name=? AND event_key=?)",
                    userId, name, module, key, userId, name, key));
        } catch (RuntimeException failure) {
            // Do not log exception payloads, user identities or credentials.
            log.warn("product_event_write_failed event={} module={} category={}", name, module,
                    failure.getClass().getSimpleName());
        }
    }

    public enum Module { SRS, GRAMMAR }
}
