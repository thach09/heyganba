# HeyGanba! (ヘイガンバ) — Japanese Learning Platform

Nền tảng học tiếng Nhật theo giáo trình **Dekiru Nihongo** (JPD113 & JPD123 – Đại học FPT) với cấu trúc 5 trạm học tập toàn diện, hệ thống chuỗi học tập (Streak), thuật toán ngắt quãng SRS (SM-2) và phân quyền quản trị chuyên sâu.

---

## 🏗️ Kiến trúc & Tech Stack

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| **Backend** | Spring Boot 3.4.3 (Java 21 LTS) | Kiến trúc REST API chuẩn `/api/v1/`, JWT Security, HikariCP, Actuator |
| **Frontend** | React 19 + Vite + TypeScript | Giao diện Dark Slate / Torii Red, phím tắt chuẩn hóa, Onboarding Tooltip |
| **Database** | PostgreSQL 16 | Quản lý schema bằng Flyway Migrations |
| **Cache & Queue** | Redis 7 | Tối ưu hàng đợi ôn tập SRS và Leaderboard Sorted Set |
| **DevOps** | Docker Compose & GitHub Actions | CI/CD build & test tự động cho cả Backend và Frontend |

---

## 🗺️ Cấu trúc 5 Trạm học tập

1. **Trạm 1 — Bảng Kana (Hiragana & Katakana):** Luyện nhận diện trắc nghiệm, audio phát âm và canvas viết tay (HTML5 Canvas).
2. **Trạm 2 — Flashcard & SRS Engine:** Ôn từ vựng Dekiru Bài 1–7 với thuật toán SM-2 rút gọn và Redis Cache.
3. **Trạm 3 — Bộ thủ & Kanji:** Tra cứu Kanji theo bài học và 214 bộ thủ, âm Hán Việt, mnemonic hình ảnh.
4. **Trạm 4 — Trợ từ & Ngữ pháp:** Điền khuyết câu với phân hệ chuyên sâu cho nhóm bẫy は/へ/を và số đếm biến âm.
5. **Trạm 5 — Thi thử & Đấu trường:** Đề thi mô phỏng format JPD113/123, Streak Heatmap (GitHub-style) và bảng xếp hạng lớp.

---

## 🚀 Khởi chạy dự án trên máy Local

### Cách 1: Chạy bằng Docker Compose (Khuyên dùng)

Chỉ cần một lệnh để khởi động toàn bộ PostgreSQL 16, Redis 7 và Backend:

```bash
docker compose up -d
```

### Cách 2: Chạy thủ công từng thành phần

#### 1. Backend (Spring Boot)
Yêu cầu: JDK 21+ và Maven 3.9+.

```bash
cd backend
mvn spring-boot:run
```
*API Base Path:* `http://localhost:8080/api/v1`  
*Health Check:* `http://localhost:8080/api/v1/health`

#### 2. Frontend (Vite + React)
Yêu cầu: Node.js 20+.

```bash
cd frontend
npm install
npm run dev
```
*Truy cập giao diện Web:* `http://localhost:5173`

---

## 🔐 Phân quyền & Tài khoản mẫu

Hệ thống được cấu hình sẵn 2 phân quyền RBAC: `ROLE_ADMIN` và `ROLE_USER`.
Tài khoản Quản trị viên được khởi tạo sẵn qua Flyway Migration V2:

- **Email Admin:** `admin@heyganba.vn`
- **Mật khẩu khởi tạo:** `Admin@HeyGanba2026!`
- **Endpoint kiểm tra quyền:** `GET /api/v1/admin/status` (Chỉ tài khoản ADMIN mới có quyền truy cập, các tài khoản khác bị chặn với mã `403 Forbidden`).

---

## 🧪 Kiểm thử (Testing)

Chạy bộ kiểm thử tự động của Backend (bao gồm kiểm tra phân quyền RBAC, JWT Auth, đăng ký, đăng nhập và xử lý lỗi):

```bash
cd backend
mvn test
```

Kiểm tra biên dịch Type-safe của Frontend:

```bash
cd frontend
npm run build
```
