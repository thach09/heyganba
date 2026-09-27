package com.heyganba.dto.leaderboard;

import java.util.List;

/**
 * Bảng xếp hạng kèm công thức tính điểm để UI giải thích cho người học (tránh "điểm từ trên trời rơi xuống").
 *
 * `scope` hiện chỉ hỗ trợ "ALL" — xếp hạng theo lớp học cần thêm `class_code` cho user (chờ quyết định của Thach).
 */
public record LeaderboardResponse(
        String scope,
        String pointsFormula,
        List<LeaderboardEntryResponse> entries
) {
}
