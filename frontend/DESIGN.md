# Design — Học tiếng Trung

Hệ thị giác "mực trên giấy", đảo tối. Chữ Hán là nhân vật chính, chữ Việt là sàn đọc, Pinyin là chúu thích.

---

## 1. Nền tảng

### Màu và theme (cập nhật theo yêu cầu audit 17/10/2026)

Hai giao diện: `宣纸 · Sáng (Giấy Tuyên)` và `砚台 · Tối (Nghiên Mực)`.
Màu nguồn ở `src/theme.css`, Tailwind chỉ dùng alias token trong `@theme inline`.

| Vai trò | Sáng | Tối |
|---|---|---|
| Nền | `#F7F3E8` | `#121211` |
| Thẻ | `#FFFDF9` | `#1C1B19` |
| Mực chính | `#1C1917` | `#F5F2EB` |
| Chữ phụ | `#57534E` | `#A8A29E` |
| Đường kẻ | `#DFD7C4` | `#2E2C28` |
| Chu sa | `#C83E31` | `#E04F42` |
| Ngọc | `#2E7D6B` | `#38A18C` |
| Vàng nhấn | `#B45309` | `#E7B66A` |

Nhãn, nút, input, bảng và modal đều theo theme. Không dùng nền hoặc chữ có mã màu cố định trong component. Màu hình minh họa linh thú được giữ riêng. Chữ phụ dùng mực đủ tương phản, chỉ họa tiết trang trí được dùng opacity thấp. Không tạo màu xanh hoặc xám ngoài token.

Theme được lưu trong localStorage và đồng bộ giữa tab. Lần đầu theo cài đặt hệ điều hành. Nút theme ở sidebar và header mobile, có tên truy cập và focus bàn phím.

Họa tiết: góc hồi văn `回纹` nằm trong phần đệm, chữ `学而时习之` / `温故知新` là trang trí ẩn khỏi screen reader. Đèn lồng Khổng Minh trôi trong bầu trời đêm phía trên trang, không nhận thao tác. Không đặt chữ, dấu triện hoặc họa tiết lên nội dung khác.

Ngoại lệ thiết kế đã được maintainer chấp thuận:
- **Điều khiển theme**: Nút gạt sáng/tối dạng pill nhỏ gọn (`role="switch"`, `aria-checked`, kích thước rãnh `44×24px`, con trượt tròn `18×18px` có viền `border-rule-strong` tương phản rõ ràng ở cả hai theme, chuyển động trượt `translate-x-[2px]` sang `translate-x-[22px]`, tôn trọng `prefers-reduced-motion`).
- **Lồng đèn Khổng Minh**: 4 lồng đèn Khổng Minh cổ điển trôi bồng bềnh ở bầu trời trên cùng (`OrientalDecorBackground`, nguồn commit `26c94abd1ae88369970c808ec82713251d540319`) kèm hiệu ứng đung đưa `animate-lantern-sway` và ánh lửa ấm `animate-lantern-glow`. Khi cuộn trang quá 20px, cụm lồng đèn tự động mờ dần (`opacity-0`) để không che chắn nội dung học tập và chữ đọc, và hiện lại khi cuộn về đầu trang.

### Chữ

- **ZH — `Noto Serif SC`** (300/400/600): tiêu đề, nav, nội dung học (chữ Hán lớn)
- **Pinyin — `Noto Sans SC`** (400/500): âm đọc, ghi chú Pinyin
- **VI — `Be Vietnam Pro`** (400/500/600): nhãn, ghi chú, nút

Thang chữ dùng thật:

| Cỡ | Vai |
|---|---|
| 76px serif 300 | chữ học lớn (Hán, từ) |
| 30px sans 600 | tiêu đề màn |
| 22–24px serif 600 | con số trạng thái (cấp, EXP) |
| 18–21px sans 400 | Pinyin có dấu thanh |
| 16–18px | nav Hán, nghĩa từ |
| 13.5–14.5px | body |
| 12.5px | chữ phụ |
| 10.5–11px caps, tracking .14–.18em | nhãn nhỏ |

Không dùng font mảnh ở cỡ nhỏ — body tối thiểu 12.5px; nét mảnh chỉ thuộc về thứ lớn (chữ Hán lớn, con số, đường kẻ).

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

