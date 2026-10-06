package com.heyganba.repository;
import com.heyganba.model.entity.NotebookPracticeSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface NotebookPracticeSessionRepository extends JpaRepository<NotebookPracticeSession, UUID> {}
