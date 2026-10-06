package com.heyganba.model.entity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity @Table(name = "notebook_practice_sessions")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class NotebookPracticeSession {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "notebook_id", nullable = false) private Long notebookId;
    @Column(name = "correct_count", nullable = false) private Integer correctCount;
    @Column(name = "total_count", nullable = false) private Integer totalCount;
    @Column(name = "exp_earned", nullable = false) private Integer expEarned;
}