**Sidebar** — Các trạm học: `今日 · Hôm nay` (`/`), `文字 · Chữ viết` (flyout gồm `拼音 · Pinyin & Phát âm` `/pinyin` và `汉字 · Chữ Hán (Tập viết)` `/hanzi`), `词汇 · Từ vựng` (`/vocabulary`), `字典 · Tra cứu & Sổ từ` (`/dictionary`), `语法 · Ngữ pháp` (`/grammar`), `测试 · Luyện tập` (`/exam`), và `管理 · Quản trị` (`/admin`, chỉ cho admin). Flyout mở bằng hover (chuột), tap (mobile) hoặc click; đóng bằng rời chuột, click ngoài, Esc hoặc blur.
- Điều hướng bàn phím: Khi sidebar desktop thu gọn, vùng nội dung bên trong được đánh dấu `inert` để không nhận focus Tab ngoài màn hình, trong khi nút gạt mép (`‹ / ›`) vẫn nhận focus bàn phím và giữ focus liên tục khi đóng mở.
- Trên mobile drawer: focus tự động vào nút đóng khi mở, đóng được bằng Esc/nút X/backdrop và trả focus về nút mở menu trên mobile header; nội dung trang chính (`main`) được gắn `inert` trong thời gian drawer mở.

**Tracker** — heatmap mật độ mực 24 tuần × 7 ngày. Ô vuông (`aspect-ratio:1`), gap `3px`, tự giãn kín cột. Mật độ = opacity mực: `0.06 / 0.22 / 0.44 / 0.66 / 0.9`. Nhãn thứ `9px` ở hàng T2/T4/T6; legend ô `8px` "ít → nhiều".

**Đồ thị hoạt động** — cột mực mảnh 30 ngày (thẻ ôn · chữ viết). Cột rộng `min(12px, 3%)`, giãn đều hết bề ngang; cao `88px` (mobile `72px`). Độ đậm: nền `.38` — 7 ngày gần nhất `.62` — hôm nay `.95`. Baseline `1px --rule`.

**Cấp độ** — số serif `22px` + thanh EXP cao `2px`, track `--rule`, fill `--rank`. EXP chỉ cộng từ hoạt động học thật (thẻ ôn, chữ viết, câu trả lời đúng).

**Thông thạo từng chữ** — không hiện thanh trên lưới bảng chữ; chi tiết (âm đọc, thông thạo…) hiện khi chọn một chữ. Trên lưới, mức thông thạo thể hiện bằng **nền ô**: không có dữ liệu = không nền → "Từ mới" = xám nhạt → đậm dần theo mức. Trong danh sách từ, dùng gạch mảnh `2px` màu mực (không dùng xanh — xanh vẫn chỉ thuộc cấp tài khoản).

**Phiên ôn từ vựng — trắc nghiệm** — thẻ nền `--card`; từ hiển thị serif `clamp(44px,9vw,68px)`. Câu hỏi ngẫu nhiên *nghĩa tiếng Việt* hoặc *cách đọc (Pinyin)*. 4 đáp án xếp dọc (phím 1–4, nhiễu lấy từ các từ trong phiên). Sau khi chọn, kết quả hiện trong **popup**: kết quả → danh tính của từ (Pinyin → chữ Hán → nghĩa) → khối `Ví dụ` có nhãn → nút `Tiếp theo (Space)`; đáp án sai chọn viền đỏ (`--red`). Đúng → SRS `GOOD`; sai → `FORGOT` (ôn lại phiên sau). Nút `!` cạnh số tiến độ mở panel hướng dẫn.

**Nút & focus** — viền `1px`, radius 0; hover đảo mực/giấy. Focus bàn phím: viền mảnh `1px --fg-38`, offset `3px`.

**Nút dùng chung** — primary: nền mực/chữ giấy, hover `opacity .9`; secondary: viền `--rule-strong`, hover đảo mực/giấy. Gợi ý phím tắt (kbd) = viền `currentColor`, chữ 10px.

**Toast (FeedbackAlert)** — thẻ nền `--card` viền `--rule`, **vạch trái `2px`**: lỗi `--red`, thành công mực đậm, thông tin `fg-38`; dưới góc phải, animation `toast-in` `0.3s`. Không dùng xanh dương/xanh lá riêng — chỉ 2 màu có việc.

