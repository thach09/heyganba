package com.heyganba.model.entity;

import com.heyganba.model.enums.ReviewStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "grammar_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GrammarRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String structure;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String explanation;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "original_number")
    private Integer originalNumber;

    /**
     * Số gốc của tài liệu nguồn (VD "doc:#12") — dùng để đối chiếu ngược lại giáo trình khi cần sửa nội dung.
     * KHÔNG trả ra API (ẩn với user); UI chỉ hiển thị số liên tục theo thứ tự dạy (`orderIndex`).
     */
    @Column(name = "source_ref", length = 50)
    private String sourceRef;

    /** Trạng thái duyệt nội dung — mặc định chờ duyệt (xem {@link com.heyganba.model.enums.ReviewStatus}). */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 20)
    private ReviewStatus reviewStatus = ReviewStatus.PENDING_REVIEW;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
