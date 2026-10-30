# Học tiếng Trung — sự thật sản phẩm

Cập nhật 20/10/2026. Đây là nền tảng học tiếng Trung cho người Việt trên desktop và điện thoại. Nhãn trung tính là “Học tiếng Trung”; tên thương hiệu mới chờ founder. Luật thị giác duy nhất: `frontend/DESIGN.md`.

Quyết định maintainer 20/10: từ vựng có thể xuất bản theo `WEB_CROSS_CHECKED`, không bắt buộc giáo viên ký duyệt. V14–V23 hiện có 496 bản ghi legacy và 88 bản ghi mới (584 tổng, 555 định danh chữ/Pinyin); còn 64 legacy pending. V21 giải quyết năm bản ghi cũ và đề xuất 超市 bằng CC-CEDICT cùng Collins, đồng thời thu hẹp hai nghĩa 认识 về “Quen biết (một người)”. V23 bổ sung 20 mục HSK 2 từ các ID CTI đã chọn, chưa đại diện đủ cấp. Audit đối chiếu nguồn, hai family từ điển độc lập, chữ/Pinyin, nghĩa/từ loại được chọn và digest từng mục; nghĩa Việt là phần biên soạn dựa trên định nghĩa/cách dùng đã đọc. Truy cập Collins bằng web retrieval đọc được; direct HTTP 403 được ghi đúng trong evidence. Coverage CTI 3.0 theo ID/chữ/Pinyin duy nhất: HSK 1 244/300 (còn 56), HSK 2 86/200 (còn 114); HSK 3–6 còn 441/957/1.562/1.787. Tổng còn 4.917/5.400. Không tính 学生 đọc thanh nhẹ vào ID 248 vì syllabus in xuéshēng. Có 15 ID trong tám trường hợp cùng chữ/Pinyin khác cấp bị loại khỏi số xác nhận; 42 mục chỉ thuộc CTI 7–9 không quảng bá là HSK 1–6. Các cấp hiện là nội dung chọn lọc đang bổ sung, chưa hoàn chỉnh. V17 xóa Hán Việt/ví dụ chưa xác minh khỏi learner data; chúng chỉ trở lại sau khi đủ nguồn và duyệt theo policy.

Ghi chú readiness 19/10/2026: migration staging V13 trong working tree chuyển toàn bộ 560 từ vựng cũ từ APPROVED sang PENDING_REVIEW vì chưa có bằng chứng nguồn nghĩa tiếng Việt độc lập. Đối chiếu máy với syllabus HSK 3.0 chính thức hiện chỉ là so khớp từ/Pinyin/cấp; không xác nhận bản dịch hay ví dụ. Các con số V9 bên dưới mô tả dữ liệu lịch sử trước cổng provenance, không phải số mục đã được thẩm định hoặc có thể xuất bản sau V13. Xem `docs/QA/master-readiness-2026-10-19.md`.

## Trạm học và dữ liệu

Pinyin có bảng 21 thanh mẫu + y/w, 36 vận mẫu, đường nét thanh điệu (gồm nửa thanh 3 và biến điệu 3+3), lộ trình sáu chặng, quiz và giọng Quan thoại zh-CN. Từ vựng có bài học theo cấp/chủ đề, thẻ lật, gõ Pinyin hỗ trợ dấu/số và hàng đợi SM-2. Chữ Hán có bộ thủ nền tảng, tìm kiếm, chiết tự, bút thuận, luyện viết và từ ghép.

Ngữ pháp có bộ lọc sáu nhóm cấp nội bộ, công thức, lưu ý người Việt, ví dụ/Pinyin/TTS, trắc nghiệm và sắp xếp câu mẫu. Từ điển tìm bằng chữ Hán, Pinyin hoặc nghĩa Việt; Hán Việt chỉ hiện khi có dữ liệu đã xác minh. Sổ từ riêng có ghi chú sửa được, tìm kiếm và luyện nhanh. Bài đọc hiện là tuyển chọn theo nhóm cấp nội bộ, có Pinyin, bản dịch, TTS và câu hỏi; không đại diện toàn bộ nội dung HSK.

