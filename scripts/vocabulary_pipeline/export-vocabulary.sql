-- Read-only export from an ISOLATED V14+ snapshot. Effective getter order matches Vocabulary.java.
-- No user, notebook, exam answer, credential or signing-key data is exported.
SELECT COALESCE(json_agg(x ORDER BY id),'[]'::json) FROM (
  SELECT v.id,v.word,v.traditional,
         COALESCE(v.pinyin,v.reading) AS reading,
         COALESCE(v.meaning_vi,v.meaning) AS meaning,
         v.part_of_speech AS "partOfSpeech",
         COALESCE(v.han_viet,v.sino_vietnamese) AS "hanViet",
         COALESCE(v.example_zh,v.example_sentence) AS "exampleZh",
         COALESCE(v.example_pinyin,v.example_reading) AS "examplePinyin",
         COALESCE(v.example_vi,v.example_meaning) AS "exampleVi",
         v.hsk_level,v.curriculum_version,v.review_status,
         COALESCE((SELECT max(a.id) FROM audit_logs a WHERE a.table_name='vocabulary'
                   AND a.record_id=v.id AND a.action IN ('CREATE','UPDATE','ARCHIVE','REJECT','PROVENANCE','PROVENANCE_UPDATE','PUBLISH_REVOKE')),0) AS "eligibilityRevision"
  FROM vocabulary v
) x;
