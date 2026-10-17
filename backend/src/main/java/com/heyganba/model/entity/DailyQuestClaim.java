package com.heyganba.model.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity @Table(name="daily_quest_claims", uniqueConstraints=@UniqueConstraint(columnNames={"user_id","claim_date","quest_code"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DailyQuestClaim {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional=false) @JoinColumn(name="user_id") private User user;
    @Column(name="claim_date",nullable=false) private LocalDate claimDate;
    @Column(name="quest_code",nullable=false,length=20) private String questCode;
    @Column(name="reward_exp",nullable=false) private int rewardExp;
    @Column(name="reward_bamboo",nullable=false) private int rewardBamboo;
}
