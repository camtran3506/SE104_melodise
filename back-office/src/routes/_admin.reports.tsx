import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { Download, TrendingUp, Music2, FileSpreadsheet, Loader2 } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { NoPermission } from "@/components/NoPermission";
import { melodiseDb as supabase } from "@/lib/external-supabase";

export const Route = createFileRoute("/_admin/reports")({
  component: ReportsGuard,
});

function ReportsGuard() {
  if (!hasPermission(getCurrentUser(), "reports"))
    return <NoPermission tab="Báo cáo doanh thu" />;
  return <ReportsPage />;
}

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
          <span className="text-gold">“Đã duyệt”</span> trong khoảng đã chọn và xuất ra file Excel
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
          File xuất ra định dạng Excel (.xlsx). Dữ liệu được tính toán thời gian thực bằng RPC dưới Database.
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

// =============== EXPORT REVENUE (ĐÃ NÂNG CẤP THẨM MỸ) ===============
async function exportRevenue(
  from: string,
  to: string,
  setInfo: (s: string) => void,
) {
  const { data, error } = await supabase.rpc("get_revenue_report", {
    start_date: from,
    end_date: to,
  });
  if (error) throw new Error(error.message);

  const rows = data || [];
  if (rows.length === 0) {
    setInfo("Không có dữ liệu trong khoảng thời gian này. Đã xuất file rỗng.");
  }

  let totalRevenue = 0;
  let totalOrders = 0;
  const daily: { period: string; revenue: number; orders: number }[] = [];

  for (const r of rows) {
    const rev = Number(r.total_revenue) || 0;
    const ord = Number(r.total_orders) || 0;
    const period = r.order_date ? new Date(r.order_date).toLocaleDateString("vi-VN") : "Không rõ";
    
    totalRevenue += rev;
    totalOrders += ord;
    daily.push({ period, revenue: rev, orders: ord });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Báo cáo doanh thu");

  // 1. Khối Tiêu đề
  ws.mergeCells("A1:C1"); 
  ws.getCell("A1").value = "BÁO CÁO DOANH THU";
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFB8860B" } };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  // 2. Khối Summary
  ws.getCell("A3").value = "Từ ngày:";
  ws.getCell("B3").value = from;
  ws.getCell("A4").value = "Đến ngày:";
  ws.getCell("B4").value = to;
  ws.getCell("A5").value = "Tổng doanh thu:";
  ws.getCell("B5").value = totalRevenue;
  ws.getCell("B5").numFmt = '#,##0" ₫"';
  ws.getCell("B5").font = { bold: true, color: { argb: "FFD2691E" } };
  ws.getCell("A6").value = "Tổng số đơn hàng:";
  ws.getCell("B6").value = totalOrders;
  ws.getCell("B6").font = { bold: true };

  // 3. Khối Header Bảng biểu (Kẻ viền đậm)
  const headerRow = 8;
  ws.getCell(`A${headerRow}`).value = "Ngày giao dịch";
  ws.getCell(`B${headerRow}`).value = "Doanh thu (VNĐ) + Biểu đồ";
  ws.getCell(`C${headerRow}`).value = "Số lượng đơn thành công";

  ['A', 'B', 'C'].forEach((col) => {
    const cell = ws.getCell(`${col}${headerRow}`);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB8860B" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF8B6508' } },
      left: { style: 'medium', color: { argb: 'FF8B6508' } },
      bottom: { style: 'medium', color: { argb: 'FF8B6508' } },
      right: { style: 'medium', color: { argb: 'FF8B6508' } }
    };
  });
  ws.getRow(headerRow).height = 25;

  // 4. Khối Dữ liệu chi tiết (Kẻ viền mỏng)
  if (daily.length === 0) {
    ws.mergeCells(`A9:C9`);
    ws.getCell("A9").value = "(Không có dữ liệu)";
    ws.getCell("A9").alignment = { horizontal: "center" };
  } else {
    daily.forEach((d, i) => {
      const r = headerRow + 1 + i;
      ws.getCell(`A${r}`).value = d.period;
      ws.getCell(`A${r}`).alignment = { horizontal: "center" };

      ws.getCell(`B${r}`).value = d.revenue;
      ws.getCell(`B${r}`).numFmt = '#,##0" ₫"';

      ws.getCell(`C${r}`).value = d.orders;
      ws.getCell(`C${r}`).alignment = { horizontal: "center" };

      ['A', 'B', 'C'].forEach(col => {
        ws.getCell(`${col}${r}`).border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
      });
    });

    // 🌟 5. Tạo biểu đồ Data Bar chính chủ của Excel vào cột Doanh thu
    ws.addConditionalFormatting({
      ref: `B${headerRow + 1}:B${headerRow + daily.length}`,
      rules: [
        {
          type: 'dataBar',
          cfvo: [{ type: 'min' }, { type: 'max' }],
          color: { argb: 'FFFBEB8D' }, // Màu vàng nhạt làm nền biểu đồ
          border: true
        } as any
      ]
    });
  }

  // 6. Căn chỉnh độ rộng cột chuẩn
  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 40;
  ws.getColumn(3).width = 30;

  await downloadWb(wb, `bao-cao-doanh-thu_${from}_${to}.xlsx`);
}

