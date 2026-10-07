package com.heyganba.dto.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.*;

public record LearningPreferenceRequest(
        @Min(1) @Max(1440) Integer dailyStudyMinutes,
        @NotNull Boolean reminderOptIn,
        @Pattern(regexp = "(?:[01][0-9]|2[0-3]):[0-5][0-9]") String reminderTime) {
    @JsonIgnore
    @AssertTrue(message = "Reminder time is required when opting in")
    public boolean isReminderConfigured() { return !Boolean.TRUE.equals(reminderOptIn) || reminderTime != null; }
}
