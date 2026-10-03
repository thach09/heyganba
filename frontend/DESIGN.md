# Design — HeyGanba

Hệ thị giác "mực trên giấy", đảo tối. Chữ Nhật là nhân vật chính, chữ Việt là sàn đọc.

---

## 1. Nền tảng

### Màu

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--bg` | `#151614` | nền mực toàn app |
| `--fg` | `#ECECE6` | chữ giấy |
| `--fg-60` / `--fg-38` | `rgba(236,236,230,.60)` / `rgba(236,236,230,.34)` | chữ phụ / chữ mờ |
| `--rule` / `--rule-strong` | `rgba(236,236,230,.14)` / `rgba(236,236,230,.30)` | đường dữ liệu / đường biên |
| `--card` | `#1B1C19` | bề mặt phụ (flyout, thẻ học) |
| `--rank` | `#7FA98B` | cấp độ, thanh EXP, trạng thái "đang đứng" |
| `--red` | `#D96A5C` | chữa bài (tensaku) |

Luật: **đúng hai màu có việc** — xanh đai và đỏ chữa bài. Mọi thứ còn lại là mực, phân biệt bằng *độ đậm* (opacity của `--fg`). Tracker mật độ đọc bằng mực, không bằng màu.

Cấm: gradient, glow, bóng đổ, kính mờ, xám riêng ngoài thang mực.

### Chữ

- **JP — `Noto Serif JP`** (300/400/600): tiêu đề, nav, nội dung học
- **VI — `Be Vietnam Pro`** (400/500/600): nhãn, ghi chú, nút

Thang chữ dùng thật:

| Cỡ | Vai |
|---|---|
| 76px serif 300 | chữ học lớn (kana, từ) |
| 30px sans 600 | tiêu đề màn |
| 22–24px serif 600 | con số trạng thái (cấp, EXP) |
| 21px serif 300 | câu ví dụ tiếng Nhật |
| 16–18px | nav JP, nghĩa từ |
| 13.5–14.5px | body |
| 12.5px | chữ phụ |
| 10.5–11px caps, tracking .14–.18em | nhãn nhỏ |

Không dùng font mảnh ở cỡ nhỏ — body tối thiểu 12.5px; nét mảnh chỉ thuộc về thứ lớn (kana, con số, đường kẻ).

### Hình khối & khoảng cách

- Bo góc **0** ở mọi nơi; không bóng; không viền panel
- Nhịp dọc: sàn `28px` giữa các khối, `56px` giữa các hàng, `64px` giữa hai cột
- Trong khối: nhãn cách nội dung `22px`
- Sidebar rộng `216px`; nav cách nhau `14px`
- Chuyển động: chỉ opacity, `~120ms ease`; không bounce, không trượt dài

## 2. Luật bố cục

1. **Một điểm neo mỗi màn.** Màn "làm" (phiên học): điểm neo là nội dung. Màn "trạng thái" (dashboard): điểm neo là khối dữ liệu lớn nhất. Không hai thứ cùng tranh sáng.
2. **Đường kẻ chỉ khi mang thông tin** — lưới ô viết, baseline đồ thị, vạch tiến độ. Không kẻ phân cách, không khung bao: phân chia bằng khoảng trống và cỡ chữ.
3. **Lưới phẳng, cột đều nhau.** Mọi khối fluid, lấp đủ bề ngang màn hình — không `max-width`.
4. **Nhịp dọc giãn đều** giữa header / các hàng / footer (`space-between` + sàn gap).
5. **Mobile ngang hàng laptop.** Mọi tương tác hover có đường tap tương đương; nav nhóm mở bằng tap, flyout chuyển thành inline trên mobile.

## 3. Thành phần

