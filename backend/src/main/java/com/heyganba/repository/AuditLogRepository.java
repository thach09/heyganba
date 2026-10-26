package com.heyganba.repository;

import com.heyganba.model.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findTop50ByOrderByCreatedAtDesc();

    @Query("select coalesce(max(a.id), 0) from AuditLog a where a.tableName = 'vocabulary' and a.recordId = :id "
            + "and a.action in ('CREATE', 'UPDATE', 'ARCHIVE', 'REJECT', 'PROVENANCE', 'PROVENANCE_UPDATE', 'PUBLISH_REVOKE')")
    long vocabularyEligibilityRevision(@Param("id") Long id);
}
