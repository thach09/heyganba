from pathlib import Path
p=Path('backend/src/test/java/com/heyganba/PostgresSchemaStagingRehearsalTest.java')
s=p.read_text(encoding='utf-8').replace('V1-V8','V1-V9').replace('staging M5','staging M6').replace('isEqualTo(8); //','isEqualTo(9); //')
s=s.replace("'4', '5', '6', '7', '8'", "'4', '5', '6', '7', '8', '9'")
marker='assertThat(rs.getString("version")).isEqualTo("8");\n                assertThat(rs.getBoolean("success")).isTrue();'
s=s.replace(marker,marker+'\n                assertThat(rs.next()).isTrue();\n                assertThat(rs.getString("version")).isEqualTo("9");\n                assertThat(rs.getBoolean("success")).isTrue();')
# Capture counts for EVERY seeded table, then rerun all six SQL seeds twice.
a=s.index('            String fullV4Sql');b=s.index('            // Assert staging lessons',a)
s=s[:a]+'''            String[] tables = {"lessons", "vocabulary", "hanzi", "radicals", "grammar_rules", "grammar_exercises", "reading_passages", "mock_exams", "mock_exam_presets"};
            java.util.Map<String, Long> before = new java.util.HashMap<>();
            for (String table : tables) {
                try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM " + table)) { rs.next(); before.put(table, rs.getLong(1)); }
            }
            String[] migrations = {
                "V4__sample_lesson_greetings.sql", "V5__hsk1_thematic_curriculum_expansion.sql",
                "V6__hsk1_standard_course_grammar_and_exams.sql", "V7__hsk1_complete_150_vocab_and_hanzi_radicals.sql",
                "V8__hsk2_standard_course_and_approve_all_curriculum.sql", "V9__hsk1_to_hsk6_complete_curriculum_and_grammar.sql"
            };
            for (int repeat = 0; repeat < 2; repeat++) {
                for (String migration : migrations) stmt.execute(loadStagingMigrationSql(migration));
                for (String table : tables) {
                    try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM " + table)) {
                        rs.next(); assertThat(rs.getLong(1)).as("Idempotency: %s", table).isEqualTo(before.get(table));
                    }
                }
            }
            for (int level = 1; level <= 6; level++) {
                for (String table : List.of("vocabulary", "grammar_rules", "hanzi", "reading_passages")) {
                    try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM " + table + " WHERE hsk_level = " + level + " AND review_status = 'APPROVED'")) {
                        rs.next(); assertThat(rs.getInt(1)).as("%s HSK %d", table, level).isPositive();
                        if (level >= 3 && table.equals("vocabulary")) assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(45);
                        if (level >= 3 && table.equals("grammar_rules")) assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(5);
                    }
                }
                try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM grammar_exercises e JOIN grammar_rules r ON r.id=e.grammar_rule_id WHERE r.hsk_level=" + level + " AND e.review_status='APPROVED' AND NOT e.needs_human_check")) {
                    rs.next(); assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(level >= 3 ? 10 : 1);
                }
            }
            for (String table : tables) {
                try (ResultSet rs = stmt.executeQuery("SELECT nextval(pg_get_serial_sequence('" + table + "','id')), COALESCE((SELECT MAX(id) FROM " + table + "),0)")) {
                    rs.next(); assertThat(rs.getLong(1)).as("Sequence: %s", table).isGreaterThan(rs.getLong(2));
                }
            }
            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM mock_exam_presets WHERE review_status='APPROVED' AND maximum_score=CASE WHEN hsk_level<=2 THEN 200 ELSE 300 END AND passing_score=CASE WHEN hsk_level<=2 THEN 120 ELSE 180 END")) {
                rs.next(); assertThat(rs.getInt(1)).isEqualTo(6);
            }

'''+s[b:]
s=s.replace('ps.setString(1, "试");','ps.setString(1, "龘");')
p.write_text(s,encoding='utf-8')
p=Path('scripts/verify-postgres-m21.ps1');s=p.read_text(encoding='utf-8').replace('M5 (V1-V8)','M6 (V1-V9)').replace('V1-V8','V1-V9').replace('M2.2 PostgreSQL','M6 PostgreSQL').replace('150 tu HSK 1 + 68 tu HSK 2 (tong >= 218 tu)','HSK 1-6 approved, V4-V9 twice idempotent, all sequences');p.write_text(s,encoding='utf-8')

# Repair the pre-existing stale M5 unit test against the implementation actually in this checkout.
p=Path('backend/src/test/java/com/heyganba/AdminContentServiceTest.java');s=p.read_text(encoding='utf-8');a=s.index('        when(vocabularyRepository.bulkApprovePending())');b=s.index('        verify(auditLogService).logAction',a)
s=s[:a]+'''        Vocabulary vocabulary = Vocabulary.builder().reviewStatus(com.heyganba.model.enums.ReviewStatus.PENDING_REVIEW).build();
        Kanji hanzi = Kanji.builder().reviewStatus(com.heyganba.model.enums.ReviewStatus.PENDING_REVIEW).build();
        GrammarExercise exercise = GrammarExercise.builder().reviewStatus(com.heyganba.model.enums.ReviewStatus.PENDING_REVIEW).build();
        com.heyganba.model.entity.GrammarRule rule = com.heyganba.model.entity.GrammarRule.builder().reviewStatus(com.heyganba.model.enums.ReviewStatus.PENDING_REVIEW).build();
        com.heyganba.model.entity.Kana kana = com.heyganba.model.entity.Kana.builder().reviewStatus(com.heyganba.model.enums.ReviewStatus.PENDING_REVIEW).build();
        when(vocabularyRepository.findAll()).thenReturn(java.util.List.of(vocabulary));
        when(kanjiRepository.findAll()).thenReturn(java.util.List.of(hanzi));
        when(grammarExerciseRepository.findAll()).thenReturn(java.util.List.of(exercise));
        when(grammarRuleRepository.findAll()).thenReturn(java.util.List.of(rule));
        when(kanaRepository.findAll()).thenReturn(java.util.List.of(kana));
        int total = adminContentService.approveAllPending(admin);
        assertThat(total).isEqualTo(5);
        assertThat(vocabulary.getReviewStatus()).isEqualTo(com.heyganba.model.enums.ReviewStatus.APPROVED);
        assertThat(hanzi.getReviewStatus()).isEqualTo(com.heyganba.model.enums.ReviewStatus.APPROVED);
        assertThat(exercise.getReviewStatus()).isEqualTo(com.heyganba.model.enums.ReviewStatus.APPROVED);
        assertThat(rule.getReviewStatus()).isEqualTo(com.heyganba.model.enums.ReviewStatus.APPROVED);
        assertThat(kana.getReviewStatus()).isEqualTo(com.heyganba.model.enums.ReviewStatus.APPROVED);
'''+s[b:];s=s.replace('Approved 22 pending items','Approved 5 pending items');p.write_text(s,encoding='utf-8')