**Sidebar** — 5 mục: `今日 · 文字 · 単語 · 文法 · 試験`. Nhóm `文字 · Chữ viết` mở dropdown `ひらがな / カタカナ / 漢字` bằng hover (chuột — qua pointer events, không dựa vào `@media (hover:hover)`), tap (mobile) hoặc click; đóng bằng rời chuột, click ngoài, Esc hoặc blur. Flyout: nền `--card`, rộng tối thiểu `188px`, mục cách `9px 18px`, hover tint `rgba(236,236,230,.05)`. Mục đang xem: vạch xanh `2px` bên trái mục cha + chữ JP đậm + nhãn VI màu `--rank`.

**Tracker** — heatmap mật độ mực 24 tuần × 7 ngày. Ô vuông (`aspect-ratio:1`), gap `3px`, tự giãn kín cột. Mật độ = opacity mực: `0.06 / 0.22 / 0.44 / 0.66 / 0.9`. Nhãn thứ `9px` ở hàng T2/T4/T6; legend ô `8px` "ít → nhiều".

**Đồ thị hoạt động** — cột mực mảnh 30 ngày (thẻ ôn · chữ viết). Cột rộng `min(12px, 3%)`, giãn đều hết bề ngang; cao `88px` (mobile `72px`). Độ đậm: nền `.38` — 7 ngày gần nhất `.62` — hôm nay `.95`. Baseline `1px --rule`.

**Cấp độ** — số serif `22px` + thanh EXP cao `2px`, track `--rule`, fill `--rank`. EXP chỉ cộng từ hoạt động học thật (thẻ ôn, chữ viết, câu trả lời đúng).

**Thông thạo từng chữ** — không hiện thanh trên lưới bảng chữ; chi tiết (âm đọc, thông thạo…) hiện khi chọn một chữ. Trên lưới, mức thông thạo thể hiện bằng **nền ô**: không có dữ liệu = không nền → "Từ mới" = xám nhạt → đậm dần theo mức. Trong danh sách từ, dùng gạch mảnh `2px` màu mực (không dùng xanh — xanh vẫn chỉ thuộc cấp tài khoản).

**Phiên ôn từ vựng — trắc nghiệm** — thẻ nền `--card`; từ hiển thị serif `clamp(44px,9vw,68px)`. Câu hỏi ngẫu nhiên *nghĩa tiếng Việt* hoặc *cách đọc (kana)*; từ thuần kana luôn hỏi nghĩa. 4 đáp án xếp dọc (phím 1–4, nhiễu lấy từ các từ trong phiên). Sau khi chọn, kết quả hiện trong **popup**: kết quả → danh tính của từ (furigana → từ → nghĩa) → khối `Ví dụ` có nhãn → nút `Tiếp theo (Space)`; đáp án sai chọn viền đỏ (`--red`). Đúng → SRS `GOOD`; sai → `FORGOT` (ôn lại phiên sau). Nút `!` cạnh số tiến độ mở panel hướng dẫn.

**Nút & focus** — viền `1px`, radius 0; hover đảo mực/giấy. Focus bàn phím: viền mảnh `1px --fg-38`, offset `3px`.

**Nút dùng chung** — primary: nền mực/chữ giấy, hover `opacity .9`; secondary: viền `--rule-strong`, hover đảo mực/giấy. Gợi ý phím tắt (kbd) = viền `currentColor`, chữ 10px.

**Toast (FeedbackAlert)** — thẻ nền `--card` viền `--rule`, **vạch trái `2px`**: lỗi `--red`, thành công mực đậm, thông tin `fg-38`; dưới góc phải, animation `toast-in` `0.3s`. Không dùng xanh dương/xanh lá riêng — chỉ 2 màu có việc.

**Modal & popup** — overlay dùng token `bg-scrim` (`--color-scrim`); **không viết `bg-[rgba(...)]`** vì Tailwind v4 không sinh class đó (đã dính một lần: backdrop trong suốt ở 7 chỗ). Thẻ modal: nền `--card`, không radius, `max-h` + `overflow-y-auto` khi nội dung dài, nút `X` viền `--rule` góc phải, bấm nền hoặc `X` để đóng. **Chi tiết trên màn nhỏ (< `1100px`) là popup**, không xếp dọc — gate bằng media query để desktop không render markup thừa.

