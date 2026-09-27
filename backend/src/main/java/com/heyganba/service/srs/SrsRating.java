package com.heyganba.service.srs;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

/**
 * 4 mức đánh giá của user sau khi lật flashcard (SM-2 rút gọn) → map sang quality của SM-2 gốc.
 * Quên = quality 1 (< 3) nên được coi là "lapse" và reset chu kỳ.
 */
public enum SrsRating {
    EASY(5, "Dễ"),
    GOOD(4, "Được"),
    HARD(3, "Khó"),
    FORGOT(1, "Quên");

    private final int quality;
    private final String label;

    SrsRating(int quality, String label) {
        this.quality = quality;
        this.label = label;
    }

    public int quality() {
        return quality;
    }

    public String label() {
        return label;
    }

    public boolean isLapse() {
        return quality < 3;
    }

    /** Client có thể gửi "easy"/"Easy"/"EASY" đều được. */
    @JsonCreator
    public static SrsRating fromValue(String value) {
        if (value == null) {
            return null;
        }
        return SrsRating.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
