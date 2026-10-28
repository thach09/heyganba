# Automated vocabulary source registry

Ngày rà soát: 2026-10-28. Cấu hình máy đọc: [source-registry.json](../../scripts/vocabulary_pipeline/source-registry.json).

Registry khai báo adapter, phạm vi nguồn, họ dữ liệu, giấy phép, nghĩa vụ ghi công, hạn dùng snapshot và giới hạn truy cập. Acquisition lock ghi URL thực tế, thời điểm tải, version/revision và SHA-256 của bytes đã tải. Hai phần phải được đọc cùng nhau; URL hoặc trạng thái trong registry không phải bằng chứng cho một mục từ.

| Nguồn | Kết quả thực tế | Phạm vi và giới hạn |
|---|---|---|
| CC-CEDICT / MDBG | Tải được export gzip chính thức; header `2026-10-28T00:15:09Z`, 125.331 entries theo header | Chữ giản/phồn, Pinyin, nghĩa Anh, POS chỉ khi ghi tường minh. Parser giữ riêng từng gloss/cách đọc. Export được cung cấp để tải; không scrape trang tra từ. |
| CVDICT | API repo, raw README/data ở main/master và trang README trực tiếp trả 404; connected GitHub API cũng trả NOT_FOUND | Search index của README upstream có tuyên bố CC BY-SA 4.0 và dịch từ CC-CEDICT. Đây là thông tin chỉ mục, chưa phải dataset hiện hành đã tải/hash. Không sử dụng nghĩa Việt từ nguồn không đọc được. Không tính CVDICT thành họ độc lập với CC-CEDICT. |
| English Wiktionary | Tải đủ 50 mục tra cứu gốc và 24 trang đích `zh-see` bằng API | Chỉ lấy mục Chinese/Mandarin, cách đọc gắn đúng etymology, POS tường minh và định nghĩa parser hiểu được. Nhãn ngữ cảnh được giữ. Không lấy quotation/audio hay template chưa hỗ trợ. Tải được trang không đồng nghĩa đã lấy được bằng chứng cho mọi trường. |
| Tatoeba | Chưa nhập câu hoặc audio | Cần ID câu, tác giả, license của câu và bản dịch. Không suy quyền audio từ quyền text. Adapter đang tắt. |

[CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) công bố CC BY-SA 4.0. Phải giữ ghi công/link nguồn, link giấy phép, ghi thay đổi và ShareAlike cho adaptation. Nghĩa Việt do Agent biên soạn từ định nghĩa đã đọc là editorial/adaptation, không phải bản dịch có sẵn trong nguồn. Dataset và notices được giữ trong evidence riêng; phiên này không phân phối một batch học liệu đã được duyệt. Điều kiện đầy đủ xem [license](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en).

[Wiktionary copyrights](https://en.wiktionary.org/wiki/Wiktionary:Copyrights) phân biệt nội dung nguyên gốc và tư liệu bên ngoài có điều kiện khác. Lưu page URL, revision/history và attribution; không tự nhận mọi trích dẫn đều thuộc license chung. Wiki ở nhiều locale vẫn cùng một họ. Nếu page nhắc CEDICT/MDBG, parser thêm dependency `cedict`; nếu chưa xác định lineage, không coi hai domain là hai bằng chứng độc lập. Registry hiện để Wiktionary `UNRESOLVED_PER_ENTRY`.

[Tatoeba hướng dẫn reuse](https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus) yêu cầu ghi công và phân biệt text/audio. Không có câu Tatoeba nào được nhập trong lượt này. Collins và các định nghĩa/ví dụ bị hạn chế không được đưa vào adapter.

## Lưu trữ và retry

- Raw dataset, bản trích, request/response assessor và ledger nằm trong thư mục riêng **ngoài repository**. Object được gọi bằng SHA-256; ghi file hoàn chỉnh theo cách atomic, không ghi đè object bị sửa.
- Cap 32 MiB/object và decompression có giới hạn. JSON trùng key/NaN, cấu trúc sai, object thiếu/sai hash và snapshot tương lai/quá hạn bị từ chối.
- HTTP 401/403/404 không được retry để vượt chặn. Timeout/5xx có retry hữu hạn. 429 lưu cooldown theo `Retry-After` với sàn 300 giây, dừng batch và tiếp tục từ checkpoint sau cooldown. Không đổi identity/proxy để vượt giới hạn.
- Lần acquisition đầu gặp 10 trang 429. Sau hơn 12 phút, retry tối đa 10 trang với khoảng cách 5 giây đã tải đủ; không ghi các lần thất bại thành verification success.
- Adapter CVDICT và Vietnamese Wiktionary có kiểm thử synthetic để hỗ trợ mở rộng. Việc có adapter không tự đăng ký nguồn, xác nhận giấy phép hoặc độc lập dữ liệu. Chúng chưa được dùng làm bằng chứng thật trong pilot.
- `zh-see` chỉ được theo một bước qua API cùng host, không phải HTTP redirect. Parser yêu cầu cả trang gốc trỏ đúng đích và `zh-forms` ở đích xác nhận chữ giản thể. Composite snapshot giữ nguyên bytes/Base64 và hash của cả hai trang; version, URL và revision attribution của trang đích được giữ. Hai trang vẫn là một họ nguồn.

Registry, acquisition lock và bản trích đều là đầu vào nghiên cứu. Quyền phân phối cho ứng dụng, signed receipt và key trust vẫn do [publication authority](../../backend/docs/vocabulary-publication.md) kiểm tra riêng.
