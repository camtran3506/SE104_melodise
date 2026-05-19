import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { Save, Search } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { NoPermission } from "@/components/NoPermission";

export const Route = createFileRoute("/_admin/orders")({
  component: OrdersGuard,
});

function OrdersGuard() {
  if (!hasPermission(getCurrentUser(), "orders")) return <NoPermission tab="Quản lý đơn hàng" />;
  return <OrdersPage />;
}

type OrderStatus = "Chờ duyệt" | "Đã phê duyệt" | "Hủy đơn";
type OrderItem = { title: string; artist: string; price: number };
type Order = {
  id: string;
  customer: string;
  email: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  date: string;
  licenseCode?: string;
  licenseScope?: string;
  licenseTerm?: string;
  paymentMethod?: string;
  approver?: string;
  approveDate?: string;
  note?: string;
};

const initialOrders: Order[] = [
  {
    id: "OD2026-0142",
    customer: "Phạm Minh Khôi",
    email: "khoi@gmail.com",
    items: [
      { title: "Sao Sáng", artist: "Lan Anh", price: 25000 },
      { title: "Đêm Nhung", artist: "Velvet Crew", price: 20000 },
      { title: "Giai Điệu Vàng", artist: "Minh Khôi", price: 30000 },
    ],
    total: 75000,
    status: "Chờ duyệt",
    date: "14/05/2026",
  },
  {
    id: "OD2026-0141",
    customer: "Hà My",
    email: "hamy@gmail.com",
    items: [{ title: "Bầu Trời Xanh", artist: "Hà My", price: 18000 }],
    total: 18000,
    status: "Đã phê duyệt",
    date: "14/05/2026",
    licenseCode: "LIC-0141",
    licenseScope: "Sử dụng cá nhân",
    licenseTerm: "12 tháng",
    paymentMethod: "Chuyển khoản",
    approver: "Trần Lưu Tuyết Trân",
    approveDate: "14/05/2026",
    note: "—",
  },
  {
    id: "OD2026-0140",
    customer: "Nguyễn Thị Vân Anh",
    email: "vananh@gmail.com",
    items: [
      { title: "Vũ Trụ Của Em", artist: "Starlight", price: 22000 },
      { title: "Lời Thì Thầm", artist: "Lan Anh", price: 28000 },
    ],
    total: 50000,
    status: "Chờ duyệt",
    date: "13/05/2026",
  },
  {
    id: "OD2026-0139",
    customer: "Trần Lan",
    email: "lan@gmail.com",
    items: [
      { title: "Sao Sáng", artist: "Lan Anh", price: 25000 },
      { title: "Đêm Nhung", artist: "Velvet Crew", price: 20000 },
      { title: "Giai Điệu Vàng", artist: "Minh Khôi", price: 30000 },
      { title: "Bầu Trời Xanh", artist: "Hà My", price: 18000 },
      { title: "Vũ Trụ Của Em", artist: "Starlight", price: 32000 },
    ],
    total: 125000,
    status: "Đã phê duyệt",
    date: "13/05/2026",
    licenseCode: "LIC-0139",
    licenseScope: "Phát sóng nội bộ",
    licenseTerm: "12 tháng",
    paymentMethod: "Ví điện tử",
    approver: "Lê Ngọc Tường Vy",
    approveDate: "13/05/2026",
    note: "Khách VIP",
  },
  {
    id: "OD2026-0138",
    customer: "Đỗ Phan",
    email: "fan@gmail.com",
    items: [{ title: "Lời Thì Thầm", artist: "Lan Anh", price: 30000 }],
    total: 30000,
    status: "Hủy đơn",
    date: "12/05/2026",
  },
];

