package com.heyganba.support;

import com.heyganba.repository.AuditLogRepository;
import com.heyganba.repository.ExamResultRepository;
import com.heyganba.repository.GrammarExerciseRepository;
import com.heyganba.repository.GrammarRuleRepository;
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
import com.heyganba.service.RateLimiterService;
import com.heyganba.service.srs.SrsDueCache;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
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

    /**
     * Rate limiter là state trong memory của Spring context — context được chia sẻ giữa các test class,
     * nên phải reset ở đây. Nếu không, test A đăng ký/đăng nhập nhiều lần sẽ làm test B nhận 429
     * (lỗi phụ thuộc thứ tự chạy, giống hệt vấn đề khoá ngoại đã gặp trước đây).
     */
    @Autowired
    protected RateLimiterService rateLimiterService;

    @BeforeEach
    void cleanContentTables() {
        rateLimiterService.reset();
        examResultRepository.deleteAll();
        mockExamRepository.deleteAll();
        studyActivityRepository.deleteAll();
        auditLogRepository.deleteAll();
        grammarExerciseRepository.deleteAll();
        grammarRuleRepository.deleteAll();
        kanjiProgressRepository.deleteAll();
        kanjiRepository.deleteAll();
        radicalRepository.deleteAll();
        srsReviewRepository.deleteAll();
        streakRepository.deleteAll();
        vocabularyRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();
        lessonRepository.deleteAll();
        srsDueCache.clearAll();
    }
}
