# Học tiếng Trung — Product source of truth

Tài liệu này ghi lại hành vi và phạm vi đã được duyệt. Luật thị giác ở
`frontend/DESIGN.md`; briefing frontend cụ thể ở `frontend/PRODUCT.md`.
Phiên bản framework và kết quả test pass thuộc về build files và CI.

> **Chuyển đổi:** Repo này chuyển từ nền tảng học tiếng Nhật sang học tiếng Trung
> cho người Việt. Nền kỹ thuật (auth, SRS, progress, exam engine) được tái sử dụng.
> HeyGanba tiếng Nhật tiếp tục phát triển ở repo riêng.

## Sản phẩm hiện tại

Nền tảng học tiếng Trung cho người Việt, ưu tiên người mới bắt đầu. Chạy trên
cả laptop và điện thoại. Nền kỹ thuật tái sử dụng từ HeyGanba tiếng Nhật:

**Đã hoạt động (nền kỹ thuật):**
- Đăng nhập, tài khoản, phân quyền (JWT, Spring Security)
- Flashcard/SRS (SM-2), sổ từ vựng cá nhân
- Tiến độ học, hoạt động, EXP và streak
- Dashboard (heatmap 24 tuần, biểu đồ 30 ngày, cấp độ)
- Tra cứu từ điển và notebook cá nhân
- Ngữ pháp (tra cứu + luyện tập)
- Thi thử (chấm điểm phía server)
- Admin panel

**Đang chuyển đổi UI (branch feat/chinese-platform-conversion):**
- Sidebar: nhãn tiếng Trung, xóa kana, thêm /hanzi
- Dashboard: xóa bilingual JP/VI, giữ tiếng Việt
- KanjiStationView tạm dùng lại cho /hanzi — cần refactor thành HanziStation

**Chưa có / Cần phát triển:**
- Nội dung tiếng Trung (chữ Hán, Pinyin, từ vựng, ngữ pháp): chưa seed
- Pinyin station (phát âm, thanh điệu): chưa có component
- TTS tiếng Trung: cần thay japaneseSpeech bằng Chinese TTS
- Dữ liệu tiếng Nhật trong DB: chưa tách; cần migration language_code

## Nội dung

Nội dung phải qua duyệt trước khi công bố. Nội dung tiếng Trung mới phải ở
`PENDING_REVIEW` trong migration staging cho đến khi được duyệt. Không bịa
giáo trình, bản dịch, audio hoặc tuyên bố chuẩn HSK mà không có nguồn.

Rate limit admin: 30 request ghi/phút/admin. Nhập nội dung lớn qua Flyway.

## Múi giờ

Múi giờ "ngày học" là `Asia/Ho_Chi_Minh`. Production: Vercel frontend,
Render backend, Neon PostgreSQL. Redis optional, memory SRS caching mặc định.

## Tên thương hiệu

Chưa chốt tên thương hiệu mới. Dùng nhãn trung tính "Học tiếng Trung".
Không tự đổi tên repo, domain hoặc package.

## Dữ liệu tiếng Nhật trong DB — Đề xuất xử lý (chờ xác nhận founder)

Không sửa migrations đã áp dụng. Đề xuất thêm `language_code VARCHAR(5)`
vào bảng vocabulary, kanji, grammar_rules bằng migration mới:
- Dữ liệu tiếng Nhật giữ nguyên với `language_code = 'ja'`
- Nội dung tiếng Trung mới: `language_code = 'zh'`, `review_status = 'PENDING_REVIEW'`
- API filter theo `language_code` — không ảnh hưởng dữ liệu hiện tại

**Quyết định này cần xác nhận của founder trước khi thực hiện migration.**

## Roadmap đã duyệt — CHƯA TRIỂN KHAI

1. Pinyin station (phát âm, thanh điệu)
2. Nội dung tiếng Trung (từ vựng, chữ Hán, ngữ pháp)
3. Tách ngôn ngữ trong DB (migration language_code)
4. Chinese TTS thay thế Japanese TTS
5. HanziStation (refactor từ KanjiStationView)

## Bằng chứng và giới hạn

Hành vi hiện tại được hỗ trợ bởi code và regression tests, không bởi tuyên
bố cải thiện retention hay số liệu sử dụng sản phẩm. Privacy policy, email
provider phục hồi và cam kết pháp lý cần quyết định riêng của founder.
