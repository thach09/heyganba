package com.heyganba.dto.admin;

import java.time.Instant;

/** Một bản ghi audit log admin (Phase 5 — đọc để kiểm tra lịch sử thao tác). */
public record AuditLogResponse(
        Long id,
        String adminEmail,
        String tableName,
        Long recordId,
        String action,
        Instant createdAt
) {
}
