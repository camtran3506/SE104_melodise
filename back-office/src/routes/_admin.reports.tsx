import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { Download, TrendingUp, Music2, FileSpreadsheet, Loader2 } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { NoPermission } from "@/components/NoPermission";
import { melodiseDb } from "@/lib/external-supabase";

export const Route = createFileRoute("/_admin/reports")({
  component: ReportsGuard,
});

function ReportsGuard() {
  if (!hasPermission(getCurrentUser(), "reports"))
    return <NoPermission tab="Báo cáo doanh thu" />;
  return <ReportsPage />;
}

const fmtVnd = (n: number) => (n ?? 0).toLocaleString("vi-VN") + "₫";

function ReportsPage() {
  const [exporting, setExporting] = useState(false);

  return (
    <>
      <PageHeader
        title="Báo cáo & thống kê"
        subtitle="Lập báo cáo doanh thu và thống kê bài nhạc bán chạy từ dữ liệu hoá đơn đã duyệt."
        actions={
          <button
            onClick={() => setExporting(true)}
            className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20"
          >
            <Download className="h-4 w-4" /> Xuất báo cáo
          </button>
        }
      />

      <div className="glass-card rounded-2xl p-8 text-sm text-muted-foreground">
        <p className="mb-2 text-foreground">
          Nhấn <span className="text-gold">“Xuất báo cáo”</span> để mở hộp thoại chọn loại báo
          cáo và khoảng thời gian. Hệ thống sẽ truy vấn các hoá đơn có trạng thái{" "}
          <span className="text-gold">“Duyệt”</span> trong khoảng đã chọn và xuất ra file Excel
          (.xlsx).
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Báo cáo doanh thu — tổng doanh thu, tổng số đơn và biểu đồ theo ngày.</li>
          <li>Báo cáo nhạc bán chạy — danh sách bài nhạc xếp theo số lượng bán giảm dần.</li>
        </ul>
      </div>

      {exporting && <ExportModal onClose={() => setExporting(false)} />}
    </>
  );
}

type ReportType = "revenue" | "top";

type RevenueRow = Record<string, unknown>;
type TopRow = Record<string, unknown>;

// Tìm cột số đầu tiên khớp tên (tolerant với schema khác nhau)
function pickNumber(row: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  }
  return 0;
}
function pickString(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== "") return String(v);
  }
  return "";
}

function ExportModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<ReportType>("revenue");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const exportFile = async () => {
    setError("");
    setInfo("");
    if (!from || !to) {
      setError("Vui lòng chọn khoảng thời gian");
      return;
    }
    if (new Date(from) > new Date(to)) {
      setError("Thời gian lọc không hợp lệ");
      return;
    }

    setLoading(true);
    try {
      if (type === "revenue") {
        await exportRevenue(from, to, setInfo);
      } else {
        await exportTopTracks(from, to, setInfo);
      }
      toast.success("Xuất báo cáo thành công");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không xuất được báo cáo";
      setError(msg);
    } finally {
      setLoading(false);
    }
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
        {info && !error && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-xs text-amber-200">
            {info}
          </div>
        )}

        <div className="text-[11px] text-muted-foreground">
          File xuất ra định dạng Excel (.xlsx). Dữ liệu được lấy trực tiếp từ cơ sở dữ liệu
          hoá đơn có trạng thái “Duyệt”.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30 disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            onClick={exportFile}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}{" "}
            {loading ? "Đang xuất..." : "Xuất báo cáo"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// =============== EXPORT REVENUE ===============
async function exportRevenue(
  from: string,
  to: string,
  setInfo: (s: string) => void,
) {
  const { data, error } = await melodiseDb.rpc("get_revenue_report", {
    start_date: from,
    end_date: to,
  });
  if (error) throw new Error(error.message);

  const rows: RevenueRow[] = Array.isArray(data) ? data : data ? [data] : [];
  const isEmpty = rows.length === 0;

  // Cộng dồn: total_revenue / total_orders
  let totalRevenue = 0;
  let totalOrders = 0;
  const daily: { period: string; revenue: number; orders: number }[] = [];
  for (const r of rows) {
    const rev = pickNumber(r, [
      "revenue",
      "total_revenue",
      "total",
      "amount",
      "doanh_thu",
      "tong_doanh_thu",
    ]);
    const ord = pickNumber(r, [
      "orders",
      "total_orders",
      "order_count",
      "so_don_hang",
      "tong_don",
    ]);
    const period = pickString(r, [
      "period",
      "date",
      "day",
      "month",
      "ngay",
      "thang",
    ]);
    totalRevenue += rev;
    totalOrders += ord;
    daily.push({ period, revenue: rev, orders: ord });
  }

  if (isEmpty || (totalRevenue === 0 && totalOrders === 0)) {
    setInfo("Không có dữ liệu trong khoảng thời gian này. Đã xuất file rỗng.");
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Báo cáo doanh thu");

  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = "BÁO CÁO DOANH THU";
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFB8860B" } };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.getCell("A2").value = "Từ ngày:";
  ws.getCell("B2").value = from;
  ws.getCell("A3").value = "Đến ngày:";
  ws.getCell("B3").value = to;
  ws.getCell("A4").value = "Tổng doanh thu:";
  ws.getCell("B4").value = totalRevenue;
  ws.getCell("B4").numFmt = '#,##0" ₫"';
  ws.getCell("B4").font = { bold: true };
  ws.getCell("A5").value = "Tổng số đơn hàng:";
  ws.getCell("B5").value = totalOrders;
  ws.getCell("B5").font = { bold: true };

  ws.getCell("A7").value = "Kỳ";
  ws.getCell("B7").value = "Doanh thu (VNĐ)";
  ws.getCell("C7").value = "Số đơn";
  ["A7", "B7", "C7"].forEach((c) => {
    ws.getCell(c).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFB8860B" },
    };
  });

  if (daily.length === 0) {
    ws.getCell("A8").value = "(Không có dữ liệu)";
  } else {
    daily.forEach((d, i) => {
      const r = 8 + i;
      ws.getCell(`A${r}`).value = d.period || `Kỳ ${i + 1}`;
      ws.getCell(`B${r}`).value = d.revenue;
      ws.getCell(`B${r}`).numFmt = '#,##0" ₫"';
      ws.getCell(`C${r}`).value = d.orders;
    });

    // "Biểu đồ doanh thu" dạng bar bằng ký tự (vì exceljs chưa hỗ trợ chèn chart)
    const chartStart = 8 + daily.length + 2;
    ws.getCell(`A${chartStart - 1}`).value = "BIỂU ĐỒ DOANH THU";
    ws.getCell(`A${chartStart - 1}`).font = { bold: true, color: { argb: "FFB8860B" } };
    const max = Math.max(1, ...daily.map((d) => d.revenue));
    daily.forEach((d, i) => {
      const r = chartStart + i;
      ws.getCell(`A${r}`).value = d.period || `Kỳ ${i + 1}`;
      const bars = Math.round((d.revenue / max) * 40);
      ws.getCell(`B${r}`).value = "█".repeat(bars) + ` ${d.revenue.toLocaleString("vi-VN")}₫`;
      ws.getCell(`B${r}`).font = { color: { argb: "FFB8860B" } };
    });
  }

  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 42;
  ws.getColumn(3).width = 14;

  await downloadWb(wb, `bao-cao-doanh-thu_${from}_${to}.xlsx`);
}

// =============== EXPORT TOP TRACKS ===============
async function exportTopTracks(
  from: string,
  to: string,
  setInfo: (s: string) => void,
) {
  const { data, error } = await melodiseDb.rpc("get_top_selling_tracks", {
    start_date: from,
    end_date: to,
    limit_count: 100,
  });
  if (error) throw new Error(error.message);

  const rows: TopRow[] = Array.isArray(data) ? data : data ? [data] : [];

  const list = rows.map((r) => ({
    title: pickString(r, ["title", "track_title", "ten_bai_nhac", "name"]),
    artist: pickString(r, ["artist", "artist_name", "ten_tac_gia", "author"]),
    sold: pickNumber(r, ["sold", "quantity", "total_sold", "so_luong", "qty"]),
    revenue: pickNumber(r, ["revenue", "total_revenue", "doanh_thu", "amount"]),
  }));
  list.sort((a, b) => b.sold - a.sold);

  if (list.length === 0) {
    setInfo("Chưa phát sinh giao dịch nào. Đã xuất file rỗng.");
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Nhạc bán chạy");

  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = "BÁO CÁO NHẠC BÁN CHẠY";
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFB8860B" } };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.getCell("A2").value = "Từ ngày:";
  ws.getCell("B2").value = from;
  ws.getCell("A3").value = "Đến ngày:";
  ws.getCell("B3").value = to;

  const header = ["Tên bài nhạc", "Tên tác giả", "Số lượng đã bán", "Tổng doanh thu (VNĐ)"];
  header.forEach((h, i) => {
    const c = ws.getCell(5, i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB8860B" } };
  });

  if (list.length === 0) {
    ws.getCell("A6").value = "(Không có dữ liệu)";
  } else {
    list.forEach((t, i) => {
      const r = 6 + i;
      ws.getCell(`A${r}`).value = t.title;
      ws.getCell(`B${r}`).value = t.artist;
      ws.getCell(`C${r}`).value = t.sold;
      ws.getCell(`D${r}`).value = t.revenue;
      ws.getCell(`D${r}`).numFmt = '#,##0" ₫"';
    });
  }

  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 22;

  await downloadWb(wb, `bao-cao-nhac-ban-chay_${from}_${to}.xlsx`);
}

async function downloadWb(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
