-- =========================================================
-- V2: Seed Roles, Initial Admin User, and Dekiru Lessons
-- =========================================================

-- 1. Insert Core Roles
INSERT INTO roles (name, description) VALUES
    ('ROLE_ADMIN', 'System Administrator with full access to admin portal and content management'),
    ('ROLE_USER', 'Standard student/learner account')
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Initial Admin Account
-- Default Email: admin@heyganba.vn
-- Default Initial Password: Admin@HeyGanba2026!
INSERT INTO users (email, password_hash, full_name, role_id, is_active)
SELECT
    'admin@heyganba.vn',
    '$2a$10$lc2gbEBnoKI7XBTTQBOffePZpp5xTWeOPFAeLCc9rC.yr/ip9al6y',
    'HeyGanba Administrator',
    r.id,
    true
FROM roles r
WHERE r.name = 'ROLE_ADMIN'
ON CONFLICT (email) DO NOTHING;

-- 3. Seed Lessons based on Dekiru Nihongo Curriculum (JPD113 / JPD123)
-- Reference: docs/Internal/content-mapping-fpt-curriculum.md
INSERT INTO lessons (slug, title, description, curriculum_level, order_index) VALUES
    ('jpd113-b1', 'Bài 1 — Chào hỏi & Làm quen', 'Chào hỏi, giới thiệu bản thân, các số đếm cơ bản và thông tin cá nhân', 'JPD113', 1),
    ('jpd113-b2', 'Bài 2 — Đồ vật & Địa điểm', 'Chỉ định từ kore/sore/are, sở hữu, nguồn gốc xuất xứ, vị trí đồ vật và địa điểm', 'JPD113', 2),
    ('jpd113-b3', 'Bài 3 — Mua sắm & Thời gian', 'Hỏi giá tiền, tầng lầu, thời gian (giờ/phút), chia động từ dạng ます cơ bản', 'JPD113', 3),
    ('jpd123-b4', 'Bài 4 — Sở thích & Mong muốn', 'Chia tính từ đuôi い/な, mẫu câu mong muốn V-たい, N-がほしい', 'JPD123', 4),
    ('jpd123-b5', 'Bài 5 — Kế hoạch & Chuyến đi', 'Mục đích chuyến đi (V-stem に 行きます), phương tiện di chuyển, mốc thời gian', 'JPD123', 5),
    ('jpd123-b6', 'Bài 6 — Trải nghiệm & So sánh', 'Mẫu câu so sánh hơn/nhất (A と B と どちらが...), quá khứ của tính từ', 'JPD123', 6),
    ('jpd123-b7', 'Bài 7 — Cuộc sống thường nhật & Thể Te', 'Động từ thể て (V-て), xin phép V-てもいいですか, cấm đoán V-てはいけません', 'JPD123', 7)
ON CONFLICT (slug) DO NOTHING;
