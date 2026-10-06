-- Reuse reviewed course content, with no new Japanese teaching material.
ALTER TABLE vocab_notebooks ADD COLUMN sample_lesson_slug VARCHAR(50) UNIQUE;

INSERT INTO vocab_notebooks (title, description, is_public_sample, sample_lesson_slug)
SELECT left(l.title, 170) || ' — Từ vựng cơ bản',
       'Nhóm mẫu từ giáo trình đã được duyệt. Nhận bản sao để theo dõi từng từ.', true, l.slug
FROM lessons l
WHERE EXISTS (SELECT 1 FROM vocabulary v WHERE v.lesson_id = l.id AND v.review_status = 'APPROVED')
ON CONFLICT (sample_lesson_slug) DO NOTHING;

INSERT INTO vocab_notebook_items (notebook_id, vocabulary_id)
SELECT n.id, v.id FROM vocab_notebooks n
JOIN lessons l ON n.sample_lesson_slug = l.slug
JOIN vocabulary v ON v.lesson_id = l.id AND v.review_status = 'APPROVED'
WHERE n.is_public_sample = true
ON CONFLICT (notebook_id, vocabulary_id) DO NOTHING;
