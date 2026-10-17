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

**Đã hoàn thiện ở branch feat/chinese-platform-conversion:**
- M1 — Pinyin & phát âm: Trang `/pinyin` chuẩn hoá tên "Pinyin & phát âm", hỗ trợ 2 chế độ ("Học từ đầu" 6 chặng và "Bảng tra cứu" 21 thanh mẫu, 36 vận mẫu chuẩn theo Đề án Pinyin 1958, 4 thanh điệu + thanh nhẹ, quy tắc chính tả, biến điệu, bài luyện nhận biết và gõ Pinyin, tích hợp cộng EXP thật; trạng thái `PENDING_REVIEW`).
- M2.1 / M2.1.1 — Bài mẫu Từ vựng & SRS ("Chào hỏi & giới thiệu bản thân", 10 từ cốt lõi): Route `/vocabulary` (redirect từ `/flashcards` và `/flashcard`). Tách bạch rõ 2 luồng: "Học theo bài (Giáo trình)" từ API catalog thực tế (không dùng due-today làm catalog) và "Ôn đến hạn (SRS SM-2)" qua `POST /flashcard/review` với enum chuẩn `FORGOT, HARD, GOOD, EASY` và UUID attemptId kháng lặp. Tích hợp Sổ từ vựng cá nhân độc lập với lịch SRS. Hoàn thành kiểm chứng PostgreSQL 16.15 rehearsal cả 3 case PASS (Flyway + Hibernate ddl-auto=validate). Trạng thái nội dung tiếp tục ở `PENDING_REVIEW` với Staging Migration `V4__sample_lesson_greetings.sql`.
- M2.2 — Mở rộng Kho từ vựng Chủ đề HSK 1: Bổ sung 3 bài học chủ đề (`family-members`, `time-calendar`, `dining-shopping`) với 40 từ vựng đời sống qua Staging Migration `V5__hsk1_thematic_curriculum_expansion.sql`. Toàn bộ 40 từ vựng giữ `PENDING_REVIEW` (`needs_human_check = true`), nâng tổng số từ staging lên 50 từ (bảo toàn 38 từ gốc `APPROVED` ở seed V2). Giao diện `/vocabulary` bổ sung bộ lọc cấp độ (`Nhập môn` vs `HSK 1`), thanh tìm kiếm chủ đề, hiển thị huy hiệu `Chờ duyệt` trên bảng từ vựng và duy trì nguyên tắc không sinh dữ liệu giả. Rehearsal test suite (`PostgresSchemaStagingRehearsalTest`) được mở rộng kiểm chứng toàn bộ V1–V5 trên PostgreSQL 16.
- Chinese Speech Synthesis: Tích hợp Web Speech API chuẩn giọng Quan thoại (`zh-CN`), phát âm theo chữ Hán mẫu, có cảnh báo khi thiếu voice và ngắt audio khi chuyển trang.
- Hanzi Station (`/hanzi`): Khung luyện viết chữ Hán theo ô Mễ tự cách (米字格) và tra cứu bộ thủ.
- Đồng hành học tập: Hệ thống linh vật Voxel 3D Companion Pet (Gấu trúc, Gấu đỏ, Khỉ vàng, Mèo hoàng gia) xoay 360°, tiến hoá khi học.
- Giao diện chủ đạo: Imperial Forbidden City & Three Kingdoms dark theme, nhãn thương hiệu trung tính "Học tiếng Trung".

**Định hướng các milestone tiếp theo (xem docs/curriculum-roadmap-m1-m3.md):**
- M2.3+: Bổ sung audio thu âm thực tế từ người bản xứ và đối chiếu thẩm định chuyên gia học thuật độc lập.
- M3: Mẫu câu và ngữ pháp có bài tập phản hồi giải thích chi tiết.
- Tách ngôn ngữ trong DB: Chờ xác nhận founder về migration `language_code`.

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

## Roadmap đã duyệt & Kế hoạch phát triển

1. [x] Pinyin & phát âm (M1) — Hoàn thành (Lộ trình 6 chặng, Bảng 21+2 thanh mẫu / 36 vận mẫu, 4 thanh điệu, quy tắc chính tả, biến điệu, quiz bàn phím; đang PENDING_REVIEW).
2. [x] M2.1 / M2.1.1 — Bài mẫu Từ vựng & SRS ("Chào hỏi & giới thiệu bản thân", 10 từ vựng cốt lõi; kiểm chứng PostgreSQL 16.15 cả 3 case PASS; nội dung ở PENDING_REVIEW).
3. [x] M2.2 — Mở rộng Kho từ vựng Chủ đề HSK 1 (3 bài học chủ đề: Gia đình & Xưng hô, Thời gian & Lịch, Ăn uống & Mua sắm với 40 từ vựng thực tế; Flyway staging V5; bộ lọc cấp độ Nhập môn / HSK 1 & tìm kiếm chủ đề; huy hiệu Chờ duyệt; mở rộng rehearsal test V1-V5; nội dung giữ PENDING_REVIEW).
4. [ ] M3: Mẫu câu và điểm ngữ pháp nền tảng HSK 1 kèm bài tập phản hồi.
5. [ ] Tách ngôn ngữ trong DB (migration `language_code` — chờ founder xác nhận).
6. [x] Chinese Speech Synthesis (Web Speech API Quan thoại zh-CN).
7. [ ] Mở rộng HanziStation (hoàn thiện thứ tự nét và thư viện chữ Hán HSK 1).

## Bằng chứng và giới hạn

Hành vi hiện tại được hỗ trợ bởi code và regression tests, không bởi tuyên
bố cải thiện retention hay số liệu sử dụng sản phẩm. Privacy policy, email
provider phục hồi và cam kết pháp lý cần quyết định riêng của founder.
