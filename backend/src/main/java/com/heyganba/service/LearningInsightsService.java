package com.heyganba.service;

import com.heyganba.common.exception.BadRequestException;
import com.heyganba.common.exception.ResourceNotFoundException;
import com.heyganba.model.entity.*;
import com.heyganba.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class LearningInsightsService {
    private final JdbcTemplate jdbc;
    private final VocabularyRepository vocabularyRepository;
    private final VocabularyPublicationAuthority publication;
    private final UserRepository users;
    private final DailyQuestClaimRepository claims;
    private final CompanionWalletRepository wallets;
    private final StreakService streak;
    public record Level(int level,long learnedWords,long totalWords,long practicedGrammar,long totalGrammar) {}
    public record Quest(String code,String title,String description,String route,int progress,int target,int exp,int bamboo,boolean claimed) {}
    public record Wallet(int bamboo,int affectionExp) {}
    public record Insights(List<Level> levels,List<Quest> quests,Wallet wallet) {}
    @Transactional
    public Insights insights(Long userId) {
        User user = locked(userId);
        var published = vocabularyRepository.findCourseWords().stream()
                .filter(v -> v.getReviewStatus() == com.heyganba.model.enums.ReviewStatus.APPROVED && publication.proof(v).isPresent()).toList();
        var learnedIds = new HashSet<>(jdbc.queryForList("SELECT vocabulary_id FROM srs_reviews WHERE user_id=? AND repetitions>0", Long.class, userId));
        Map<Integer,Long> totals = new HashMap<>(), learned = new HashMap<>();
        for (int level = 1; level <= 6; level++) {
            final int currentLevel = level;
            totals.put(level, published.stream().filter(v -> Objects.equals(v.getHskLevel(), currentLevel)).map(Vocabulary::getWord).distinct().count());
            learned.put(level, published.stream().filter(v -> Objects.equals(v.getHskLevel(), currentLevel) && learnedIds.contains(v.getId())).map(Vocabulary::getWord).distinct().count());
        }
        Map<Integer,Long> rules=byLevel("SELECT hsk_level,COUNT(*) FROM grammar_rules WHERE review_status='APPROVED' GROUP BY hsk_level");
        Map<Integer,Long> practiced=byLevel("SELECT g.hsk_level,COUNT(DISTINCT g.id) FROM grammar_rules g JOIN grammar_exercises e ON e.grammar_rule_id=g.id JOIN learning_attempts a ON a.content_ref=CONCAT('grammar-exercise:',CAST(e.id AS VARCHAR)) WHERE a.user_id=? AND a.result='CORRECT' AND g.review_status='APPROVED' GROUP BY g.hsk_level",userId);
        List<Level> levels = new ArrayList<>();
        for (int level=1;level<=6;level++) levels.add(new Level(level,learned.getOrDefault(level,0L),totals.getOrDefault(level,0L),practiced.getOrDefault(level,0L),rules.getOrDefault(level,0L)));
        return new Insights(levels,todayQuests(userId),dto(wallet(user)));
    }
    private Map<Integer,Long> byLevel(String sql,Object... args) {
        Map<Integer,Long> result=new HashMap<>();
        jdbc.query(sql,rs -> { while(rs.next()) result.put(rs.getInt(1),rs.getLong(2)); return result; },args);
        return result;
    }
    @Transactional
    public Wallet getWallet(Long userId) { return dto(wallet(locked(userId))); }
    private long count(String sql,Object... args) { Long value=jdbc.queryForObject(sql,Long.class,args); return value == null ? 0 : value; }
    private List<Quest> todayQuests(Long userId) {
        var date=streak.today(Instant.now());
        var claimed=claims.findByUserIdAndClaimDate(userId,date).stream().map(DailyQuestClaim::getQuestCode).toList();
        int srs=(int)count("SELECT COALESCE(SUM(item_count),0) FROM study_activities WHERE user_id=? AND activity_date=? AND source='FLASHCARD'",userId,date);
        int writing=(int)count("SELECT COALESCE(SUM(correct_count),0) FROM study_activities WHERE user_id=? AND activity_date=? AND source='HANZI'",userId,date);
        int grammar=(int)count("SELECT COALESCE(SUM(correct_count),0) FROM study_activities WHERE user_id=? AND activity_date=? AND source='GRAMMAR'",userId,date);
        int exam=(int)count("SELECT COALESCE(SUM(item_count),0) FROM study_activities WHERE user_id=? AND activity_date=? AND source='EXAM'",userId,date);
        return List.of(new Quest("SRS","Ôn tập Flashcard HSK","Ôn 10 thẻ SRS","/vocabulary",Math.min(10,srs),10,30,2,claimed.contains("SRS")),new Quest("WRITING","Luyện viết chữ Hán","Hoàn thành 3 lượt viết đúng","/hanzi",Math.min(3,writing),3,25,2,claimed.contains("WRITING")),new Quest("GRAMMAR_EXAM","Ngữ pháp & Khảo thí","Đúng 5 câu ngữ pháp hoặc nộp 1 đề thi","/grammar",Math.min(5,exam>0?5:grammar),5,50,3,claimed.contains("GRAMMAR_EXAM")));
    }
    @Transactional
    public Insights claim(Long userId,String code) {
        User user=locked(userId);
        Quest quest=todayQuests(userId).stream().filter(q->q.code().equals(code)).findFirst().orElseThrow(()->new BadRequestException("Nhiệm vụ không hợp lệ."));
        if (!quest.claimed()) {
            if (quest.progress()<quest.target()) throw new BadRequestException("Bạn chưa hoàn thành nhiệm vụ này.");
            claims.save(DailyQuestClaim.builder().user(user).claimDate(streak.today(Instant.now())).questCode(code).rewardExp(quest.exp()).rewardBamboo(quest.bamboo()).build());
            CompanionWallet wallet=wallet(user); wallet.setBamboo(wallet.getBamboo()+quest.bamboo()); wallets.save(wallet);
        }
        return insights(userId);
    }
    @Transactional
    public Wallet feed(Long userId) {
        CompanionWallet wallet=wallet(locked(userId));
        if (wallet.getBamboo()<1) throw new BadRequestException("Bạn chưa có măng trúc. Hãy hoàn thành nhiệm vụ hôm nay.");
        wallet.setBamboo(wallet.getBamboo()-1); wallet.setAffectionExp(wallet.getAffectionExp()+25); wallets.save(wallet);
        return dto(wallet);
    }
    private User locked(Long id) { return users.findLockedById(id).orElseThrow(()->new ResourceNotFoundException("Người dùng","id",id)); }
    private CompanionWallet wallet(User user) { return wallets.findById(user.getId()).orElseGet(()->wallets.save(CompanionWallet.builder().user(user).bamboo(6).affectionExp(0).build())); }
    private Wallet dto(CompanionWallet wallet) { return new Wallet(wallet.getBamboo(),wallet.getAffectionExp()); }
}
