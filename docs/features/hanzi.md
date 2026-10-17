# Chữ Hán và bộ thủ

Trạm `/hanzi` có 75 chữ Hán ở HSK 1–6 sau V9 và 20 nút bộ thủ nền tảng để lọc. Danh mục DB có 28 bộ; không gọi 20 nút này là toàn bộ hệ thống bộ thủ. Tìm theo chữ Hán, Pinyin, Hán Việt hoặc nghĩa Việt; xem chiết tự hình thể, từ ghép và nghe Quan thoại.

Xem bút thuận và luyện viết trên ô 米字格 dùng Hanzi Writer 3.5.0. Thư viện và dữ liệu nét của 75 chữ được phục vụ cùng origin để tương thích CSP script-src self, không phụ thuộc CDN lúc học. Nguồn Hanzi Writer / Make Me a Hanzi và giấy phép Arphic được giữ ở `frontend/public/vendor/` và `frontend/public/hanzi-data/`. Script `scripts/fetch-hanzi-assets.py` kiểm tra SHA-512 gói nguồn và lưu SHA-256 tài nguyên. Khi xuất bản chữ mới phải thêm dữ liệu nét tương ứng, không tự tải nội dung bên ngoài chưa kiểm tra.

Hoàn thành viết đúng gửi targetType HANZI, targetKey và isCorrect; server quyết định EXP và mức luyện, không nhận mức EXP/mastery do client yêu cầu. UI chỉ thông báo số server xác nhận. Phần bút thuận do trình duyệt chấm, không phải hệ thống chống gian lận. Ba lượt đúng trong ngày giúp đủ nhiệm vụ viết; măng chỉ cộng khi nhận nhiệm vụ, không tự cộng sau từng chữ.

Nguồn nội dung và giới hạn cấp độ: [giáo trình](../m6-curriculum-sources.md). Số lượng lớn được bổ sung bằng migration, nội dung mới mặc định PENDING_REVIEW.
