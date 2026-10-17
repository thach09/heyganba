package com.heyganba.dto.progress;
import com.heyganba.model.entity.CharacterMastery;
import java.time.Instant;

/** Explicit response prevents serialization of the owning account or authentication fields. */
public record CharacterMasteryResponse(Long id,String targetType,String targetKey,int masteryScore,int practiceCount,Instant updatedAt) {
    public static CharacterMasteryResponse from(CharacterMastery value) {
        return new CharacterMasteryResponse(value.getId(),value.getTargetType(),value.getTargetKey(),value.getMasteryScore(),value.getPracticeCount(),value.getUpdatedAt());
    }
}
