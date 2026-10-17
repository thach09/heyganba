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
- HSK Standard Course Ecosystem (V6 Migration): Nâng cấp toàn diện hệ sinh thái Giáo trình Chuẩn HSK 1 qua Staging Migration `V6__hsk1_standard_course_grammar_and_exams.sql` (bổ sung 2 bài học `school-work-places` & `weather-health-daily` với 30 từ vựng, nâng tổng từ staging lên 80 từ pending; 6 cấu trúc ngữ pháp HSK 1 cốt lõi; 12 bài tập tương tác; 3 bài đối thoại đọc hiểu ngữ cảnh; đề thi thử HSK 1 chuẩn). Trạm Ngữ pháp (`/grammar`) chuyển sang phong cách OrientalCard với hộp Cấu trúc cốt lõi, Toggle Pinyin, Mandarin TTS, ghi chú lỗi người Việt hay gặp, thưởng măng trúc companion và đóng dấu triện đỏ `通`. Phòng Thi thử HSK (`/exam`) áp dụng chuẩn thang điểm 200 (điểm đạt: 120/200), đa phân mục Nghe hiểu + Đọc hiểu, Question Palette, đóng dấu triện `「合格」/「未过」`, và chẩn đoán ôn tập theo câu sai. Thư viện & Sổ từ (`/dictionary`) tích hợp huy hiệu HSK 1 / Từ loại / Hán Việt, Tab Đọc hiểu ngữ cảnh HSK (情境阅读), và bộ lọc tìm kiếm nhanh trong sổ từ cá nhân. Kiểm chứng rehearsal suite mở rộng từ V1 đến V6.
- M4 — Hoàn tất Chuẩn 150 Từ vựng HSK 1, Nâng cấp Trạm Chữ Hán & Quy trình Duyệt Học thuật: Bổ sung 2 bài học HSK 1 chuyên đề cuối (`transport-directions` và `actions-courtesy-daily`) với 32 từ vựng chuẩn qua Staging Migration `V7__hsk1_complete_150_vocab_and_hanzi_radicals.sql`, nâng tổng từ vựng staging lên 112 từ pending và đạt đúng mốc chuẩn 150 từ vựng HSK 1 (kết hợp với 38 từ gốc `APPROVED`). Khởi tạo 20 bộ thủ nền tảng trong `radicals`, mở rộng cấu trúc chiết tự (`decomposition`) và từ ghép ứng dụng (`example_words_json`) trong `hanzi`. Nâng cấp Trạm Chữ Hán & Bộ Thủ (`/hanzi`) với thanh lọc bộ thủ, bộ lọc cấp độ HSK, tìm kiếm đa năng, chiết tự cấu trúc, từ ghép HSK phát âm Mandarin TTS, và vòng lặp luyện viết tay khung 米字格 thưởng EXP thật, `+2 Măng Trúc 🎋` cho linh thú đồng hành, kích hoạt phản ứng `happy` và đóng dấu triện đỏ `通`. Kích hoạt Bảng Thẩm định Học thuật trên Admin Console (`/admin` - tab "Thẩm định Học thuật (Cần kiểm)") cho phép Maintainer lọc, duyệt (`APPROVED`) hoặc từ chối (`ARCHIVED`) có ghi nhận AuditLog. Cập nhật bộ rehearsal PostgreSQL 16 (`V1`–`V7`) và unit test frontend chuyên biệt.
- M5 — Tự động Phê duyệt Toàn bộ Giáo trình (APPROVED), Mở rộng HSK 2 Standard Course & Bản đồ Lộ trình HSK Dashboard: Theo chỉ thị của Project Maintainer, dỡ bỏ toàn bộ rào cản duyệt thủ công (`PENDING_REVIEW` -> `APPROVED`, `needs_human_check = false`) cho toàn bộ dữ liệu giáo trình M1–M5. Hợp nhất cấu hình Flyway locations nạp trọn bộ V1–V8 cả dev và prod. Triển khai Migration `V8__hsk2_standard_course_and_approve_all_curriculum.sql`: nạp 4 bài học HSK 2 (`hsk2-travel-weather`, `hsk2-sports-health`, `hsk2-work-errands`, `hsk2-comparisons-feelings`), 68 từ vựng HSK 2 chuẩn, 6 cấu trúc ngữ pháp (câu chữ 比, liên từ 因为...所以..., 虽然...但是..., bổ ngữ trình độ 得 & bổ ngữ kết quả, trợ từ 过/着, câu cầu khiến 别/快要...了), 12 bài tập tương tác, 20 chữ Hán chiết tự và 2 bài đọc hiểu ngữ cảnh. Nâng cấp Dashboard (`/`): Bản đồ Lộ trình Chinh phục HSK 4 chặng (`OrientalCard`) liên kết trực tiếp các trạm học, tích hợp 3 Nhiệm vụ Hằng ngày thưởng EXP và `🎋 Măng Trúc` nuôi Linh Thú đồng hành. Bổ sung tính năng 1-Click Duyệt tất cả (Bulk Approve) trên Admin Console và endpoint `POST /admin/review-queue/approve-all` kèm AuditLog. Cập nhật toàn diện bộ kiểm chứng PostgreSQL 16.15 rehearsal (`V1`–`V8`) và test suites.
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

