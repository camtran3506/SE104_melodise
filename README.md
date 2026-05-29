# 🎵 Melodise — Nền tảng Giao dịch Nhạc số Bản quyền

Chào mừng bạn đến với **Melodise**, một hệ thống thương mại điện tử chuyên biệt dành riêng cho việc khám phá, mua sắm và quản lý bản quyền âm nhạc kỹ thuật số chất lượng cao. 

Dự án được thiết kế với sự đồng nhất về mặt trải nghiệm người dùng, chia làm hai phân hệ hoạt động độc lập nhưng liên kết chặt chẽ với nhau thông qua cơ sở dữ liệu chung.

---

## 👥 Đội ngũ phát triển
Dự án được xây dựng và phát triển bởi **Nhóm 9 - SE104.Q28**.

Frontend Front-office: Trần Lưu Tuyết Trân (24521814)

Frontend Back-office: Lê Ngọc Tường Vy (24522054)

Backend: Nguyễn Cẩm Trân (24521813)

From Lovable and Gemini Pro with Love
---

## 🧩 Cấu trúc Hệ thống

Dự án bao gồm 2 phân hệ chính (Multi-repo structure):

### 1. 🎧 Phân hệ Khách hàng (`/front-office`)
Nơi người dùng cuối trải nghiệm và mua sắm các tác phẩm âm nhạc.
- **Khám phá:** Tìm kiếm, lọc bài hát theo danh mục, nghe thử bản demo (có watermark).
- **Giao dịch:** Quản lý giỏ hàng và tiến hành thanh toán an toàn.
- **Thư viện cá nhân:** Tải xuống và thưởng thức bản nhạc gốc (.mp3, .wav) chất lượng cao sau khi mua thành công.
- **Tài khoản:** Quản lý hồ sơ và lịch sử giao dịch cá nhân.

### 2. ⚙️ Phân hệ Quản trị (`/back-office`)
Nơi ban quản trị và nhân viên vận hành toàn bộ hệ thống Melodise.
- **Quản lý Nhạc số:** Thêm mới bài hát, upload tệp tin âm thanh/ảnh bìa, cập nhật giá và phân loại danh mục.
- **Quản lý Tài khoản:** Kiểm soát người dùng, phân quyền nhân viên/quản trị viên.
- **Đơn hàng:** Theo dõi, duyệt và xử lý các giao dịch mua nhạc.
- **Báo cáo & Thống kê:** Theo dõi doanh thu tổng quan, xác định top bài hát bán chạy.

---

## 🛠 Tech Stack (Công nghệ sử dụng)

- **Core:** React, Vite
- **Routing:** TanStack Router (File-based routing)
- **Styling:** CSS Variables (Oklch tokens), Tailwind CSS, Glassmorphism UI
- **Backend & Database:** Supabase (PostgreSQL, Storage, Auth)
- **Package Manager:** `bun` (hoặc `npm`)

---

## 🚀 Hướng dẫn khởi chạy dự án (Local Development)

Để chạy dự án trên máy tính cá nhân, bạn cần mở **2 terminal** riêng biệt cho từng phân hệ.

### Bước 1: Clone dự án
```bash
git clone <your-repo-url>
cd <your-folder-name>
```

### Bước 2: Khởi chạy Client (Front-Office)
*Yêu cầu đã cài đặt [Bun](https://bun.sh/).*
```bash
cd front-office
bun install
bun run dev
```
👉 Truy cập giao diện khách hàng tại: `http://localhost:5173`

### Bước 3: Khởi chạy Admin (Back-Office)
*Yêu cầu đã cài đặt [Node.js & npm](https://nodejs.org/).*
```bash
cd back-office
npm install
npm run dev
```
👉 Truy cập giao diện quản trị tại: `http://localhost:8080` (hoặc port tương ứng hiển thị trên terminal).
