import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { Download, TrendingUp, Music2, FileSpreadsheet } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { NoPermission } from "@/components/NoPermission";

export const Route = createFileRoute("/_admin/reports")({
  component: ReportsGuard,
});

function ReportsGuard() {
  if (!hasPermission(getCurrentUser(), "reports")) return <NoPermission tab="Báo cáo doanh thu" />;
  return <ReportsPage />;
}

const monthly = [
  { month: "T1", revenue: 42 },
  { month: "T2", revenue: 51 },
  { month: "T3", revenue: 58 },
  { month: "T4", revenue: 67 },
  { month: "T5", revenue: 82 },
];

const top = [
  { title: "Sao Sáng", artist: "Lan Anh", sold: 412, revenue: 10300000 },
  { title: "Đêm Nhung", artist: "Velvet Crew", sold: 388, revenue: 7700000 },
  { title: "Giai Điệu Vàng", artist: "Minh Khôi", sold: 301, revenue: 9000000 },
  { title: "Vũ Trụ Của Em", artist: "Starlight", sold: 254, revenue: 5500000 },
];

const fmtVnd = (n: number) => n.toLocaleString("vi-VN") + "₫";

function ReportsPage() {
  const [exporting, setExporting] = useState(false);
  const max = Math.max(...monthly.map((m) => m.revenue));

  return (
    <>
      <PageHeader
        title="Báo cáo & thống kê"
        subtitle="Doanh thu, nhạc bán chạy và xu hướng kinh doanh."
        actions={
          <button
            onClick={() => setExporting(true)}
            className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20"
          >
            <Download className="h-4 w-4" /> Xuất báo cáo
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-card rounded-2xl p-6 lg:col-span-2">
          <div className="mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-semibold">Doanh thu theo tháng (triệu ₫)</h2>
          </div>
          <div className="flex h-64 items-end gap-4">
            {monthly.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-accent via-gold/60 to-gold shadow-[0_-4px_20px_oklch(0.85_0.16_88/0.4)] transition-all hover:from-gold hover:to-amber-200"
                    style={{ height: `${(m.revenue / max) * 100}%` }}
                  >
                    <div className="-mt-6 text-center text-xs font-bold text-gold">
                      {m.revenue}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{m.month}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Music2 className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-semibold">Top bài bán chạy</h2>
          </div>
          <ol className="space-y-3">
            {top.map((t, i) => (
              <li
                key={t.title}
                className="flex items-center gap-3 rounded-lg border border-transparent p-2 transition hover:border-gold/30 hover:bg-gold/5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.artist}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gold">
                    {(t.revenue / 1_000_000).toFixed(1)}M
                  </div>
                  <div className="text-[10px] text-muted-foreground">{t.sold} bán</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {exporting && <ExportModal onClose={() => setExporting(false)} />}
    </>
  );
}

type ReportType = "revenue" | "top";

function ExportModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<ReportType>("revenue");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");

  const exportFile = () => {
    setError("");
    if (!from || !to) {
      setError("Vui lòng chọn khoảng thời gian");
      return;
    }
    if (new Date(from) > new Date(to)) {
      setError("Thời gian lọc không hợp lệ");
      return;
    }

    const filename =
      type === "revenue"
        ? `bao-cao-doanh-thu_${from}_${to}.csv`
        : `bao-cao-nhac-ban-chay_${from}_${to}.csv`;

    let csv = "";
    if (type === "revenue") {
      const totalRevenue = monthly.reduce((s, m) => s + m.revenue * 1_000_000, 0);
      const totalOrders = 142;
      if (monthly.length === 0) {
        toast.message("Không có dữ liệu trong khoảng thời gian này");
      }
      csv =
        "BÁO CÁO DOANH THU\n" +
        `Từ ngày,${from}\nĐến ngày,${to}\n\n` +
        "Tháng,Doanh thu (VNĐ)\n" +
        monthly.map((m) => `${m.month},${m.revenue * 1_000_000}`).join("\n") +
        `\n\nTổng doanh thu,${totalRevenue}\nTổng số đơn hàng,${totalOrders}\n`;
    } else {
      if (top.length === 0) {
        toast.message("Chưa phát sinh giao dịch nào");
      }
      csv =
        "BÁO CÁO NHẠC BÁN CHẠY\n" +
        `Từ ngày,${from}\nĐến ngày,${to}\n\n` +
        "Tên bài nhạc,Tên tác giả,Số lượng đã bán,Tổng doanh thu (VNĐ)\n" +
        top
          .slice()
          .sort((a, b) => b.sold - a.sold)
          .map((t) => `"${t.title}","${t.artist}",${t.sold},${t.revenue}`)
          .join("\n") +
        "\n";
    }

    // BOM for Excel UTF-8
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Xuất báo cáo thành công");
    onClose();
  };

  return (
    <Modal title="Xuất báo cáo" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Loại báo cáo
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ReportTypeButton
              active={type === "revenue"}
              onClick={() => setType("revenue")}
              label="Báo cáo doanh thu"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <ReportTypeButton
              active={type === "top"}
              onClick={() => setType("top")}
              label="Báo cáo nhạc bán chạy"
              icon={<Music2 className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Ngày bắt đầu
            </div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Ngày kết thúc
            </div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input"
            />
          </label>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive-foreground">
            {error}
          </div>
        )}

        <div className="text-[11px] text-muted-foreground">
          File xuất ra định dạng CSV (mở trực tiếp bằng Excel, hỗ trợ UTF-8 tiếng Việt).
          Tổng doanh thu hiển thị: <span className="text-gold">{fmtVnd(monthly.reduce((s, m) => s + m.revenue * 1_000_000, 0))}</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30"
          >
            Hủy bỏ
          </button>
          <button
            onClick={exportFile}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02]"
          >
            <FileSpreadsheet className="h-4 w-4" /> Xuất báo cáo
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ReportTypeButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition ${
        active
          ? "border-gold bg-gold/10 text-gold shadow-[var(--shadow-gold)]"
          : "border-border hover:border-gold/40"
      }`}
    >
      {icon} {label}
    </button>
  );
}