1. [x] Pinyin & phát âm (M1) — Hoàn thành (Lộ trình 6 chặng, Bảng 21+2 thanh mẫu / 36 vận mẫu, 4 thanh điệu, quy tắc chính tả, biến điệu, quiz bàn phím; trạng thái APPROVED).
2. [x] M2.1 / M2.1.1 — Bài mẫu Từ vựng & SRS ("Chào hỏi & giới thiệu bản thân", 10 từ vựng cốt lõi; kiểm chứng PostgreSQL 16.15 cả 3 case PASS; trạng thái APPROVED).
3. [x] M2.2 — Mở rộng Kho từ vựng Chủ đề HSK 1 (3 bài học chủ đề: Gia đình & Xưng hô, Thời gian & Lịch, Ăn uống & Mua sắm với 40 từ vựng thực tế; Flyway staging V5; bộ lọc cấp độ Nhập môn / HSK 1 & tìm kiếm chủ đề; huy hiệu Đã kiểm duyệt; trạng thái APPROVED).
4. [x] HSK Standard Course Ecosystem (Staging V6: Ngữ pháp OrientalCard, Đề thi thử HSK 1 200 điểm, Thư viện & Sổ từ đọc hiểu ngữ cảnh; trạng thái APPROVED).
5. [x] M4: Hoàn tất 150 từ vựng HSK 1 chuẩn (V7), nâng cấp Trạm Chữ Hán & 20 Bộ thủ (Chiết tự, 米字格 reward loop) & Quy trình Thẩm định Học thuật Admin (Review Queue); trạng thái APPROVED.
6. [x] M5: Tự động phê duyệt toàn bộ Giáo trình (APPROVED), Mở rộng HSK 2 Standard Course (V8 - 68 từ vựng, 6 ngữ pháp, 20 chữ Hán, 2 bài đọc hiểu), Bản đồ Lộ trình Chinh phục HSK & Nhiệm vụ Hằng ngày trên Dashboard, 1-Click Duyệt tất cả (Bulk Approve) trên Admin Console, và hợp nhất Flyway locations V1–V8.
7. [ ] M2.3+: Bổ sung audio thu âm thực tế từ người bản xứ và đối chiếu thẩm định chuyên gia học thuật độc lập.
8. [ ] Tách ngôn ngữ trong DB (migration `language_code` — chờ founder xác nhận).
9. [x] Chinese Speech Synthesis (Web Speech API Quan thoại zh-CN).

## Bằng chứng và giới hạn

Hành vi hiện tại được hỗ trợ bởi code và regression tests, không bởi tuyên
bố cải thiện retention hay số liệu sử dụng sản phẩm. Privacy policy, email
provider phục hồi và cam kết pháp lý cần quyết định riêng của founder.
