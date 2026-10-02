package com.heyganba.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình công thức tính điểm kinh nghiệm (EXP).
 * Các chỉ số được đưa ra cấu hình để dễ dàng tinh chỉnh mà không cần sửa mã nguồn:
 * - exerciseCorrect: EXP nhận được khi làm đúng 1 câu bài tập (mặc định 10).
 * - srsSession: EXP nhận được khi hoàn thành 1 phiên ôn tập SRS (mặc định 50).
 * - examBase: Hệ số cơ sở của đề thi (mặc định 100), EXP nhận được = examBase * (scorePercent / 100).
 */
@Configuration
@ConfigurationProperties(prefix = "app.exp")
@Getter
@Setter
public class ExpConfig {
    private int exerciseCorrect = 10;
    private int srsSession = 50;
    private int examBase = 100;
}
