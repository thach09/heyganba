# Automated vocabulary source registry

Ngày rà soát: 2026-10-28. Cấu hình máy đọc: [source-registry.json](../../scripts/vocabulary_pipeline/source-registry.json).

Registry khai báo adapter, phạm vi nguồn, họ dữ liệu, giấy phép, nghĩa vụ ghi công, hạn dùng snapshot và giới hạn truy cập. Acquisition lock ghi URL thực tế, thời điểm tải, version/revision và SHA-256 của bytes đã tải. Hai phần phải được đọc cùng nhau; URL hoặc trạng thái trong registry không phải bằng chứng cho một mục từ.

| Nguồn | Kết quả thực tế | Phạm vi và giới hạn |
|---|---|---|
| CC-CEDICT / MDBG | Tải được export gzip chính thức; header `2026-10-28T00:15:09Z`, 125.331 entries theo header | Chữ giản/phồn, Pinyin, nghĩa Anh, POS chỉ khi ghi tường minh. Parser giữ riêng từng gloss/cách đọc. Export được cung cấp để tải; không scrape trang tra từ. |
| CVDICT | API repo, raw README/data ở main/master và trang README trực tiếp trả 404; connected GitHub API cũng trả NOT_FOUND | Search index của README upstream có tuyên bố CC BY-SA 4.0 và dịch từ CC-CEDICT. Đây là thông tin chỉ mục, chưa phải dataset hiện hành đã tải/hash. Không sử dụng nghĩa Việt từ nguồn không đọc được. Không tính CVDICT thành họ độc lập với CC-CEDICT. |
| English Wiktionary | Tải đủ 50 mục tra cứu gốc và 24 trang đích `zh-see` bằng API | Chỉ lấy mục Chinese/Mandarin, cách đọc gắn đúng etymology, POS tường minh và định nghĩa parser hiểu được. Nhãn ngữ cảnh được giữ. Không lấy quotation/audio hay template chưa hỗ trợ. Tải được trang không đồng nghĩa đã lấy được bằng chứng cho mọi trường. |
| Tatoeba | Chưa nhập câu hoặc audio | Cần ID câu, tác giả, license của câu và bản dịch. Không suy quyền audio từ quyền text. Adapter đang tắt. |
| Vietnamese Wiktionary | Pilot mới: 19/50 trang gốc lấy được, 28 thiếu page/revision, 2 HTTP 429, 1 chưa yêu cầu khi batch dừng; 4/50 candidate có facts khớp parser | Chỉ section Chinese có `m=` Mandarin rõ ràng hoặc section cmn cũ. Giữ riêng nghĩa Việt, không suy đọc hiện đại từ Hán-Nôm. Cùng family Wiktionary với bản Anh, không tạo corroboration độc lập. Site rights API thực trả CC BY-SA 4.0; vẫn phải giữ revision/attribution và loại tư liệu ngoài phạm vi license. |

[CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) công bố CC BY-SA 4.0. Phải giữ ghi công/link nguồn, link giấy phép, ghi thay đổi và ShareAlike cho adaptation. Nghĩa Việt do Agent biên soạn từ định nghĩa đã đọc là editorial/adaptation, không phải bản dịch có sẵn trong nguồn. Dataset và notices được giữ trong evidence riêng; phiên này không phân phối một batch học liệu đã được duyệt. Điều kiện đầy đủ xem [license](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en).