Sau V9: 560 bản ghi từ vựng (538 từ riêng cộng theo nhóm cấp, gồm 10 từ nhập môn; 528 từ khác nhau trên toàn bộ corpus), 42 điểm ngữ pháp, 84 trắc nghiệm, 75 chữ Hán, 30 bài học và 6 cấu hình thi thử. V10 thêm 6 bài sắp xếp từ ví dụ đã có, ví thưởng và lịch sử nhận thưởng. Chi tiết số lượng, nguồn và giới hạn ở `docs/m6-curriculum-sources.md`. Các cấp 3–6 có bộ nội dung đại diện, chưa phải toàn bộ kho HSK nâng cao.

Kiểm kê PostgreSQL test ngày 19/10/2026 ghi nhận 38 dòng từ vựng thiếu `source_ref`. Kho hiện tại tham chiếu danh sách HSK 6 cấp cũ (HSK 2.0), chưa đối chiếu đầy đủ HSK 3.0. Trường dữ liệu có nội dung và trạng thái APPROVED không thay thế kiểm duyệt ngôn ngữ độc lập. Xem `docs/QA/selfhost-readiness-2026-10-19.md` và bản kiểm kê từng từ đi kèm.

Thi thử là bài luyện nội bộ: cấp 1–2 chấm Nghe/Đọc, tổng 200, đạt 120; cấp 3–6 có thêm Ngữ pháp, tổng 300, đạt 180. Trọng số từng phần bằng nhau và chấm ở server. Không gọi đây là đề thi chính thức, phần Viết chính thức hay chứng chỉ. Có timer, đánh dấu câu, lưu phiên, kết quả chẩn đoán và lịch sử thuộc tài khoản.

## Tiến độ và phần thưởng

Dashboard dùng hoạt động thật cho heatmap 24 tuần, tuần từ thứ Hai và biểu đồ 30 ngày. Tiến độ sáu cấp đếm từ riêng đã có lần ôn nhớ và điểm ngữ pháp đã trả lời đúng; không suy ra năng lực được chứng nhận.

EXP: đúng bài tập +10 theo cấu hình, mỗi 10 lượt SRS tích luỹ +50, thi thử 100 × tỷ lệ điểm. Nhiệm vụ mỗi ngày theo Asia/Ho_Chi_Minh: 10 lượt SRS (30 EXP/2 măng), 3 lượt viết đúng (25/2), đúng 5 câu ngữ pháp hoặc nộp 1 đề (50/3). Server kiểm tra điều kiện và chỉ nhận một lần/ngày. Ví măng gắn tài khoản, khởi tạo 6 măng, cho ăn tốn 1 và cộng 25 điểm thân thiết. Hoạt ảnh linh vật là phản hồi giao diện, không tự cộng tiền từ localStorage.

## Xuất bản và vận hành

Nội dung mới mặc định PENDING_REVIEW. Từ vựng chỉ được phát hành theo policy WEB_CROSS_CHECKED khi nguồn web/snapshot được đọc, đối chiếu theo mục và ghi digest; không bắt buộc human review. Nghĩa Việt được biên soạn từ định nghĩa/ngữ cảnh đối chiếu, không giả là bản dịch có sẵn. Không sửa checksum V1–V9, không tự chạy migration language_code, không nhập số lượng lớn qua Admin UI. Giới hạn ghi admin giữ 30/phút/admin.

JWT/RBAC, sở hữu sổ từ/thi/SRS/tiến độ, cookie bảo vệ, CORS tường minh, lỗi có mã tương quan, giới hạn payload và trust boundary proxy được kiểm tra bằng test. Hướng dẫn backup và Cloudflare tại `docs/security-and-ops.md`. Không có kết luận “100% production-ready” từ kiểm thử cục bộ; cấu hình public và phục hồi ngoài máy cần kiểm chứng thực tế.

## Còn cần phát triển

- Tiếp tục đối chiếu từng mục từ HSK 1 trước rồi đến HSK 2–6; hiện các cấp là nội dung chọn lọc đang bổ sung, không tuyên bố đã phủ đủ syllabus.
- Audio bản xứ và kiểm định phát âm theo ngữ cảnh.
- Quyết định thương hiệu, chính sách pháp lý/email khôi phục, cấu hình production thực tế.
- Founder quyết định migration language_code; giữ tương thích các tên bảng/endpoint lịch sử cho đến khi có kế hoạch chuyển đổi riêng.
