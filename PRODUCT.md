# Jiayou — sự thật sản phẩm

Cập nhật 31/10/2026. **Jiayou (加油)** là nền tảng học tiếng Trung cho người Việt trên desktop và điện thoại. Ganbarou là sản phẩm riêng tại heyganba.site. Luật thị giác duy nhất: `frontend/DESIGN.md`. README và `docs/HANDOVER.md` là điểm vào vận hành.

## Phạm vi bản bàn giao

Profile mặc định `jiayou-prod` dùng database và Flyway lineage riêng. Bootstrap chỉ tạo schema, vai trò và định danh target: không tạo tài khoản quản trị, học liệu hoặc dữ liệu người dùng Ganbarou. Các số lượng dưới đây mô tả fixture/migration lịch sử, **không phải học liệu đang phát hành trong database Jiayou mới**. Nội dung chọn lọc không chứng minh phủ đủ HSK; nguồn đúng, quyền tái sử dụng và quyền xuất bản là các điều kiện riêng.

## Trạm học và dữ liệu

Pinyin có bảng 21 thanh mẫu + y/w, 36 vận mẫu, đường nét thanh điệu (gồm nửa thanh 3 và biến điệu 3+3), lộ trình sáu chặng, quiz và giọng Quan thoại zh-CN. Từ vựng có bài học theo cấp/chủ đề, thẻ lật, gõ Pinyin hỗ trợ dấu/số và hàng đợi SM-2. Chữ Hán có bộ thủ nền tảng, tìm kiếm, chiết tự, bút thuận, luyện viết và từ ghép.

Ngữ pháp có bộ lọc sáu nhóm nội bộ, ví dụ/Pinyin/TTS, trắc nghiệm và sắp xếp câu mẫu. Từ điển hỗ trợ chữ Hán, Pinyin và nghĩa Việt; sổ từ riêng có ghi chú, tìm kiếm và luyện nhanh. Các bài đọc static cũ chỉ là fixture nghiên cứu chưa đủ căn cứ xuất bản; bản production không phát hành chúng.

Sau V9: 560 bản ghi từ vựng (538 từ riêng theo nhóm cấp, gồm 10 từ nhập môn), 42 điểm ngữ pháp, 84 trắc nghiệm, 75 chữ Hán, 30 bài học và 6 cấu hình thi thử. V10 thêm 6 bài sắp xếp từ ví dụ đã có, ví thưởng và lịch sử nhận thưởng. Chi tiết số lượng, nguồn và giới hạn ở `docs/m6-curriculum-sources.md`. Các cấp 3–6 có bộ nội dung đại diện, chưa phải toàn bộ kho HSK nâng cao.

Thi thử là bài luyện nội bộ: cấp 1–2 chấm Nghe/Đọc, tổng 200, đạt 120; cấp 3–6 có thêm Ngữ pháp, tổng 300, đạt 180. Trọng số từng phần bằng nhau và chấm ở server. Không gọi đây là đề thi chính thức, phần Viết chính thức hay chứng chỉ. Có timer, đánh dấu câu, lưu phiên, kết quả chẩn đoán và lịch sử thuộc tài khoản.

## Tiến độ và phần thưởng

Dashboard dùng hoạt động thật cho heatmap 24 tuần, tuần từ thứ Hai và biểu đồ 30 ngày. Tiến độ sáu cấp đếm từ riêng đã có lần ôn nhớ và điểm ngữ pháp đã trả lời đúng; không suy ra năng lực được chứng nhận.

EXP: đúng bài tập +10 theo cấu hình, mỗi 10 lượt SRS tích luỹ +50, thi thử 100 × tỷ lệ điểm. Nhiệm vụ mỗi ngày theo Asia/Ho_Chi_Minh: 10 lượt SRS (30 EXP/2 măng), 3 lượt viết đúng (25/2), đúng 5 câu ngữ pháp hoặc nộp 1 đề (50/3). Server kiểm tra điều kiện và chỉ nhận một lần/ngày. Ví măng gắn tài khoản, khởi tạo 6 măng, cho ăn tốn 1 và cộng 25 điểm thân thiết. Hoạt ảnh linh vật là phản hồi giao diện, không tự cộng tiền từ localStorage.

## Xuất bản và vận hành

Tạo/sửa học liệu giữ PENDING_REVIEW. Từ vựng cần catalog tin cậy, digest nội dung và receipt ký số còn hiệu lực trước khi được coi là có quyền xuất bản; thiếu catalog thì đóng cổng. Lineage Jiayou ban đầu vẫn chặn APPROVED ở schema và API. Những APPROVED trong migration lịch sử không chứng minh thẩm định hay quyền tái sử dụng. Không sửa checksum SQL, không tự chạy migration language_code, không nhập số lượng lớn qua Admin UI. Giới hạn ghi admin giữ 30/phút/admin.

JWT/RBAC, sở hữu sổ từ/thi/SRS/tiến độ, cookie bảo vệ, CORS tường minh, lỗi có mã tương quan, giới hạn payload và trust boundary proxy được kiểm tra bằng test. Hướng dẫn backup và Cloudflare tại `docs/security-and-ops.md`. Không có kết luận “100% production-ready” từ kiểm thử cục bộ; cấu hình public và phục hồi ngoài máy cần kiểm chứng thực tế.

## Còn cần phát triển

- Thẩm định độc lập nội dung, mở rộng đầy đủ từ vựng nâng cao và phần thi Viết.
- Audio bản xứ và kiểm định phát âm theo ngữ cảnh.
- Chính sách pháp lý/email khôi phục, hostname và cấu hình production thực tế; mọi triển khai là nhiệm vụ được phê duyệt riêng.
- Founder quyết định migration language_code; giữ tương thích các tên bảng/endpoint lịch sử cho đến khi có kế hoạch chuyển đổi riêng.