[Wiktionary copyrights](https://en.wiktionary.org/wiki/Wiktionary:Copyrights) phân biệt nội dung nguyên gốc và tư liệu bên ngoài có điều kiện khác. Lưu page URL, revision/history và attribution; không tự nhận mọi trích dẫn đều thuộc license chung. Wiki ở nhiều locale vẫn cùng một họ. Nếu page nhắc CEDICT/MDBG, parser thêm dependency `cedict`; nếu chưa xác định lineage, không coi hai domain là hai bằng chứng độc lập. Registry hiện để Wiktionary `UNRESOLVED_PER_ENTRY`.

[Tatoeba hướng dẫn reuse](https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus) yêu cầu ghi công và phân biệt text/audio. Không có câu Tatoeba nào được nhập trong lượt này. Collins và các định nghĩa/ví dụ bị hạn chế không được đưa vào adapter.

## Lưu trữ và retry

- Raw dataset, bản trích, request/response assessor và ledger nằm trong thư mục riêng **ngoài repository**. Object được gọi bằng SHA-256; ghi file hoàn chỉnh theo cách atomic, không ghi đè object bị sửa.
- Cap 32 MiB/object và decompression có giới hạn. JSON trùng key/NaN, cấu trúc sai, object thiếu/sai hash và snapshot tương lai/quá hạn bị từ chối.
- HTTP 401/403/404 không được retry để vượt chặn. Timeout/5xx có retry hữu hạn. 429 lưu cooldown theo `Retry-After` với sàn 300 giây, dừng batch và tiếp tục từ checkpoint sau cooldown. Không đổi identity/proxy để vượt giới hạn.
- Lần acquisition đầu gặp 10 trang 429. Sau hơn 12 phút, retry tối đa 10 trang với khoảng cách 5 giây đã tải đủ; không ghi các lần thất bại thành verification success.
- Vietnamese Wiktionary hiện có acquisition thật và parser cho `zh-pron`/`zho-pron`, heading `ĐM`/`section` và scope tiếng Trung. Các trang `zh-see`/`zho-see` của locale Việt chưa được follow/normalize; chúng giữ NEEDS_RESEARCH. Adapter CVDICT vẫn chưa có dataset live. Việc có adapter không tự xác nhận license hoặc độc lập dữ liệu.
- `zh-see` chỉ được theo một bước qua API cùng host, không phải HTTP redirect. Parser yêu cầu cả trang gốc trỏ đúng đích và `zh-forms` ở đích xác nhận chữ giản thể. Composite snapshot giữ nguyên bytes/Base64 và hash của cả hai trang; version, URL và revision attribution của trang đích được giữ. Hai trang vẫn là một họ nguồn.

Registry, acquisition lock và bản trích đều là đầu vào nghiên cứu. Quyền phân phối cho ứng dụng, signed receipt và key trust vẫn do [publication authority](../../backend/docs/vocabulary-publication.md) kiểm tra riêng.

## Nguồn bổ sung đã điều tra, chưa bật cho AUTO_VERIFIED

- [CVDICT upstream](https://github.com/ph0ngp/CVDICT): API và raw README main/master kiểm tra lại trả 404. Chỉ mục tìm kiếm có metadata dịch từ CC-CEDICT và license do tác giả khai báo; không thay được bytes/version/license hiện hành. Không tìm đường vượt quyền truy cập.
- [Chinese Open Wordnet license](https://raw.githubusercontent.com/omwn/omw-data/main/wns/cow/LICENSE) tải được, là license kiểu WordNet, không phải tự gán CC BY. [Bài báo tác giả](https://aclanthology.org/W13-4302.pdf) mô tả hợp nhất SEW và dữ liệu Wiktionary; không coi COW độc lập với Wiki nếu chưa tách origin từng entry. Không nhập nghĩa tiếng Việt giả từ WordNet Anh/Trung.
- [CLC HCMUS](https://www.clc.hcmus.edu.vn/?page_id=469&lang=en) cung cấp sample Chinese–Vietnamese, nhưng trang đã đọc không nêu quyền tái sử dụng đủ cho ứng dụng; chưa nhập dữ liệu.
- [Trannosaur published_dicts](https://github.com/Trannosaur/published_dicts) có `zhm2vi.tsv` từ PanLex 2017, tuyên bố CC BY-SA 4.0 và cảnh báo trộn Hán-Nôm/Việt hiện đại. [License PanLex](https://panlex.org/license/) hiện ghi BY-NC-SA và yêu cầu quyền riêng cho commercial use. Chưa xác định license snapshot 2017 và origin từng entry: không nhận license mirror thay upstream, không nhập làm nguồn độc lập. Các file Wiki-derived trong cùng repo vẫn là family Wiki.
- [CWN license cũ](https://lope.linguistics.ntu.edu.tw/cwn2/licence/) chỉ xuất hiện qua chỉ mục với giới hạn academic/no reproduction; URL trực tiếp hiện 404. Không suy một rights grant mới từ trang không đọc được hoặc từ paper nói “open-source”. CWN và COW là hai dự án khác nhau.

Hash/HTTP status và thời điểm acquisition nằm trong manifest phiên unblock, raw metadata/license ở evidence private. Đánh giá quyền source này tách khỏi source-rights catalog/issuer của production.
