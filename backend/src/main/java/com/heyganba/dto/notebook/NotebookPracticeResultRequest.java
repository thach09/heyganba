package com.heyganba.dto.notebook;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

/** Server derives counts from answers; a client cannot declare arbitrary EXP. */
public record NotebookPracticeResultRequest(
        @NotNull UUID sessionId,
        @NotEmpty @Size(max = 200) List<@Valid Answer> answers) {
    public record Answer(@NotNull Long vocabularyId, @NotBlank @Size(max = 10000) String answer,
                         @NotNull Kind kind) {}
    public enum Kind { MEANING, READING }
}
