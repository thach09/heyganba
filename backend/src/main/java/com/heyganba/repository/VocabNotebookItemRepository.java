package com.heyganba.repository;

import com.heyganba.model.entity.VocabNotebookItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VocabNotebookItemRepository extends JpaRepository<VocabNotebookItem, Long> {
    Optional<VocabNotebookItem> findByNotebookIdAndVocabularyId(Long notebookId, Long vocabularyId);
    void deleteByNotebookIdAndVocabularyId(Long notebookId, Long vocabularyId);
}
