package com.heyganba.dto.streak;

import java.time.LocalDate;

/** Một ô của streak heatmap: số hoạt động học trong ngày (cộng dồn mọi loại hoạt động). */
public record StudyActivityDayResponse(
        LocalDate date,
        int itemCount,
        int correctCount
) {
}
