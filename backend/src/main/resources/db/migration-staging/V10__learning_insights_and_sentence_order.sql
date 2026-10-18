-- Daily rewards are awarded once per learner/day by the authenticated service.
CREATE TABLE IF NOT EXISTS companion_wallets (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bamboo INTEGER NOT NULL CHECK (bamboo >= 0),
    affection_exp INTEGER NOT NULL CHECK (affection_exp >= 0)
);
CREATE TABLE IF NOT EXISTS daily_quest_claims (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    claim_date DATE NOT NULL,
    quest_code VARCHAR(20) NOT NULL,
    reward_exp INTEGER NOT NULL,
    reward_bamboo INTEGER NOT NULL,
    UNIQUE(user_id,claim_date,quest_code)
);
ALTER TABLE grammar_exercises ADD COLUMN IF NOT EXISTS exercise_type VARCHAR(24) NOT NULL DEFAULT 'MULTIPLE_CHOICE';
-- Reuse sentences already approved in V2/V9. No new academic assertions.
-- Alternative valid word orders must still be reviewed; these drills ask for the demonstrated example.
INSERT INTO grammar_exercises(grammar_rule_id,question_text,options_json,correct_answer,explanation,is_common_mistake,review_status,needs_human_check,source_ref,exercise_type)
SELECT g.id,'Sắp xếp theo câu mẫu đã học: ' || s.vi,s.tokens,s.answer,s.vi,FALSE,'APPROVED',FALSE,'derived: approved V2/V9 example; audit-2026-10-17','SENTENCE_ORDER'
FROM (VALUES
 (1,'Câu phán đoán với 是','Tôi là học sinh.','["我","是","学生","。"]','我是学生。'),
 (2,'Bổ ngữ trình độ với trợ từ 得','Anh ấy chạy rất nhanh.','["他","跑","得","很","快","。"]','他跑得很快。'),
 (3,'Câu chữ 把','Xin đặt sách lên bàn.','["请","把","书","放在","桌子上","。"]','请把书放在桌子上。'),
 (4,'Bổ ngữ khả năng','Quyển sách này tôi đọc hiểu được.','["这本书","我","看","得","懂","。"]','这本书我看得懂。'),
 (5,'Danh từ hóa với 所','Đây là tình hình mà tôi biết.','["这","是","我","所","了解","的","情况","。"]','这是我所了解的情况。'),
 (6,'Giả định trang trọng với 倘若 / 假使','Nếu có cơ hội, tôi sẽ đi tham quan.','["倘若","有机会","，","我","便","去参观","。"]','倘若有机会，我便去参观。')
) AS s(level,title,vi,tokens,answer)
JOIN grammar_rules g ON g.hsk_level=s.level AND g.title=s.title AND g.review_status='APPROVED'
WHERE NOT EXISTS(SELECT 1 FROM grammar_exercises e WHERE e.grammar_rule_id=g.id AND e.exercise_type='SENTENCE_ORDER' AND e.correct_answer=s.answer);
SELECT setval(pg_get_serial_sequence('grammar_exercises','id'), GREATEST(COALESCE((SELECT MAX(id) FROM grammar_exercises),0),1), EXISTS(SELECT 1 FROM grammar_exercises));
