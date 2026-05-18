import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import {
  Music2,
  Users,
  ShoppingBag,
  TrendingUp,
  Disc3,
  PlayCircle,
} from "lucide-react";

export const Route = createFileRoute("/_admin/")({
  component: Dashboard,
});

const stats = [
  { label: "Bài hát đang bán", value: "1,284", icon: Music2, trend: "+12%" },
  { label: "Tài khoản người dùng", value: "8,420", icon: Users, trend: "+5.4%" },
  { label: "Đơn hàng tháng này", value: "642", icon: ShoppingBag, trend: "+18%" },
  { label: "Doanh thu (₫)", value: "82.5M", icon: TrendingUp, trend: "+9.1%" },
];

const recentTracks = [
  { title: "Sao Sáng", artist: "Lan Anh", price: "25,000₫", sales: 142 },
  { title: "Đêm Nhung", artist: "Velvet Crew", price: "20,000₫", sales: 121 },
  { title: "Giai Điệu Vàng", artist: "Minh Khôi", price: "30,000₫", sales: 98 },
  { title: "Bầu Trời Xanh", artist: "Hà My", price: "18,000₫", sales: 87 },
];

function Dashboard() {
  return (
    <>
      <PageHeader
        title="Tổng quan"
        subtitle="Theo dõi hoạt động kinh doanh nhạc số trong thời gian thực."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, trend }) => (
          <div
            key={label}
            className="glass-card group relative overflow-hidden rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-gold/40"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  {value}
                </div>
                <div className="mt-1 text-xs font-semibold text-gold">
                  {trend} so với tháng trước
                </div>
              </div>
              <div className="rounded-xl bg-gold/10 p-2.5 text-gold ring-1 ring-gold/30">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-card rounded-2xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Bài hát bán chạy</h2>
            <Link to="/music" className="text-xs text-gold hover:underline">
              Xem tất cả →
            </Link>
          </div>
          <div className="space-y-2">
            {recentTracks.map((t, i) => (
              <div
                key={t.title}
                className="flex items-center gap-4 rounded-xl border border-transparent px-3 py-3 transition hover:border-gold/30 hover:bg-gold/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-accent/30 text-gold">
                  <Disc3 className="h-5 w-5 animate-spin [animation-duration:6s]" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.artist}</div>
                </div>
                <div className="hidden text-sm text-muted-foreground sm:block">
                  {t.sales} lượt mua
                </div>
                <div className="font-semibold text-gold">{t.price}</div>
                <div className="text-xs text-muted-foreground">#{i + 1}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Hoạt động gần đây</h2>
          <ul className="space-y-4 text-sm">
            {[
              "Quản trị viên duyệt 12 đơn hàng mới",
              "Thêm 3 bài hát vào danh mục Pop",
              "Cập nhật giá album 'Đêm Nhung'",
              "Khóa 1 tài khoản vi phạm",
              "Xuất báo cáo doanh thu tháng 4",
            ].map((line, i) => (
              <li key={i} className="flex gap-3">
                <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span className="text-foreground/85">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
