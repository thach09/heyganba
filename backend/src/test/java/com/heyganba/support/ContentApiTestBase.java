package com.heyganba.support;

import com.heyganba.repository.AuditLogRepository;
import com.heyganba.repository.ExamResultRepository;
import com.heyganba.repository.GrammarExerciseRepository;
import com.heyganba.repository.GrammarRuleRepository;
import com.heyganba.repository.KanaRepository;
import com.heyganba.repository.KanjiPracticeProgressRepository;
import com.heyganba.repository.KanjiRepository;
import com.heyganba.repository.LessonRepository;
import com.heyganba.repository.MockExamRepository;
import com.heyganba.repository.RadicalRepository;
import com.heyganba.repository.RoleRepository;
import com.heyganba.repository.SrsReviewRepository;
import com.heyganba.repository.StreakRepository;
import com.heyganba.repository.StudyActivityRepository;
import com.heyganba.repository.UserRepository;
import com.heyganba.repository.VocabularyRepository;
import com.heyganba.config.JwtTokenProvider;
import com.heyganba.config.UserPrincipal;
import com.heyganba.model.entity.GrammarExercise;
import com.heyganba.model.entity.GrammarRule;
import com.heyganba.model.entity.Kana;
import com.heyganba.model.entity.Kanji;
import com.heyganba.model.entity.Role;
import com.heyganba.model.entity.User;
import com.heyganba.model.entity.Vocabulary;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.model.enums.RoleName;
import com.heyganba.service.RateLimiterService;
import com.heyganba.service.srs.SrsDueCache;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Base class cho các test có dữ liệu nội dung (kana/vocabulary/kanji/grammar).
 *
 * Lý do tồn tại: các test class dùng chung 1 Spring context + 1 DB H2, nên nếu mỗi class tự xoá dữ liệu
 * theo thứ tự khác nhau sẽ vỡ khoá ngoại (ví dụ xoá `lessons` khi còn `vocabulary`/`kanji`/`grammar_rules`
 * tham chiếu tới). Base này xoá tập trung, đúng thứ tự phụ thuộc, chạy trước mọi @BeforeEach của lớp con.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class ContentApiTestBase {

    @Autowired
    protected GrammarExerciseRepository grammarExerciseRepository;

    @Autowired
    protected GrammarRuleRepository grammarRuleRepository;

    @Autowired
    protected KanjiPracticeProgressRepository kanjiProgressRepository;

    @Autowired
    protected KanjiRepository kanjiRepository;

    @Autowired
    protected RadicalRepository radicalRepository;

    @Autowired
    protected KanaRepository kanaRepository;

    @Autowired
    protected SrsReviewRepository srsReviewRepository;

    @Autowired
    protected StreakRepository streakRepository;

    @Autowired
    protected VocabularyRepository vocabularyRepository;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected RoleRepository roleRepository;

    @Autowired
    protected LessonRepository lessonRepository;

    @Autowired
    protected SrsDueCache srsDueCache;

    @Autowired
    protected ExamResultRepository examResultRepository;

    @Autowired
    protected MockExamRepository mockExamRepository;

    @Autowired
    protected StudyActivityRepository studyActivityRepository;

    @Autowired
    protected AuditLogRepository auditLogRepository;

    @Autowired
    protected com.heyganba.repository.RevokedTokenRepository revokedTokenRepository;

    @Autowired
    protected com.heyganba.repository.ReadingPassageRepository readingPassageRepository;

    @Autowired
    protected com.heyganba.repository.VocabNotebookRepository notebookRepository;

    /**
     * Rate limiter là state trong memory của Spring context — context được chia sẻ giữa các test class,
     * nên phải reset ở đây. Nếu không, test A đăng ký/đăng nhập nhiều lần sẽ làm test B nhận 429
     * (lỗi phụ thuộc thứ tự chạy, giống hệt vấn đề khoá ngoại đã gặp trước đây).
     */
    @Autowired
    protected RateLimiterService rateLimiterService;

    /** Dùng cho test admin (mã hoá mật khẩu user admin) và sinh token admin trực tiếp. */
    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void cleanContentTables() {
        rateLimiterService.reset();
        if (revokedTokenRepository != null) {
            revokedTokenRepository.deleteAll();
        }
        examResultRepository.deleteAll();
        mockExamRepository.deleteAll();
        studyActivityRepository.deleteAll();
        auditLogRepository.deleteAll();
        readingPassageRepository.deleteAll();
        notebookRepository.deleteAll();
        grammarExerciseRepository.deleteAll();
        grammarRuleRepository.deleteAll();
        kanjiProgressRepository.deleteAll();
        kanjiRepository.deleteAll();
        radicalRepository.deleteAll();
        srsReviewRepository.deleteAll();
        streakRepository.deleteAll();
        kanaRepository.deleteAll();
        vocabularyRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();
        lessonRepository.deleteAll();
        srsDueCache.clearAll();
    }

    // ------------------------------------------------------------------
    // Hỗ trợ test: seed nội dung + token admin
    // ------------------------------------------------------------------

    /**
     * Nội dung seed trong test mặc định là "ĐÃ DUYỆT".
     *
     * Vì sao: từ khi có quy tắc {@code ContentAccess}, user thường CHỈ đọc được nội dung `APPROVED`, mà mọi entity
     * nội dung lại mặc định `PENDING_REVIEW`. Các test API hiện có đều kiểm tra "user thường đọc được nội dung vừa seed",
     * nên seed phải là APPROVED — test nào cần bản nháp thì set `PENDING_REVIEW` tường minh
     * (xem {@code ContentReviewVisibilityTest}).
     */
    protected Kana persistApprovedKana(Kana kana) {
        kana.setReviewStatus(ReviewStatus.APPROVED);
        return kanaRepository.save(kana);
    }

    protected Kanji persistApprovedKanji(Kanji kanji) {
        kanji.setReviewStatus(ReviewStatus.APPROVED);
        return kanjiRepository.save(kanji);
    }

    protected Vocabulary persistApprovedVocabulary(Vocabulary vocabulary) {
        vocabulary.setReviewStatus(ReviewStatus.APPROVED);
        return vocabularyRepository.save(vocabulary);
    }

    protected GrammarRule persistApprovedRule(GrammarRule rule) {
        rule.setReviewStatus(ReviewStatus.APPROVED);
        return grammarRuleRepository.save(rule);
    }

    protected GrammarExercise persistApprovedExercise(GrammarExercise exercise) {
        exercise.setReviewStatus(ReviewStatus.APPROVED);
        return grammarExerciseRepository.save(exercise);
    }

    /** Tạo user ADMIN trong DB rồi trả access token (không cần đi qua /auth/login). */
    protected String adminAccessToken(String email) {
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseGet(() -> roleRepository.save(Role.builder()
                        .name(RoleName.ROLE_ADMIN)
                        .description("Admin")
                        .build()));

        User admin = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode("AdminPass123!"))
                .fullName("System Admin")
                .role(adminRole)
                .isActive(true)
                .build();

        return jwtTokenProvider.generateAccessToken(UserPrincipal.create(userRepository.save(admin)));
    }
}
