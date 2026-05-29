import { melodiseDb } from "./external-supabase";

// 1. Cập nhật Role chuẩn khớp với Database và UI
export type Role = "admin" | "producer" | "sales"

export type AuthUser = {
  user_id: number;      // Thống nhất kiểu số
  email: string;
  full_name: string;    // Đồng bộ tên biến với DB
  role: Role;           // Key chuẩn: admin, producer...
  rawRole: string;      // Tên hiển thị gốc: Quản lý cấp cao...
};

const STORAGE_KEY = "melodise-current-user";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 2. Hàm chuẩn hóa Role (Đã thêm Khách hàng)
function normalizeRole(raw: string | null | undefined): Role | null {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return null;
  if (s.includes("cấp cao") || s === "admin") return "admin";
  if (s.includes("sản xuất") || s === "producer") return "producer";
  if (s.includes("kinh doanh") || s === "sales") return "sales";
  return null;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Quản lý cấp cao",
  producer: "Nhân viên Sản xuất",
  sales: "Nhân viên Kinh doanh",
};

// 3. Ma trận quyền (Đã thêm quyền cho Customer nếu cần)
export const PERMISSIONS: Record<Role, string[]> = {
  admin: ["accounts", "music", "orders", "reports"],
  producer: ["music"],
  sales: ["music", "orders", "reports"],
};

export function hasPermission(user: AuthUser | null, tab: string): boolean {
  if (!user) return false;
  return PERMISSIONS[user.role]?.includes(tab) ?? false;
}

export function canEditMusic(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === "producer";
}

// 4. Hàm Đăng nhập chuẩn Supabase Auth
export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  if (!email.trim() || !password.trim()) {
    return { ok: false, error: "Vui lòng nhập đầy đủ thông tin" };
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return { ok: false, error: "Email sai định dạng" };
  }

  // Bước A: Xác thực với Supabase Auth (Để lấy Token/Session)
  const { data: authData, error: authError } = await melodiseDb.auth.signInWithPassword({
    email: email.trim(),
    password: password,
  });

  if (authError) {
    return { ok: false, error: "Email hoặc mật khẩu không chính xác" };
  }

  // Bước B: Lấy Profile từ bảng public.users dựa trên auth_id
  const { data: userData, error: userError } = await melodiseDb
    .from("users")
    .select("user_id, email, full_name, role")
    .eq("auth_id", authData.user.id)
    .single();

  if (userError || !userData) {
    await melodiseDb.auth.signOut();
    return { ok: false, error: "Tài khoản chưa được cấu hình hồ sơ nhân viên." };
  }

  const role = normalizeRole(userData.role);
  if (!role) {
    await melodiseDb.auth.signOut();
    return { ok: false, error: `Vai trò "${userData.role}" không được hỗ trợ.` };
  }

  const user: AuthUser = {
    user_id: userData.user_id,
    email: userData.email,
    full_name: userData.full_name ?? userData.email,
    role,
    rawRole: userData.role || ROLE_LABEL[role],
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  return { ok: true, user };
}

export async function signOut() {
  await melodiseDb.auth.signOut();
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