**Nội dung dài** — đoạn dài trong panel/popup cắt bằng `line-clamp-6` + nút chữ `Xem thêm` / `Thu gọn`; nút **chỉ hiện khi thật sự bị cắt** (so `scrollHeight > clientHeight`), đổi điểm ngữ pháp thì tự thu gọn. Khi nào tách màn đọc riêng: rule có `explanation + notes > ~400 ký tự` hoặc có 例文.

**Trạm Kanji** — header `Kanji 漢字` + nút `(!)`; hai tab `Tra cứu` / `Luyện viết`. **Tra cứu**: hàng chip lọc bài (`Tất cả bài` + `Bài 1…7`, chip đặc mực khi chọn); hàng lọc: input search có icon (cao `40px`, viền `--rule-strong`, focus viền mực) + nút `Tìm` + `Xoá lọc` + `select` bộ thủ (cùng kiểu viền, không radius); dòng thống kê `fg-38` (*đang hiển thị · đã luyện · bộ thủ*); lưới thẻ kanji `repeat(auto-fill, 94px)`: chữ serif `30px` · Hán Việt `fg-60` · nghĩa `fg-38` · `Đã luyện N×` — **thẻ nhiều dòng chọn bằng viền mực + nền `--card`** (không tô nền mực như ô một ký tự, vì làm khó đọc chữ nhỏ); panel chi tiết `320px` sticky giống bảng chữ: chữ `54px` + Hán Việt + *nét · bài* + số lần luyện, nhãn `ONYOMI / KUNYOMI / NGHĨA / MNEMONIC / BỘ THỦ` (**mnemonic = khối nền `tint`** `rgba(236,236,230,.06)` để nổi hơn phần còn lại của panel, không dùng vạch kẻ; bộ thủ là chip viền `--rule`), nút `Luyện viết chữ này` chuyển sang tab `Luyện viết` với chữ đang chọn. **Luyện viết**: cột trái `300px` = nhãn `Chọn bài` + chip bài, rồi nhãn `Tìm chữ` + input search có icon (Enter hoặc nút `Tìm` để lọc, `Xoá lọc` khi đang lọc, kèm số chữ khớp — **dùng chung state lọc với tab `Tra cứu`**) + lưới chọn chữ (`64px`, chữ 22px + Hán Việt, chữ đang luyện nền `--card`), cột phải = chữ đang luyện (serif `34px` + Hán Việt · nghĩa + số lần luyện) + canvas `maxSize 420` + `Lưu tiến độ luyện`, **rồi khối mnemonic nền `tint` ở dưới khung viết**; mobile xếp picker trên, canvas dưới.

