package com.heyganba.dto.notebook;

import lombok.Builder;

import java.time.Instant;
import java.util.List;

@Builder
public record VocabNotebookResponse(
        Long id,
        String title,
        String description,
        boolean isPublicSample,
        int itemCount,
        Instant createdAt,
        List<VocabNotebookItemResponse> items
) {
}
