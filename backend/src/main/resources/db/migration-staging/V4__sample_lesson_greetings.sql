-- =========================================================
-- V4: Seed Sample Lesson M2.1 - Chào hỏi và giới thiệu bản thân
-- Trạng thái: PENDING_REVIEW (Chờ thẩm định học thuật, không promote prod)
-- =========================================================

-- 1. Cập nhật các từ vựng nháp từ trước sang PENDING_REVIEW để bảo vệ luồng user thường
UPDATE vocabulary
SET review_status = 'PENDING_REVIEW',
    needs_human_check = true
WHERE review_status = 'APPROVED';

-- 2. Thêm bài học mẫu M2.1: Chào hỏi và giới thiệu bản thân
INSERT INTO lessons (id, slug, title, description, curriculum_level, order_index)
VALUES (
    4,
    'intro-greetings',
    'Chào hỏi và giới thiệu bản thân',
    'Bài học mở đầu giao tiếp căn bản: làm quen cách xưng hô, chào hỏi, hỏi tên, giới thiệu họ tên, quốc tịch và nói lời cảm ơn, tạm biệt.',
    'Nhập môn',
    1
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    curriculum_level = EXCLUDED.curriculum_level;

-- 3. Thêm 10 từ vựng cốt lõi cho bài học mẫu (đối chiếu Giáo trình Hán ngữ Bài 1 và 2)
INSERT INTO vocabulary (
    word, traditional, pinyin, pinyin_normalized, han_viet,
    part_of_speech, meaning_vi, hsk_level, lesson_number,
    example_zh, example_pinyin, example_vi, lesson_id,
    review_status, needs_human_check, source_ref
)
VALUES
('你', '你', 'nǐ', 'ni ni3', 'nhĩ', 'Đại từ', 'Bạn, anh, chị (ngôi thứ hai số ít)', NULL, 1, '你好！很高兴认识你。', 'Nǐ hǎo! Hěn gāoxìng rènshi nǐ.', 'Xin chào! Rất vui được làm quen với bạn.', 4, 'PENDING_REVIEW', true, 'Bản nháp M2.1 chưa xác minh nguồn (Dự kiến: Hán ngữ T1 Bài 1 - PENDING_REVIEW)'),
('好', '好', 'hǎo', 'hao hao3', 'hảo', 'Tính từ', 'Tốt, đẹp, khỏe, an lành', NULL, 1, '我很好，谢谢你。', 'Wǒ hěn hǎo, xièxie nǐ.', 'Tôi rất khỏe, cảm ơn bạn.', 4, 'PENDING_REVIEW', true, 'Bản nháp M2.1 chưa xác minh nguồn (Dự kiến: Hán ngữ T1 Bài 1 - PENDING_REVIEW)'),
('我', '我', 'wǒ', 'wo wo3', 'ngã', 'Đại từ', 'Tôi, mình, em (ngôi thứ nhất số ít)', NULL, 1, '我是越南人。', 'Wǒ shì yuènán rén.', 'Tôi là người Việt Nam.', 4, 'PENDING_REVIEW', true, 'Bản nháp M2.1 chưa xác minh nguồn (Dự kiến: Hán ngữ T1 Bài 5 - PENDING_REVIEW)'),
('叫', '叫', 'jiào', 'jiao jiao4', 'khiếu', 'Động từ', 'Gọi là, tên là', NULL, 1, '我叫李明。', 'Wǒ jiào Lǐ Míng.', 'Tôi tên là Lý Minh.', 4, 'PENDING_REVIEW', true, 'Bản nháp M2.1 chưa xác minh nguồn (Dự kiến: Hán ngữ T1 Bài 6 - PENDING_REVIEW)'),
('什么', '什麼', 'shénme', 'shenme shen2me', 'thập ma', 'Đại từ nghi vấn', 'Cái gì, gì', NULL, 1, '你叫什么名字？', 'Nǐ jiào shénme míngzi?', 'Bạn tên là gì?', 4, 'PENDING_REVIEW', true, 'Bản nháp M2.1 chưa xác minh nguồn (Dự kiến: Hán ngữ T1 Bài 6 - PENDING_REVIEW)'),
('名字', '名字', 'míngzi', 'mingzi ming2zi', 'danh tự', 'Danh từ', 'Tên, họ tên', NULL, 1, '我的名字叫王平。', 'Wǒ de míngzi jiào Wáng Píng.', 'Tên của tôi là Vương Bình.', 4, 'PENDING_REVIEW', true, 'Bản nháp M2.1 chưa xác minh nguồn (Dự kiến: Hán ngữ T1 Bài 6 - PENDING_REVIEW)'),
('是', '是', 'shì', 'shi shi4', 'thị', 'Động từ', 'Là, phải, đúng', NULL, 1, '他是汉语老师。', 'Tā shì hànyǔ lǎoshī.', 'Anh ấy là giáo viên tiếng Trung.', 4, 'PENDING_REVIEW', true, 'Bản nháp M2.1 chưa xác minh nguồn (Dự kiến: Hán ngữ T1 Bài 5 - PENDING_REVIEW)'),
('人', '人', 'rén', 'ren ren2', 'nhân', 'Danh từ', 'Người, con người', NULL, 1, '你是哪国人？', 'Nǐ shì nǎ guó rén?', 'Bạn là người nước nào?', 4, 'PENDING_REVIEW', true, 'Bản nháp M2.1 chưa xác minh nguồn (Dự kiến: Hán ngữ T1 Bài 5 - PENDING_REVIEW)'),
('谢谢', '謝謝', 'xièxie', 'xiexie xie4xie', 'tạ tạ', 'Động từ', 'Cảm ơn', NULL, 1, '谢谢你的热情帮助。', 'Xièxie nǐ de rèqíng bāngzhù.', 'Cảm ơn sự giúp đỡ nhiệt tình của bạn.', 4, 'PENDING_REVIEW', true, 'Bản nháp M2.1 chưa xác minh nguồn (Dự kiến: Hán ngữ T1 Bài 2 - PENDING_REVIEW)'),
('再见', '再見', 'zàijiàn', 'zaijian zai4jian4', 'tái kiến', 'Động từ', 'Tạm biệt, hẹn gặp lại', NULL, 1, '明天见，再见！', 'Míngtiān jiàn, zàijiàn!', 'Ngày mai gặp lại, tạm biệt!', 4, 'PENDING_REVIEW', true, 'Bản nháp M2.1 chưa xác minh nguồn (Dự kiến: Hán ngữ T1 Bài 3 - PENDING_REVIEW)')
ON CONFLICT DO NOTHING;