**Modal & popup** — overlay dùng token `bg-scrim` (`--color-scrim`); **không viết `bg-[rgba(...)]`** vì Tailwind v4 không sinh class đó (đã dính một lần: backdrop trong suốt ở 7 chỗ). Thẻ modal: nền `--card`, không radius, `max-h` + `overflow-y-auto` khi nội dung dài, nút `X` viền `--rule` góc phải, bấm nền hoặc `X` để đóng. **Chi tiết trên màn nhỏ (< `1100px`) là popup**, không xếp dọc — gate bằng media query để desktop không render markup thừa.

**Nội dung dài** — đoạn dài trong panel/popup cắt bằng `line-clamp-6` + nút chữ `Xem thêm` / `Thu gọn`; nút **chỉ hiện khi thật sự bị cắt** (so `scrollHeight > clientHeight`), đổi điểm ngữ pháp thì tự thu gọn. Khi nào tách màn đọc riêng: rule có `explanation + notes > ~400 ký tự` hoặc có 例文.

**Trạm Hanzi (Chữ Hán)** (`/hanzi`) — header `Hanzi 汉字` + nút `(!)`; hai tab `Tra cứu` / `Luyện viết`. **Tra cứu**: hàng chip lọc cấp độ HSK 1 đến HSK 6; input search có icon tìm kiếm theo chữ Hán, Pinyin hoặc nghĩa Hán Việt + `select` bộ thủ (cùng kiểu viền, không radius); dòng thống kê `fg-38` (*đang hiển thị · đã luyện · bộ thủ*); lưới thẻ chữ Hán `repeat(auto-fill, 94px)`: chữ serif `30px` · Hán Việt `fg-60` · nghĩa `fg-38` · `Đã luyện N×` — **thẻ nhiều dòng chọn bằng viền mực + nền `--card`** (không tô nền mực như ô một ký tự, vì làm khó đọc chữ nhỏ); panel chi tiết `320px` sticky: chữ `54px` + Pinyin + Hán Việt + *nét · cấp HSK* + số lần luyện, nhãn `PINYIN / HÁN VIỆT / NGHĨA / GHI NHỚ / BỘ THỦ` (**mnemonic = khối nền `tint`** `rgba(236,236,230,.06)` để nổi hơn phần còn lại của panel, không dùng vạch kẻ; bộ thủ là chip viền `--rule`), nút `Luyện viết chữ này` chuyển sang tab `Luyện viết` với chữ đang chọn. **Luyện viết**: cột trái `300px` = chọn cấp HSK và tìm chữ + lưới chọn chữ (`64px`, chữ 22px + Hán Việt, chữ đang luyện nền `--card`), cột phải = chữ đang luyện (serif `34px` + Pinyin · Hán Việt · nghĩa + số lần luyện) + canvas `maxSize 420` có khung lưới mễ tự / điền tự + `Lưu tiến độ luyện`, **rồi khối mnemonic nền `tint` ở dưới khung viết**; mobile xếp picker trên, canvas dưới.

**Trạm Pinyin (Phát âm & Bảng âm)** (`/pinyin`) — header `Pinyin 拼音` + nút `(!)`; hệ thống bảng Thanh mẫu (Shengmu), Vận mẫu (Yunmu) và 4 Thanh điệu (Tones). Chế độ nghe audio phát âm mẫu chuẩn, luyện phản xạ nhận diện âm tiết và phân biệt cặp âm dễ nhầm lẫn (zh/ch/sh, z/c/s, j/q/x). Giao diện tối giản với các thẻ âm đọc, thanh trượt phát âm và nút kiểm tra tức thì.

