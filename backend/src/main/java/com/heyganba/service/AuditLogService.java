package com.heyganba.service;

import com.heyganba.dto.admin.AuditLogResponse;
import com.heyganba.model.entity.AuditLog;
import com.heyganba.model.entity.User;
import com.heyganba.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Audit log cho hành động admin (bảng `audit_logs` có từ V1).
 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getRecent() {
        return auditLogRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(log -> new AuditLogResponse(
                        log.getId(),
                        log.getAdmin() != null ? log.getAdmin().getEmail() : null,
                        log.getTableName(),
                        log.getRecordId(),
                        log.getAction(),
                        log.getCreatedAt()))
                .toList();
    }

    @Transactional
    public void logAction(User admin, String tableName, Long recordId, String action, String beforeValue, String afterValue) {
        AuditLog log = AuditLog.builder()
                .admin(admin)
                .tableName(tableName)
                .recordId(recordId)
                .action(action)
                .beforeValue(beforeValue)
                .afterValue(afterValue)
                .build();
        auditLogRepository.save(log);
    }
}