const fmt = (n: number) => n.toLocaleString("vi-VN") + "₫";

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(k) ||
        o.email.toLowerCase().includes(k) ||
        o.customer.toLowerCase().includes(k) ||
        o.items.some((it) => it.title.toLowerCase().includes(k)),
    );
  }, [orders, keyword]);

  const handleUpdate = (updated: Order) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    toast.success("Cập nhật thành công");
    setSelected(null);
  };

  return (
    <>
      <PageHeader
        title="Quản lý giao dịch"
        subtitle="Tra cứu đơn hàng, duyệt và cấp quyền cho khách hàng."
      />

      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo mã đơn hàng, email khách, tên bài nhạc..."
          className="w-full rounded-lg border border-border bg-input/40 py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-gold focus:outline-none"
        />
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
        Không tìm thấy dữ liệu
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
              <tr key={o.id} className="border-b border-border/40 align-top hover:bg-gold/5">
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
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs hover:border-gold hover:text-gold"
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
        status === "Đã phê duyệt"
          ? "bg-emerald-500/15 text-emerald-300"
          : status === "Chờ duyệt"
            ? "bg-amber-400/15 text-amber-200"
            : "bg-destructive/20 text-destructive-foreground"
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
  const today = new Date().toLocaleDateString("vi-VN");
  const [form, setForm] = useState({
    licenseCode: order.licenseCode ?? `LIC-${order.id.replace("OD", "")}`,
    licenseScope: order.licenseScope ?? "",
    licenseTerm: order.licenseTerm ?? "12 tháng",
    paymentMethod: order.paymentMethod ?? "",
    approver: order.approver ?? "",
    approveDate: order.approveDate ?? today,
    note: order.note ?? "",
  });

  const isApprove = status === "Đã phê duyệt";
  const fieldsFilled =
    form.licenseCode.trim() &&
    form.licenseScope.trim() &&
    form.licenseTerm.trim() &&
    form.paymentMethod.trim() &&
    form.approver.trim() &&
    form.approveDate.trim();

  let disableReason = "";
  if (status === "Chờ duyệt") disableReason = "Bạn hãy điều chỉnh trạng thái đơn hàng";
  else if (isApprove && !fieldsFilled) disableReason = "Bạn hãy điền đầy đủ thông tin";

  const submit = () => {
    if (disableReason) return;
    if (status === "Hủy đơn") {
      onSubmit({
        ...order,
        status,
        licenseCode: undefined,
        licenseScope: undefined,
        licenseTerm: undefined,
        paymentMethod: undefined,
        approver: undefined,
        approveDate: undefined,
        note: undefined,
      });
    } else {
      onSubmit({ ...order, status, ...form });
    }
  };

  return (
    <Modal title={`Chi tiết đơn ${order.id}`} onClose={onCancel} size="lg">
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-border/60 bg-sidebar/40 p-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <Info label="Khách hàng" value={`${order.customer} — ${order.email}`} />
            <Info label="Tổng tiền" value={fmt(order.total)} />
          </div>
          <div className="mt-2">
            <Label>Bài hát ({order.items.length})</Label>
            <ul className="mt-1 space-y-0.5">
              {order.items.map((it, i) => (
                <li key={i}>• {it.title} — {it.artist} ({fmt(it.price)})</li>
              ))}
            </ul>
          </div>
        </div>

        <Field label="Trạng thái (STT 3)">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="input"
          >
            <option value="Chờ duyệt">Chờ duyệt</option>
            <option value="Đã phê duyệt">Duyệt</option>
            <option value="Hủy đơn">Hủy đơn</option>
          </select>
        </Field>

        <fieldset
          disabled={!isApprove}
          className={`space-y-3 rounded-lg border border-border/60 p-3 transition ${
            isApprove ? "bg-gold/5" : "opacity-50"
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-gold">
            Thông tin cấp giấy phép (STT 4 – STT 10)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="4. Mã giấy phép">
              <input
                value={isApprove ? form.licenseCode : ""}
                onChange={(e) => setForm({ ...form, licenseCode: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="5. Phạm vi sử dụng">
              <input
                value={isApprove ? form.licenseScope : ""}
                onChange={(e) => setForm({ ...form, licenseScope: e.target.value })}
                placeholder="Cá nhân / Thương mại / Phát sóng..."
                className="input"
              />
            </Field>
            <Field label="6. Thời hạn">
              <input
                value={isApprove ? form.licenseTerm : ""}
                onChange={(e) => setForm({ ...form, licenseTerm: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="7. Phương thức thanh toán">
              <input
                value={isApprove ? form.paymentMethod : ""}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                placeholder="Chuyển khoản / Ví điện tử..."
                className="input"
              />
            </Field>
            <Field label="8. Người duyệt">
              <input
                value={isApprove ? form.approver : ""}
                onChange={(e) => setForm({ ...form, approver: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="9. Ngày duyệt">
              <input
                value={isApprove ? form.approveDate : ""}
                onChange={(e) => setForm({ ...form, approveDate: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <Field label="10. Ghi chú">
            <textarea
              rows={2}
              value={isApprove ? form.note : ""}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="input"
            />
          </Field>
        </fieldset>

        {disableReason && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-xs text-amber-200">
            {disableReason}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30"
          >
            Hủy bỏ
          </button>
          <button
            onClick={submit}
            disabled={!!disableReason}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Cập nhật
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
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
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
