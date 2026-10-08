package com.heyganba.service;

import com.heyganba.domain.learning.LearningActivity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;
import java.sql.Timestamp;
import java.time.Instant;

@Service
@Slf4j
public class LearningEvidenceService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate isolated;
    public LearningEvidenceService(JdbcTemplate jdbc, PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        isolated = new TransactionTemplate(manager);
        isolated.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        isolated.setTimeout(2);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void committed(LearningActivity fact) {
        try {
            isolated.executeWithoutResult(status -> jdbc.update(
                    "INSERT INTO learning_attempts(id,user_id,contract_version,activity_type,content_ref,skill_ref,result,occurred_at,module) "
                            + "SELECT ?,?,1,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM learning_attempts WHERE id=?)",
                    fact.id(), fact.learnerId(), fact.activityType().name(), fact.contentRef(), fact.skillRef(),
                    fact.result().name(), Timestamp.from(fact.occurredAt()), fact.module().name(), fact.id()));
        } catch (RuntimeException failure) {
            log.warn("learning_evidence_write_failed module={} category={}", fact.module(), failure.getClass().getSimpleName());
        }
    }

    /** Counts describe observed evidence, not mastery. IDs come from existing grammar curriculum. */
    public SkillEvidence grammarSkill(Long learner, Long grammarRuleId) {
        return jdbc.queryForObject("SELECT count(*), COALESCE(sum(CASE WHEN result='CORRECT' THEN 1 ELSE 0 END),0), "
                        + "max(occurred_at) FROM learning_attempts WHERE user_id=? AND skill_ref=?",
                (row, index) -> new SkillEvidence("v1", row.getLong(1), row.getLong(2),
                        row.getTimestamp(3) == null ? null : row.getTimestamp(3).toInstant()),
                learner, "grammar-rule:" + grammarRuleId);
    }
    public record SkillEvidence(String contractVersion, long attemptCount, long correctCount, Instant lastPracticedAt) {}
}
