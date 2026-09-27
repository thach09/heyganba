package com.heyganba.service;

import com.heyganba.dto.admin.AuditLogResponse;
import com.heyganba.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Audit log cho hành động admin (bảng `audit_logs` có từ V1).
 *
 * Phase này mới có phần ĐỌC log: các endpoint admin hiện tại chỉ đọc dữ liệu (status/users), chưa có endpoint
 * sửa/xoá nội dung nên chưa có chỗ để ghi log. Khi làm CRUD nội dung (admin), service này sẽ được gọi trong
 * cùng transaction với thao tác sửa/xoá.
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
}
