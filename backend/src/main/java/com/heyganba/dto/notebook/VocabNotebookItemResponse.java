package com.heyganba.dto.notebook;

import lombok.Builder;

@Builder
public record VocabNotebookItemResponse(
        Long id,
        Long vocabularyId,
        String word,
        String reading,
        String meaning,
        String sinoVietnamese,
        String exampleSentence,
        String exampleReading,
        String exampleMeaning,
        String customNote
) {
}