**Luyện gõ kana** — mở tab là màn **setup**: chọn ký tự theo **nhóm → hàng → từng chữ**, dàn thẳng trên nền tab (không khung): nhãn nhóm viết hoa, mỗi hàng là nhãn trái `96px` + các ô chữ `42px` (serif 19px), bấm nhãn nhóm/hàng để chọn hoặc bỏ cả cụm, bấm ô để chọn lẻ — mặc định chọn sẵn nhóm Cơ bản. Thanh dưới **sticky** (`bottom-0`, nền giấy): trái là *số ký tự · ký tự hay gõ sai sẽ lặp nhiều hơn*, phải là nút `Bắt đầu` — dính trong màn khi cuộn. Phiên gõ kiểu typekana.com: **khung dãy** viền `1px --rule`, rộng tối đa `880px`, một hàng ngang không xuống hàng — **thanh trượt**: chữ **đang gõ ghim giữa khung**, dãy trượt ngang (`translateX`, transition `300ms`) khi sang chữ kế; chữ serif `clamp(32px,7.5vw,50px)`. Gõ romaji tự do bằng bàn phím, **Enter mới chấm** (Backspace xoá lùi; máy cảm ứng chạm vào dãy để mở bàn phím); **ô nhập** dưới khung nền `--card` `240×44px` hiện romaji đang gõ + **caret nhấp nháy** (`animate-caret` 1.1s steps), dưới cùng là dòng gợi ý. Chữ hiện tại có **gạch chân mực** `2px`, chữ đã gõ mờ `fg-38`, chữ chưa tới `fg-60`. Enter khớp đáp án → chữ done; sai → chữ **hoá đỏ**, hiện **cách đọc đúng ngay trên chữ đó**, lượt đi tiếp ngay (không chặn), và một bản sao **được nhét lại cuối dãy** (không animation), tối đa **10 + 5 chữ** mỗi dãy. Không có nút nghe lại / đặt lại / đếm đúng-sai; chỉ có `Kết thúc` góc phải về màn setup. Cơ chế typekana: **Leitner 5 hộp** — ký tự hay gõ sai lặp nhiều hơn (hộp 1 nặng gấp 16 lần hộp 5), đúng lên hộp, sai về hộp 1; lưu trong `localStorage` (`heyganba_kana_typing`).

**Trạm Ngữ pháp** — header `Grammar 文法` + nút `(!)`; hai tab `Tra cứu` / `Luyện tập`. **Tra cứu**: chip lọc bài + **search chạy ngay khi gõ, bỏ dấu tiếng Việt** (tìm trên `title + structure + explanation + notes`; gõ "phu dinh" ra "phủ định"), kèm số `x/y điểm ngữ pháp`; hàng rule = **cấu trúc serif `16px`** làm dòng chính + snippet `explanation` (`96` ký tự, `fg-60`) + `#số · bài` (`fg-38`), số câu bên phải; hàng đang chọn nền `tint`; panel chi tiết `320px` sticky: cấu trúc serif `22px` + meta + giải thích (clamp `6` dòng + `Xem thêm`) + **khối `Lưu ý` nền `tint`** (chỗ hiện `notes`) + nút `Luyện tập phần này`; trên màn nhỏ panel này là popup. **Luyện tập**: chip phạm vi (`Tất cả điểm ngữ pháp` / `Chỉ nhóm bẫy`) + nhãn `Đang luyện: <cấu trúc>` kèm `Bỏ chọn`; dòng trạng thái `Đúng x/y câu · câu i/n · phạm vi`; câu hỏi serif `22px`; đáp án là hàng `kbd 1–4` + chữ serif — **đúng = viền mực, chọn sai = viền + chữ đỏ, các đáp án còn lại mờ `fg-38` sau khi chấm**; khối kết quả nền `tint` (`Chính xác` / `Giải thích`, kèm đáp án đúng khi sai); nút `Câu tiếp theo (Enter)`. Không có toast "chưa đúng" — thông tin đã nằm inline.

**Route (React Router)** — app dùng URL thật: `/` dashboard · `/kana` · `/vocabulary` · `/kanji` · `/grammar` · `/grammar/:ruleId` · `/exam` · `/admin` · `*` → về `/`. Mục nav ở sidebar là **link** (`NavLink`), không phải nút state; màn nào cũng F5 được và back/forward chạy đúng. Ở Vercel có `rewrites` về `index.html` để deep link không 404.

**Trang chi tiết điểm ngữ pháp** (`/grammar/:ruleId`) — mặt đọc rộng `720px` trong vùng nội dung, sidebar vẫn đứng: link `← Danh sách ngữ pháp`, tiêu đề = cấu trúc (serif `32px`), meta `#số · bài · N câu`, rồi giải thích cỡ đọc (`14px/2`), khối `Lưu ý` nền `tint`, cuối là `Luyện tập phần này` → về `/grammar?practice=<id>` (query được xoá sau khi áp). Cuối trang có khối **`Ngữ pháp khác`**: lưới card ngang (desktop `auto-fill minmax(220px)`, mobile 2 cột), card = cấu trúc serif `15px` + `#số · bài · N câu`, viền `--rule` hover viền mực + nền `tint`; gợi ý ưu tiên **cùng bài**, thiếu thì lấp các điểm liền kề, tối đa 6, kèm link `Xem tất cả →`; bấm card thì sang trang đó và **cuộn lên đầu**. Đây là chỗ để nhét 例文 sau này mà không phải sửa layout.

