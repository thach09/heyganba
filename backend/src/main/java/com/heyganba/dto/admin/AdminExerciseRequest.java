package com.heyganba.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminExerciseRequest {
    @NotNull(message = "ID điểm ngữ pháp là bắt buộc")
    private Long grammarRuleId;

    @NotBlank(message = "Nội dung câu hỏi là bắt buộc")
    @jakarta.validation.constraints.Size(max=5000)
    private String questionText;

    @NotBlank(message = "Danh sách lựa chọn JSON là bắt buộc (VD: [\"A\",\"B\"])")
    @jakarta.validation.constraints.Size(max=10000)
    private String optionsJson;

    @NotBlank(message = "Đáp án đúng là bắt buộc")
    @jakarta.validation.constraints.Size(max=255)
    private String correctAnswer;

    @jakarta.validation.constraints.Size(max=10000)
    private String explanation;
    private Boolean isCommonMistake;
    @jakarta.validation.constraints.Size(max=100)
    private String mistakeCategory;
}