**Trạm Ngữ pháp** — header `Grammar 文法` + nút `(!)`; hai tab `Tra cứu` / `Luyện tập`. **Tra cứu**: chip lọc bài + **search chạy ngay khi gõ, bỏ dấu tiếng Việt** (tìm trên `title + structure + explanation + notes`; gõ "phu dinh" ra "phủ định"), kèm số `x/y điểm ngữ pháp`; hàng rule = **cấu trúc serif `16px`** làm dòng chính + snippet `explanation` (`96` ký tự, `fg-60`) + `#số · bài` (`fg-38`), số câu bên phải; hàng đang chọn nền `tint`; panel chi tiết `320px` sticky: cấu trúc serif `22px` + meta + giải thích (clamp `6` dòng + `Xem thêm`) + **khối `Lưu ý` nền `tint`** (chỗ hiện `notes`) + nút `Luyện tập phần này`; trên màn nhỏ panel này là popup. **Luyện tập**: chip phạm vi (`Tất cả điểm ngữ pháp` / `Chỉ nhóm bẫy`) + nhãn `Đang luyện: <cấu trúc>` kèm `Bỏ chọn`; dòng trạng thái `Đúng x/y câu · câu i/n · phạm vi`; câu hỏi serif `22px`; đáp án là hàng `kbd 1–4` + chữ serif — **đúng = viền mực, chọn sai = viền + chữ đỏ, các đáp án còn lại mờ `fg-38` sau khi chấm**; khối kết quả nền `tint` (`Chính xác` / `Giải thích`, kèm đáp án đúng khi sai); nút `Câu tiếp theo (Enter)`. Không có toast "chưa đúng" — thông tin đã nằm inline.

**Route (React Router)** — app dùng URL thật theo cấu trúc hiện tại:
- **Tuyến chính**: `/` (Bản đồ tiến độ & Tổng quan HSK), `/pinyin` (Pinyin & Bảng phát âm), `/vocabulary` (Thẻ ghi nhớ từ vựng SRS), `/dictionary` (Tra cứu & Sổ từ vựng cá nhân), `/hanzi` (Chữ Hán & Luyện viết chữ), `/grammar` (Ngữ pháp HSK), `/grammar/:ruleId` (Chi tiết điểm ngữ pháp & bài tập chuyên sâu), `/exam` (Thi thử HSK 1–6 có bấm giờ & chấm điểm server), `/admin` (Khu vực quản trị nội dung & học viên, yêu cầu quyền `ROLE_ADMIN`).
- **Tuyến chuyển hướng kế thừa (legacy redirects)**: `/flashcards` và `/flashcard` chuyển về `/vocabulary`, `/kana` chuyển về `/pinyin`, các route không hợp lệ `*` chuyển về `/`.
Mục nav ở sidebar là **link** (`NavLink`), không phải nút state; màn nào cũng F5 được và back/forward chạy đúng. Ở Vercel có `rewrites` về `index.html` để deep link không 404.

**Trang chi tiết điểm ngữ pháp** (`/grammar/:ruleId`) — mặt đọc rộng `720px` trong vùng nội dung, sidebar vẫn đứng: link `← Danh sách ngữ pháp`, tiêu đề = cấu trúc (serif `32px`), meta `#số · bài · N câu`, rồi giải thích cỡ đọc (`14px/2`), khối `Lưu ý` nền `tint`, cuối là `Luyện tập phần này` → về `/grammar?practice=<id>` (query được xoá sau khi áp). Cuối trang có khối **`Ngữ pháp khác`**: lưới card ngang (desktop `auto-fill minmax(220px)`, mobile 2 cột), card = cấu trúc serif `15px` + `#số · bài · N câu`, viền `--rule` hover viền mực + nền `tint`; gợi ý ưu tiên **cùng bài**, thiếu thì lấp các điểm liền kề, tối đa 6, kèm link `Xem tất cả →`; bấm card thì sang trang đó và **cuộn lên đầu**. Đây là chỗ để nhét 例文 sau này mà không phải sửa layout.

**Trạm Thi thử** — header `Exam 試験` + nút `(!)`; hàng thống kê `fg-38` (*streak hiện tại · dài nhất · đã học · hôm nay x/y lượt ôn · N lượt thi*); đề sinh từ ngân hàng đã duyệt và chấm hoàn toàn ở server. Card đề: chip `Số câu` (10/20/30) + `Thời gian` (10/20/30) + `Bắt đầu thi thử`; hai cột `Mascot & điều kiện tính streak` và `Streak heatmap` (ô `12px`, đậm theo thang tracker `0.06–0.9`, legend mờ, ghi múi giờ); `Bảng xếp hạng` bảng viền `--rule`: **hạng 1 = đặc mực, 2–3 = viền mực, còn lại `fg-38`** (không vàng/bạc/đồng), hàng `is-me` nền `tint`, số căn phải `tabular-nums`; quản lý mã lớp dưới bảng. `Lịch sử thi thử` bảng cùng kiểu. **Đang thi**: bar sticky (`Câu i/n` · đồng hồ serif `tabular-nums` · chú thích TTS · `Nộp bài`), thẻ câu: meta (type + `Nghe` TTS + `Đã chọn`), câu serif `20px`, đáp án hàng `kbd 1–4` — hàng được chọn viền mực; card đang làm viền mực + nền `--card`. **Kết quả**: card `--card`, review từng câu có **vạch trái `2px`** (đúng mực / sai đỏ) kèm lựa chọn + đáp án + giải thích.

