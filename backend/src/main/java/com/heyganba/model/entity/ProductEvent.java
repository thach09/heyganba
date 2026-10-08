package com.heyganba.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

/** Minimal mapping for schema validation and H2 regression tests. Writes use an isolated service. */
@Entity
@Table(name = "product_events", uniqueConstraints = @UniqueConstraint(
        name = "uq_product_event_key", columnNames = {"user_id", "event_name", "event_key"}))
@Getter
@NoArgsConstructor
public class ProductEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;
    @Column(name = "event_name", nullable = false, length = 40) private String eventName;
    @Column(nullable = false, length = 16) private String module;
    @Column(name = "event_key", nullable = false) private UUID eventKey;
    @Column(name = "occurred_at", nullable = false) private Instant occurredAt;
}
