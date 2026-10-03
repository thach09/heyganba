---
version: 1
slug: "src-features-dashboard-dashboardview-tsx"
primary_target: "src/features/dashboard/DashboardView.tsx"
related_targets: []
---

# Surface brief — Dashboard (`DashboardView.tsx`)

- **Mode:** Operate (màn trạng thái, không phải màn làm việc)
- **Scope:** route "hôm nay" (`今日`) của app; không gồm các trạm
- **Audience & job:** người học tự học (hiện tại: tác giả) — mở app mỗi ngày để biết "mình đang ở đâu" rồi tự chọn trạm qua nav
- **Direction:** Hệ nét viết — mực trên giấy đảo tối + cấp độ/EXP

## Direction contract

THESIS: Dashboard là **mặt phản chiếu**, không phải bảng nhắc việc — mọi khối trả lời "mình đang ở đâu"; không nút bắt đầu, không danh sách đến hạn. Từ chối kiểu dashboard xếp card + badge rời rạc.

OWN-WORLD: Mực trên giấy đảo tối — nền `#151614`, chữ giấy `#ECECE6`, bề mặt phụ `#1B1C19`. Đúng hai màu có việc: xanh đai `#7FA98B` (cấp độ + trạng thái điều hướng) và đỏ `#D96A5C` (chữa bài). Tracker đọc bằng **mật độ mực**, không bằng màu. Không viền, không bóng, không bo góc; serif JP + sans VI.

STORY: Người học hiểu ngay ba điều theo thứ tự: tuần này dày/mỏng thế nào (tracker), mình đang ở cấp nào (EXP), hoạt động gần đây ra sao (hai đồ thị) — rồi tự bấm vào trạm muốn học.

FIRST VIEWPORT: Header — ngày bên trái, cấp độ + thanh EXP bên phải. Hàng 1 — tracker mật độ 24 tuần (trái) cạnh "Tuần này" 3 con số giãn đều (phải). Hàng 2 — hai đồ thị cột mực 30 ngày (thẻ ôn · chữ viết). Không có nút hành động: hành động nằm ở nav trạm.

FORM: Hệ nét viết + cấp độ EXP; seed `eea4cfa7`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Điểm để ngỏ

- Công thức EXP (cộng bao nhiêu mỗi hoạt động)
- Màu cấp độ: một màu xanh cho mọi cấp, hay mỗi cấp một màu
- Khối gợi nhớ / nhiệm vụ kế tiếp: đã gỡ khỏi dashboard; để dành cho phiên học/từng trạm
