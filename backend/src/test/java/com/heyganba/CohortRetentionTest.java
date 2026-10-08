package com.heyganba;

import com.heyganba.service.CohortRetention;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

class CohortRetentionTest {
    private final LocalDate day = LocalDate.of(2026, 1, 1);
    @Test void returnCountsEachLearnerOnceAndIncludesInactiveRegistrants() {
        var result = CohortRetention.calculate(day, 7, day.plusDays(9), Set.of(1L, 2L, 3L),
                Map.of(1L, Set.of(day.plusDays(7), day.plusDays(9)),
                        2L, Set.of(day.plusDays(6), day.plusDays(10)),
                        99L, Set.of(day.plusDays(7))));
        assertEquals(1, result.returningLearners());
        assertEquals(1.0 / 3, result.rate());
    }
    @Test void immatureWindowsAndEmptyCohortsDoNotReportZeroRetention() {
        assertNull(CohortRetention.calculate(day, 30, day.plusDays(31), Set.of(1L), Map.of()).rate());
        assertFalse(CohortRetention.calculate(day, 30, day.plusDays(31), Set.of(1L), Map.of()).mature());
        assertNull(CohortRetention.calculate(day, 7, day.plusDays(9), Set.of(), Map.of()).rate());
        assertThrows(IllegalArgumentException.class, () -> CohortRetention.calculate(day, 1, day, Set.of(), Map.of()));
    }
}
