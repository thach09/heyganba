package com.heyganba.dto.progress;

import lombok.Builder;

@Builder
public record UserExpResponse(
        long totalExp,
        int level,
        long expIntoLevel,
        long expForNextLevel,
        String rankName,
        int rankTier,
        ExpConfigDto config
) {
    public record ExpConfigDto(
            int exerciseCorrect,
            int srsSession,
            int examBase
    ) {
    }
}
