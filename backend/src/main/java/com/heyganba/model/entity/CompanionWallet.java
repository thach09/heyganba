package com.heyganba.model.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="companion_wallets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompanionWallet {
    @Id @Column(name="user_id") private Long userId;
    @MapsId @OneToOne(optional=false) @JoinColumn(name="user_id") private User user;
    @Column(nullable=false) private int bamboo;
    @Column(name="affection_exp",nullable=false) private int affectionExp;
}
