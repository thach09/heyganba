package com.heyganba;

import com.heyganba.model.entity.*;
import com.heyganba.model.enums.ReviewStatus;
import com.heyganba.service.KanjiService;
import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import static org.assertj.core.api.Assertions.assertThat;

class HanziVocabularyWithdrawalTest extends ContentApiTestBase {
    @Autowired KanjiService hanzi;

    @Test void embeddedDraftCompoundsUseCurrentPublishedVocabularyAndDisappearOnWithdrawal() throws Exception {
        var lesson = lessonRepository.save(Lesson.builder().slug("qa-withdrawal").title("QA fixture")
                .curriculumLevel("HSK1").orderIndex(1).build());
        var character = persistApprovedKanji(Kanji.builder().character("好").pinyin("hǎo")
                .meaningVi("QA fixture only").exampleWordsJson("[{\"word\":\"你好\",\"pinyin\":\"stale\",\"vi\":\"unverified draft\"}]").build());
        var word = persistApprovedVocabulary(Vocabulary.builder().word("你好").pinyin("nǐ hǎo")
                .meaningVi("QA current verified gloss").lesson(lesson).build());
        var before = hanzi.getKanji(null, null, null, null).getFirst().exampleWordsJson();
        assertThat(before).contains("nǐ hǎo", "QA current verified gloss").doesNotContain("unverified draft", "stale");
        word.setReviewStatus(ReviewStatus.PENDING_REVIEW);
        vocabularyRepository.save(word);
        assertThat(hanzi.getKanji(null, null, null, null).getFirst().exampleWordsJson()).isEqualTo("[]");
        // Alternative dictionary DTO paths must never serialize the raw embedded JSON.
        assertThat(com.heyganba.dto.kanji.KanjiResponse.from(character, 0).exampleWordsJson()).isEqualTo("[]");
    }
}