**Trạm Thi thử** — header `Exam 試験` + nút `(!)`; hàng thống kê `fg-38` (*streak hiện tại · dài nhất · đã học · hôm nay x/y lượt ôn · N lượt thi*); đề sinh từ ngân hàng đã duyệt và chấm hoàn toàn ở server. Card đề: chip `Số câu` (10/20/30) + `Thời gian` (10/20/30) + `Bắt đầu thi thử`; hai cột `Mascot & điều kiện tính streak` và `Streak heatmap` (ô `12px`, đậm theo thang tracker `0.06–0.9`, legend mờ, ghi múi giờ); `Bảng xếp hạng` bảng viền `--rule`: **hạng 1 = đặc mực, 2–3 = viền mực, còn lại `fg-38`** (không vàng/bạc/đồng), hàng `is-me` nền `tint`, số căn phải `tabular-nums`; quản lý mã lớp dưới bảng. `Lịch sử thi thử` bảng cùng kiểu. **Đang thi**: bar sticky (`Câu i/n` · đồng hồ serif `tabular-nums` · chú thích TTS · `Nộp bài`), thẻ câu: meta (type + `Nghe` TTS + `Đã chọn`), câu serif `20px`, đáp án hàng `kbd 1–4` — hàng được chọn viền mực; card đang làm viền mực + nền `--card`. **Kết quả**: card `--card`, review từng câu có **vạch trái `2px`** (đúng mực / sai đỏ) kèm lựa chọn + đáp án + giải thích.

**Auth modal** — overlay `bg-scrim` (z `110`, trên mobile drawer), card nền `--card`, `max-w 380px`; field nền `--bg` + viền `--rule-strong`, label `fg-38`, icon `fg-38`; lỗi dùng `tint` + vạch trái `--red`; link chuyển Login/Register gạch chân; nút nạp admin dev viền nét đứt.

**Admin** — số liệu trong card nền `--card`; bảng dùng header hoa nhỏ `fg-38`, hàng kẻ `--rule`, số `tabular-nums`; role ADMIN đặc mực, USER viền; trạng thái hoạt động dùng mực mờ, bị khoá dùng `--red`. Bảng rộng nằm trong `overflow-x-auto`; vùng main có `min-w-0` để không kéo tràn viewport mobile.

**403 / backend offline** — 403 là một trạng thái trống gọn (số serif + lý do + link về `/`); banner backend dùng `tint` + vạch trái `--red`, lời người dùng nói "tạm thời không kết nối được"; chi tiết chạy `mvn`/Docker chỉ hiện trong `import.meta.env.DEV`.

## 4. Còn để ngỏ

- Công thức EXP (cộng bao nhiêu mỗi hoạt động)
- Màu cấp độ: một màu xanh cho mọi cấp, hay mỗi cấp một màu

- Khối gợi nhớ / nhiệm vụ kế tiếp: đã gỡ khỏi dashboard; để dành cho phiên học/từng trạm

## 5. Làm việc với hệ này

- Đọc `PRODUCT.md` (sự thật sản phẩm) trước khi sửa UI
- Style màn mới bằng **Tailwind v4** với token trong `@theme` (`src/index.css`): `text-fg-60`, `border-rule`, `font-serif`… — palette/radius/shadow mặc định đã bị xoá khỏi theme, không thể dùng
- Sau khi sửa UI: chạy detector `.opencode/skills/impeccable/scripts/impeccable detect <đường dẫn>` (từ `frontend/`)
