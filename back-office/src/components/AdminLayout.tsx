import { Link, Outlet, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { signOut, getCurrentUser, hasPermission, ROLE_LABEL } from "@/lib/auth";
import {
  Users,
  Music2,
  ShoppingBag,
  BarChart3,
  LogOut,
  Sparkles,
} from "lucide-react";
import { StarField } from "./StarField";

const nav = [
  { to: "/accounts", label: "Tài khoản", icon: Users, tab: "accounts" },
  { to: "/music", label: "Nhạc số", icon: Music2, tab: "music" },
  { to: "/orders", label: "Đơn hàng", icon: ShoppingBag, tab: "orders" },
  { to: "/reports", label: "Báo cáo", icon: BarChart3, tab: "reports" },
];

export function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const router = useRouter(); // Thêm hook useRouter
  const user = getCurrentUser();

  // Đã cập nhật lại hàm onSignOut chuẩn Async
  const onSignOut = async () => {
    await signOut(); // Chờ xóa session và localStorage xong
    await router.invalidate(); // Bắt Router dọn dẹp cache và tải lại trạng thái Auth
    navigate({ to: "/login", replace: true }); // Chuyển hướng và xóa lịch sử trang (không cho back lại)
  };

  const visibleNav = nav.filter((n) => hasPermission(user, n.tab));

  return (
    <div className="relative min-h-screen">
      <StarField density={50} />

      <div className="relative z-10 flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl md:flex">
          <div className="flex items-center gap-2 px-6 py-6">
            <Sparkles className="h-7 w-7 text-gold drop-shadow-[0_0_10px_oklch(0.85_0.16_88/0.7)]" />
            <div>
              <div className="text-gold-shimmer text-xl font-bold tracking-wide">Melodise</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Admin Panel
              </div>
            </div>
          </div>

          {user && (
            <div className="mx-3 mb-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
              <div className="text-xs font-semibold text-foreground">{user.full_name}</div>
              <div className="text-[10px] uppercase tracking-wider text-gold">
                {ROLE_LABEL[user.role]}
              </div>
            </div>
          )}

          <nav className="flex flex-1 flex-col gap-1 px-3">
            {visibleNav.map(({ to, label, icon: Icon }) => {
              const active = pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-sidebar-accent text-gold shadow-[0_0_20px_oklch(0.85_0.16_88/0.25)]"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-gold"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_oklch(0.85_0.16_88)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive-foreground"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 md:px-10 md:py-8">
          <div className="animate-fade-in mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}