// =============== EXPORT TOP TRACKS (ĐÃ NÂNG CẤP THẨM MỸ) ===============
async function exportTopTracks(
  from: string,
  to: string,
  setInfo: (s: string) => void,
) {
  const { data, error } = await supabase.rpc("get_top_selling_tracks", {
    start_date: from,
    end_date: to,
    limit_count: 100,
  });
  if (error) throw new Error(error.message);

  const rows = data || [];
  const list: { title: string; artist: string; sold: number; revenue: number }[] = rows.map((r: any) => ({
    title: r.title || "Không rõ",
    artist: r.artist || "Không rõ", // Đã lấy được dữ liệu thật từ RPC
    sold: Number(r.total_sold) || 0,
    revenue: Number(r.total_revenue) || 0,
  }));

  if (list.length === 0) {
    setInfo("Chưa phát sinh giao dịch nào. Đã xuất file rỗng.");
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Nhạc bán chạy");

  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = "BÁO CÁO NHẠC BÁN CHẠY CHI TIẾT";
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFB8860B" } };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  ws.getCell("A3").value = "Từ ngày:";
  ws.getCell("B3").value = from;
  ws.getCell("A4").value = "Đến ngày:";
  ws.getCell("B4").value = to;

  const headerRow = 6;
  const header = ["Tên bài nhạc", "Nghệ sĩ", "Số lượng bán ra", "Tổng doanh thu (VNĐ) + Biểu đồ"];
  header.forEach((h, i) => {
    const col = String.fromCharCode(65 + i); // Tương ứng A, B, C, D
    const cell = ws.getCell(`${col}${headerRow}`);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB8860B" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF8B6508' } },
      left: { style: 'medium', color: { argb: 'FF8B6508' } },
      bottom: { style: 'medium', color: { argb: 'FF8B6508' } },
      right: { style: 'medium', color: { argb: 'FF8B6508' } }
    };
  });
  ws.getRow(headerRow).height = 25;

  if (list.length === 0) {
    ws.mergeCells(`A7:D7`);
    ws.getCell("A7").value = "(Không có dữ liệu)";
    ws.getCell("A7").alignment = { horizontal: "center" };
  } else {
    list.forEach((t, i) => {
      const r = headerRow + 1 + i;
      ws.getCell(`A${r}`).value = t.title;
      ws.getCell(`B${r}`).value = t.artist;
      ws.getCell(`B${r}`).alignment = { horizontal: "center" };
      
      ws.getCell(`C${r}`).value = t.sold;
      ws.getCell(`C${r}`).alignment = { horizontal: "center" };
      
      ws.getCell(`D${r}`).value = t.revenue;
      ws.getCell(`D${r}`).numFmt = '#,##0" ₫"';

      ['A', 'B', 'C', 'D'].forEach(col => {
        ws.getCell(`${col}${r}`).border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
      });
    });

    // 🌟 Thêm DataBar cho cột doanh thu
    ws.addConditionalFormatting({
      ref: `D${headerRow + 1}:D${headerRow + list.length}`,
      rules: [
        {
          type: 'dataBar',
          cfvo: [{ type: 'min' }, { type: 'max' }],
          color: { argb: 'FFADD8E6' }, // Màu xanh lơ nhạt
          border: true
        } as any
      ]
    });
  }

  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 38;

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