import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { Save, Search, Loader2 } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { NoPermission } from "@/components/NoPermission";
import { melodiseDb } from "@/lib/external-supabase";

export const Route = createFileRoute("/_admin/orders")({
  component: OrdersGuard,
});

function OrdersGuard() {
  if (!hasPermission(getCurrentUser(), "orders")) return <NoPermission tab="Quản lý đơn hàng" />;
  return <OrdersPage />;
}

type OrderStatus = "Chờ duyệt" | "Đã duyệt" | "Hủy đơn";
type OrderItem = { title: string; artist: string; price: number };

type Order = {
  id: string; 
  realId: string | number;
  customer: string;
  email: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  date: string; 
  rawDate: string; 
};

const fmt = (n: number) => n.toLocaleString("vi-VN") + "₫";

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);

  // CÁC STATE CHO BỘ LỌC
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // FETCH DATA TỪ DATABASE
  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const [ordersRes, detailsRes, tracksRes, usersRes] = await Promise.all([
          melodiseDb.from("orders").select("*").order("created_at", { ascending: false }),
          melodiseDb.from("order_details").select("*"),
          melodiseDb.from("tracks").select("track_id, title, artist, price"),
          melodiseDb.from("users").select("*")
        ]);

        if (ordersRes.error) throw ordersRes.error;

        const dbOrders = ordersRes.data || [];
        const dbDetails = detailsRes.data || [];
        const dbTracks = tracksRes.data || [];
        const dbUsers = usersRes.data || [];

        const mappedOrders: Order[] = dbOrders.map((o: any) => {
          const user = dbUsers.find((u: any) => u.user_id === o.user_id);
          const email = user?.email || "Unknown";
          const customerName = user?.name || user?.full_name || email.split("@")[0] || "Khách";

          const orderItems = dbDetails
            .filter((d: any) => d.order_id === o.order_id)
            .map((d: any) => {
              const track = dbTracks.find((t: any) => t.track_id === d.track_id);
              return {
                title: track?.title || "Không rõ",
                artist: track?.artist || "Không rõ",
                price: Number(track?.price) || 0
              };
            });

          const total = o.total_amount ? Number(o.total_amount) : orderItems.reduce((sum, item) => sum + item.price, 0);

          return {
            id: o.order_code || `ORD-${o.order_id}`,
            realId: o.order_id,
            customer: customerName,
            email: email,
            items: orderItems,
            total: total,
            status: (o.status as OrderStatus) || "Chờ duyệt",
            date: new Date(o.created_at).toLocaleDateString("vi-VN"),
            rawDate: o.created_at, 
          };
        });

        setOrders(mappedOrders);
      } catch (error: any) {
        toast.error("Không thể tải danh sách đơn hàng: " + error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  // LOGIC LỌC ĐA ĐIỀU KIỆN (KẾT HỢP)
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      // 1. Lọc theo trạng thái
      if (statusFilter !== "all" && o.status !== statusFilter) {
        return false;
      }

      // 2. Lọc theo khoảng thời gian
      if (startDate || endDate) {
        const orderDate = new Date(o.rawDate);
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0); 
          if (orderDate < start) return false;
        }
        
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); 
          if (orderDate > end) return false;
        }
      }

      // 3. Lọc theo từ khóa
      if (keyword) {
        const k = keyword.trim().toLowerCase();
        const matchId = o.id.toLowerCase().includes(k);
        const matchEmail = o.email.toLowerCase().includes(k);
        const matchCustomer = o.customer.toLowerCase().includes(k);
        const matchItems = o.items.some((it) => it.title.toLowerCase().includes(k));
        
        if (!matchId && !matchEmail && !matchCustomer && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, keyword, statusFilter, startDate, endDate]);

  // LƯU TRẠNG THÁI & TỰ ĐỘNG CẤP PHÉP
  const handleUpdate = async (updated: Order) => {
    try {
      const { error: orderError } = await melodiseDb
        .from("orders")
        .update({ status: updated.status })
        .eq("order_id", updated.realId);

      if (orderError) throw orderError;

      if (updated.status === "Đã duyệt") {
        const { error: licenseInsertError } = await melodiseDb
          .from("licenses")
          .insert({ order_id: updated.realId });
          
        if (licenseInsertError && licenseInsertError.code !== "23505") {
          throw licenseInsertError;
        }
      } else {
        const { error: licenseDeleteError } = await melodiseDb
          .from("licenses")
          .delete()
          .eq("order_id", updated.realId);
          
        if (licenseDeleteError) throw licenseDeleteError;
      }

      setOrders((prev) => prev.map((o) => (o.realId === updated.realId ? updated : o)));
      toast.success("Đã cập nhật trạng thái đơn hàng và xử lý cấp phép thành công");
      setSelected(null);
    } catch (error: any) {
      console.error("Lỗi xử lý nghiệp vụ đơn hàng/giấy phép:", error);
      toast.error("Lỗi hệ thống: " + (error.message || JSON.stringify(error)));
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Quản lý giao dịch" subtitle="Tra cứu đơn hàng, duyệt và cấp quyền cho khách hàng." />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải dữ liệu đơn hàng...
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Quản lý giao dịch"
        subtitle="Tra cứu đơn hàng, duyệt và cấp quyền cho khách hàng."
      />

      {/* THANH CÔNG CỤ TÌM KIẾM VÀ LỌC */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center glass-card p-3 rounded-xl border border-border/50">
        
        {/* Bộ lọc 1: Từ khóa */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã đơn, email, khách hàng..."
            className="w-full rounded-lg border border-border bg-input/40 py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bộ lọc 2: Trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-border bg-input/40 px-3 py-2 text-sm focus:border-gold focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Chờ duyệt">Chờ duyệt</option>
            <option value="Đã duyệt">Đã duyệt</option>
            <option value="Hủy đơn">Hủy đơn</option>
          </select>

          {/* Bộ lọc 3: Từ ngày */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Từ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-border bg-input/40 px-3 py-2 text-sm focus:border-gold focus:outline-none [color-scheme:dark] cursor-pointer"
            />
          </div>

          {/* Bộ lọc 4: Đến ngày */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Đến:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-border bg-input/40 px-3 py-2 text-sm focus:border-gold focus:outline-none [color-scheme:dark] cursor-pointer"
            />
          </div>
        </div>
      </div>

      <OrdersTable orders={filtered} onView={setSelected} />

      {selected && (
        <ApprovalForm
          order={selected}
          onCancel={() => setSelected(null)}
          onSubmit={handleUpdate}
        />
      )}
    </>
  );
}

function OrdersTable({
  orders,
  onView,
}: {
  orders: Order[];
  onView: (o: Order) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
        Không tìm thấy dữ liệu đơn hàng phù hợp
      </div>
    );
  }
  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Mã đơn</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Tổng tiền</th>
              <th className="px-4 py-3">Ngày</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.realId} className="border-b border-border/40 align-top hover:bg-gold/5">
                <td className="px-4 py-3 font-mono text-xs text-gold">{o.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{o.customer}</div>
                  <div className="text-xs text-muted-foreground">{o.email}</div>
                </td>
                <td className="px-4 py-3 font-semibold text-gold">{fmt(o.total)}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.date}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onView(o)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs hover:border-gold hover:text-gold transition-colors"
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === "Đã duyệt"
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
          : status === "Chờ duyệt"
            ? "bg-amber-400/15 text-amber-200 border border-amber-400/20"
            : "bg-destructive/15 text-destructive border border-destructive/20"
      }`}
    >
      {status}
    </span>
  );
}

function ApprovalForm({
  order,
  onCancel,
  onSubmit,
}: {
  order: Order;
  onCancel: () => void;
  onSubmit: (o: Order) => void;
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUnchanged = status === order.status;

  const submit = async () => {
    if (isUnchanged) return;
    setIsSubmitting(true);
    await onSubmit({ ...order, status });
    setIsSubmitting(false);
  };

  return (
    <Modal title={`Chi tiết đơn ${order.id}`} onClose={onCancel} size="md">
      <div className="space-y-4 text-sm">
        
        {/* KHỐI THÔNG TIN ĐƠN HÀNG */}
        <div className="rounded-lg border border-border/60 bg-sidebar/40 p-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <Info label="Khách hàng" value={`${order.customer} — ${order.email}`} />
            <Info label="Tổng tiền" value={fmt(order.total)} />
          </div>
          <div className="mt-4">
            <Label>Bài hát ({order.items.length})</Label>
            <ul className="mt-2 space-y-1">
              {order.items.map((it, i) => (
                <li key={i} className="text-muted-foreground">
                  • <span className="font-medium text-canvas">{it.title}</span> — {it.artist} ({fmt(it.price)})
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* KHỐI CẬP NHẬT TRẠNG THÁI */}
        <div className="rounded-lg border border-border/60 p-4">
          <Field label="Thao tác xét duyệt">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="input w-full mt-1.5 font-medium cursor-pointer"
            >
              <option value="Chờ duyệt">Chờ duyệt</option>
              <option value="Đã duyệt">Duyệt & Tự động cấp phép</option>
              <option value="Hủy đơn">Hủy đơn & Thu hồi giấy phép</option>
            </select>
          </Field>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            Hệ thống sẽ tự động cấp mã bản quyền vĩnh viễn cho khách hàng khi bạn chọn <strong>Duyệt & Tự động cấp phép</strong>.
          </p>
        </div>

        {/* NÚT ĐIỀU KHIỂN */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30 disabled:opacity-50 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={submit}
            disabled={isUnchanged || isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
            {isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold uppercase tracking-wider text-gold">{label}</div>
      {children}
    </label>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-wider text-muted-foreground">{children}</div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="font-medium mt-0.5">{value || "—"}</div>
    </div>
  );
}