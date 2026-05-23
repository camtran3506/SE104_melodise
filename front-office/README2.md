# 🎵 Melodise Client (Front-Office)

Phân hệ dành cho khách hàng của website **Melodise** — nền tảng khám phá, mua sắm và thưởng thức nhạc số bản quyền.

Concept thiết kế: **Midnight Blue & Luxe Gold ✨** với bầu trời đêm sâu thẳm, kết hợp hiệu ứng mặt trăng khuyết, sao lấp lánh, vật thể trôi nhẹ nhàng và lớp kính mờ (glassmorphism) ánh vàng sang trọng.

## ✨ Tính năng

Dựa trên luồng nghiệp vụ hệ thống, phân hệ khách hàng bao gồm các tính năng chính:

- 👤 **Quản lý tài khoản**: Đăng ký tài khoản, đăng nhập và quản lý thông tin tài khoản.
- 🔍 **Khám phá và lựa chọn nhạc**: Tìm kiếm và lọc nhạc, xem thông tin và nghe thử bản demo.
- 🛒 **Giao dịch**: Quản lý giỏ hàng và tiến hành thanh toán đơn hàng.
- 🎧 **Truy cập tài nguyên**: Thư viện cá nhân để người dùng truy cập và tải xuống tài nguyên nhạc đã sở hữu.

## 🚀 Chạy local trên VSCode

Dự án này sử dụng môi trường `bun` (dựa trên tệp cấu hình `bun.lock`).

### Cài đặt
```bash
# Clone về máy
git clone <your-repo-url>
cd front-office

# Cài dependencies bằng Bun
bun install (hoặc npm install)

# Chạy dev server
bun run dev (hoặc npm run dev)
```

Mở trình duyệt tại 👉 http://localhost:5173

### Build production
```bash
bun run build (hoặc npm như trên)
bun run start
```

## 📁 Cấu trúc thư mục
```text
front-office/
├── src/
│   ├── components/          # Các UI components dùng chung (Header, Footer, Player...)
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Tích hợp dịch vụ bên thứ 3
│   ├── lib/                 # Utility functions, config
│   ├── routes/              # File-based routing (TanStack Router)
│   │   ├── __root.tsx       # Root layout chính
│   │   ├── index.tsx        # Trang chủ (Home)
│   │   ├── auth.tsx         # Giao diện Đăng ký / Đăng nhập
│   │   ├── account.tsx      # Quản lý thông tin tài khoản
│   │   ├── search.tsx       # Tìm kiếm và lọc nhạc
│   │   ├── track.$id.tsx    # Xem chi tiết và nghe thử bài hát
│   │   ├── cart.tsx         # Quản lý giỏ hàng
│   │   ├── checkout.$id.tsx # Thanh toán đơn hàng
│   │   ├── library.tsx      # Truy cập tài nguyên nhạc đã mua
│   │   └── faq.tsx          # Các câu hỏi thường gặp
│   ├── router.tsx           # Cấu hình Router chính
│   ├── routeTree.gen.ts     # Cây định tuyến tự động tạo bởi TanStack
│   ├── server.ts            # Server entry
│   ├── start.ts             # Client entry
│   └── styles.css           # Design system (oklch tokens)
├── supabase/                # Thư mục cấu hình Supabase
├── bun.lock                 # Bun lockfile
└── package.json
```

## 🎨 Design tokens
Mở `src/styles.css`:
- `--background` / `--cobalt` — xanh midnight blue sâu thẳm
- `--gold` / `--gold-deep` — vàng hoàng gia sang trọng
- `--canvas` / `--mist` — trắng tinh khiết và bạc mềm mại
- `--shadow-glow` — hiệu ứng phát sáng ánh vàng
- `.glass` / `.glass-soft` — hiệu ứng thẻ kính mờ (glassmorphism)
- `.star-twinkle` / `.float-slow` — animation sao lấp lánh và trôi lơ lửng

## 📤 Đẩy lên GitHub
```bash
git init
git add .
git commit -m "Initial commit: Melodise client app"
git branch -M main
git remote add origin [https://github.com/](https://github.com/)<username>/melodise-client.git
git push -u origin main
```

---
Made by nhóm 9 SE104.Q28