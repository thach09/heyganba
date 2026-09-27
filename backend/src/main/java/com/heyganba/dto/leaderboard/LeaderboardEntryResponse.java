package com.heyganba.dto.leaderboard;

/** Một dòng bảng xếp hạng (điểm tính từ dữ liệu học thật, công thức ghi trong `pointsFormula`). */
public record LeaderboardEntryResponse(
        int rank,
        Long userId,
        String fullName,
        long learnedWords,
        int longestStreak,
        double bestExamScore,
        long points
) {
}