**Auth modal** — overlay `bg-scrim` (z `110`, trên mobile drawer), card nền `--card`, `max-w 380px`; field nền `--bg` + viền `--rule-strong`, label `fg-38`, icon `fg-38`; lỗi dùng `tint` + vạch trái `--red`; link chuyển Login/Register gạch chân; nút nạp admin dev viền nét đứt.

**Admin** — số liệu trong card nền `--card`; bảng dùng header hoa nhỏ `fg-38`, hàng kẻ `--rule`, số `tabular-nums`; role ADMIN đặc mực, USER viền; trạng thái hoạt động dùng mực mờ, bị khoá dùng `--red`. Bảng rộng nằm trong `overflow-x-auto`; vùng main có `min-w-0` để không kéo tràn viewport mobile.

**403 / backend offline** — 403 là một trạng thái trống gọn (số serif + lý do + link về `/`); banner backend dùng `tint` + vạch trái `--red`, lời người dùng nói "tạm thời không kết nối được"; chi tiết chạy `mvn`/Docker chỉ hiện trong `import.meta.env.DEV`.

## 4. Quyết định thị giác & Game hóa (Đã chốt 02/10/2026)

- **Công thức EXP (dạng config backend):**
  - Trả lời đúng 1 câu bài tập / quiz: **+10 EXP** (`app.exp.exercise-correct`)
  - Mỗi 10 lượt ôn flashcard SRS tích luỹ: **+50 EXP** (`app.exp.srs-session`), không cộng 50 EXP cho một thẻ đơn lẻ.
  - Hoàn thành 1 đề thi thử: **100 EXP × hệ số điểm** (`app.exp.exam-base * (score / total)`)
  - Cấu hình qua `ExpConfig`, không hardcode để dễ dàng tinh chỉnh chỉ số vận hành.
- **Màu cấp độ:** Áp dụng **1 màu chủ đạo duy nhất (`--jade`, thích ứng sáng/tối)** xuyên suốt cho toàn bộ các cấp độ. Không đổi màu lung tung giữa các cấp, chỉ thay đổi sắc độ (lightness / tone) đậm dần theo rank từ sơ cấp đến bậc thầy.

- Dashboard có nhiệm vụ theo dữ liệu thật, EXP 30/25/50 và măng 2/2/3, nhận một lần/ngày theo giờ Việt Nam.

## 5. Làm việc với hệ này

- Đọc `PRODUCT.md` (sự thật sản phẩm) trước khi sửa UI
- Style màn mới bằng **Tailwind v4** với token trong `@theme` (`src/index.css`): `text-fg-60`, `border-rule`, `font-serif`… — palette/radius/shadow mặc định đã bị xoá khỏi theme, không thể dùng
- Sau khi sửa UI: chạy detector `.opencode/skills/impeccable/scripts/impeccable detect <đường dẫn>` (từ `frontend/`)

## Chữ trên màu nhấn và tương phản (audit 17/10/2026)

Màu nền/viền nhấn giữ palette đã chốt. Chữ nhỏ dùng `cinnabar-ink`, `jade-ink`, `gold-ink`: sáng lần lượt #B33127 / #246B5B / #984400; tối #F06D60 / #49B39D / #E7B66A. Tránh giảm opacity của chữ mang nội dung. `on-accent` là mực #121211 ở theme tối, giấy #FFFDF9 ở theme sáng, để chữ trên nút đỏ/ngọc/vàng đạt tương phản tối thiểu 4.5:1. Không dùng màu trắng cố định trên đỏ sáng trong theme tối.
