# 🎵 Melodise Admin

Phân hệ quản trị cho website **Melodise** — nền tảng quản lý và kinh doanh nhạc số trực tuyến.

Concept thiết kế: **Velvet Blue + Gold Twinkling Stars** ✨ với hiệu ứng sao lấp lánh, nốt nhạc bay và texture nhung mềm mại.

## ✨ Tính năng

- 🔐 **Đăng nhập** quản lý / nhân viên
- 👥 **Quản lý tài khoản**: thêm / sửa / xóa, phân quyền
- 🎶 **Quản lý nhạc số**: bài hát, danh mục, giá bán
- 🛒 **Đơn hàng & Cấp quyền**: duyệt thanh toán
- 📈 **Báo cáo**: doanh thu theo tháng, top bài bán chạy

## 🚀 Chạy local trên VSCode

### Cài đặt
```bash
# Clone về máy
git clone <your-repo-url>
cd back-office

# Cài dependencies
npm install

# Chạy dev server
npm run dev
```

Mở trình duyệt tại 👉 http://localhost:8080

### Build production
```bash
npm run build
npm run start
```

## 📁 Cấu trúc thư mục
```
src/
├── routes/                # File-based routing (TanStack Router)
│   ├── __root.tsx         # Root layout
│   ├── login.tsx          # /login
│   ├── _admin.tsx         # Layout có sidebar
│   ├── _admin.accounts.tsx
│   ├── _admin.music.tsx
│   ├── _admin.orders.tsx
│   └── _admin.reports.tsx
├── components/
│   ├── AdminLayout.tsx    # Sidebar + main
│   ├── StarField.tsx      # Sao lấp lánh + nốt nhạc
│   └── PageHeader.tsx
└── styles.css             # Design system (oklch tokens)
```

## 🎨 Design tokens
Mở `src/styles.css`:
- `--background` — velvet blue sâu
- `--gold` — vàng sao lấp lánh
- `--gradient-velvet` — radial gradient nhung
- `--animate-twinkle`, `--animate-float-note` — animation

## 📤 Đẩy lên GitHub
```bash
git init
git add .
git commit -m "Initial commit: Melodise admin"
git branch -M main
git remote add origin https://github.com/<username>/melodise-admin.git
git push -u origin main
```

---
Made by nhóm 9 SE104.Q28

