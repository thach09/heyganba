package com.heyganba.dto.progress;

public record PracticeProgressResponse(
        String targetType,
        String targetKey,
        int masteryScore,
        int practiceCount,
        int expAwarded,
        long totalExp,
        int level,
        long expIntoLevel
) {}
