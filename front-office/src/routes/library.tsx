import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileText, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/library")({
  component: Library,
  beforeLoad: () => {
    // Precondition: user must be logged in
    if (typeof window !== "undefined" && !useStore.getState().user) {
      throw redirect({ to: "/auth" });
    }
  },
  head: () => ({ meta: [{ title: "Tài Nguyên — melodise" }] }),
});

const formatVND = (n: number) =>
  (n ?? 0).toLocaleString("vi-VN") + "₫";

type Track = {
  id: number;
  title: string;
  artist: string;
  cover: string;
  file_path: string;
  price: number;
};

type License = {
  license_id: string;
  order_id: string;
  license_code: string;    // Phải khớp tên này
  license_scope: string;
  license_term: string;
  issued_at: string;
};

type Order = {
  id: string;
  realId: string;
  total: number;
  status: string;
  date: string;
  items: Track[];
  license?: License | null;
};

function Library() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyLibrary() {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: dbUser } = await (supabase as any)
          .from("users")
          .select("user_id")
          .eq("auth_id", user.id)
          .single();

        if (!dbUser)
          throw new Error("Không tìm thấy thông tin tài khoản");

        const [ordersRes, detailsRes, tracksRes, licensesRes] =
          await Promise.all([
            (supabase as any)
              .from("orders")
              .select("*")
              .eq("user_id", dbUser.user_id)
              .order("created_at", { ascending: false }),

            (supabase as any).from("order_details").select("*"),

            (supabase as any).from("tracks").select("*"),

            (supabase as any).from("licenses").select("*"),
          ]);

        if (ordersRes.error) throw ordersRes.error;
        if (licensesRes.error) throw licensesRes.error;

        const dbOrders = ordersRes.data || [];
        const dbDetails = detailsRes.data || [];
        const dbTracks = tracksRes.data || [];
        const dbLicenses = licensesRes.data || [];

        console.log("-> 📦 Đơn hàng:", ordersRes.data);
        console.log("-> 📜 Giấy phép:", licensesRes.data);
        console.log("-> 📊 dbLicenses length:", dbLicenses.length, dbLicenses);

        const mappedOrders: Order[] = dbOrders.map((o: any) => {
          console.log("-> 🔍 Raw order object:", o);

          const orderItems = dbDetails
            .filter((d: any) => d.order_id === o.order_id)
            .map((d: any) => {
              const t = dbTracks.find(
                (track: any) => track.track_id === d.track_id
              );

              let coverUrl =
                "https://placehold.co/400x400/1a1a1a/gold?text=Melodise";

              if (t?.cover_image_url) {
                if (t.cover_image_url.startsWith("http")) {
                  coverUrl = t.cover_image_url;
                } else {
                  let path = t.cover_image_url;

                  if (path.startsWith("public-media/")) {
                    path = path.replace("public-media/", "");
                  }

                  const { data } = supabase.storage
                    .from("public-media")
                    .getPublicUrl(path);

                  coverUrl = data.publicUrl;
                }
              }

              return {
                id: t?.track_id || 0,
                title: t?.title || "Không rõ",
                artist: t?.artist || "Không rõ",
                cover: coverUrl,
                file_path: t?.original_audio_url || "",
                price: Number(d.price) || Number(t?.price) || 0, 
              };
            });

          const orderLicense = dbLicenses.find((l: any) =>
            String(l.order_id ?? "").trim() === String(o.order_id ?? "").trim()
          );

          if (!orderLicense) {
            console.warn(`⚠️ Không tìm thấy license cho order ${o.order_id}`);
            console.log("  dbLicenses:", dbLicenses.map((l: { order_id: any; }) => l.order_id));
          }

          // Debug: Kiểm tra order.license
          console.log(`-> 🔎 Order ${o.order_id}:`, { found: !!orderLicense, license: orderLicense });

          const finalTotal = orderItems.reduce(
            (sum: number, item: any) => sum + item.price,
            0
          );

          return {
            id: o.order_code || `ORD-${o.order_id}`,
            realId: o.order_id,
            total: finalTotal,
            status: o.status || "Chờ duyệt",
            date: new Date(o.created_at).toLocaleString("vi-VN"),
            items: orderItems,
            license: orderLicense
              ? {
                  license_id: orderLicense.license_id,
                  order_id: orderLicense.order_id,
                  license_code: orderLicense.license_code,
                  license_scope: orderLicense.license_scope,
                  license_term: orderLicense.license_term,
                  issued_at: orderLicense.issued_at,
                }
              : undefined,
          };
        });

        setOrders(mappedOrders);
      } catch (error: any) {
        console.error("Lỗi tải dữ liệu thư viện:", error);
        toast.error(error.message || "Không thể tải thư viện");
      } finally {
        setLoading(false);
      }
    }

    fetchMyLibrary();
  }, []);

  const handleDownloadTrack = async (track: Track) => {
    if (!track.file_path) {
      toast.error("Tệp nhạc gốc chưa được đính kèm!");
      return;
    }

    try {
      setDownloading(`track-${track.id}`);

      let safePath = track.file_path.trim();

      if (safePath.includes("?")) {
        safePath = safePath.split("?")[0];
      }

      if (safePath.includes("private-vault/")) {
        safePath = safePath.split("private-vault/")[1];
      } else if (safePath.startsWith("http")) {
        safePath = safePath.substring(safePath.lastIndexOf("/") + 1);
      }

      if (safePath.startsWith("/")) {
        safePath = safePath.substring(1);
      }

      safePath = decodeURIComponent(safePath);

      console.log("-> SDK Request Path:", safePath);

      const { data, error } = await supabase.storage
        .from("private-vault")
        .download(safePath);

      if (error) {
        throw new Error(
          `Không tìm thấy file \"${safePath}\" trong bucket private-vault`
        );
      }

      const url = window.URL.createObjectURL(data);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${track.title} - ${track.artist}.mp3`;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Tải nhạc thành công!");
    } catch (error: any) {
      toast.error(error.message || "Tải nhạc thất bại");
    } finally {
      setDownloading(null);
    }
  };

  // Lưu ý: Đã thêm chữ async vào trước hàm
  const handleDownloadLicense = async (order: Order, track: Track) => {
    console.log("-> 🔍 Kiểm tra giấy phép của đơn hàng:", order);

    const licenseData = order.license;

    if (!licenseData || !licenseData.license_code) {
      toast.error("Không tìm thấy thông tin giấy phép! Hãy kiểm tra xem đơn hàng đã ở trạng thái 'Đã duyệt' chưa.");
      return;
    }

    try {
      // 1. Khởi tạo cấu trúc file Word
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Tiêu đề 1
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "GIẤY CHỨNG NHẬN BẢN QUYỀN ÂM NHẠC",
                    bold: true,
                    size: 28, // Kích thước 14pt
                    font: "Times New Roman",
                  }),
                ],
              }),
              // Tiêu đề 2
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "MELODISE MUSIC",
                    bold: true,
                    size: 28, 
                    font: "Times New Roman",
                  }),
                ],
              }),
              new Paragraph({ text: "" }), // Dòng trống
              new Paragraph({ text: "" }), 
              
              // Cụm thông tin mã số
              new Paragraph({
                children: [
                  new TextRun({ text: "MÃ GIẤY PHÉP:\t", bold: true, font: "Times New Roman", size: 24 }), // 24 = 12pt
                  new TextRun({ text: licenseData.license_code, font: "Times New Roman", size: 24 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "MÃ ĐƠN HÀNG:\t", bold: true, font: "Times New Roman", size: 24 }),
                  new TextRun({ text: order.id, font: "Times New Roman", size: 24 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "NGÀY CẤP:\t\t", bold: true, font: "Times New Roman", size: 24 }),
                  new TextRun({ text: new Date(licenseData.issued_at).toLocaleDateString("vi-VN"), font: "Times New Roman", size: 24 }),
                ],
              }),
              new Paragraph({ text: "" }),
              
              // Cụm thông tin tác phẩm
              new Paragraph({
                children: [
                  new TextRun({ text: "Tên tác phẩm:\t", bold: true, font: "Times New Roman", size: 24 }),
                  new TextRun({ text: track.title, font: "Times New Roman", size: 24 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Tác giả:\t\t", bold: true, font: "Times New Roman", size: 24 }),
                  new TextRun({ text: track.artist, font: "Times New Roman", size: 24 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Phạm vi:\t\t", bold: true, font: "Times New Roman", size: 24 }),
                  new TextRun({ text: licenseData.license_scope, font: "Times New Roman", size: 24 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Thời hạn:\t\t", bold: true, font: "Times New Roman", size: 24 }),
                  new TextRun({ text: licenseData.license_term, font: "Times New Roman", size: 24 }),
                ],
              }),
              new Paragraph({ text: "" }),
              new Paragraph({ text: "" }),
              
              // Lời cảm ơn
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Xin cảm ơn bạn đã đồng hành cùng Melodise!",
                    italics: true,
                    font: "Times New Roman",
                    size: 24,
                  }),
                ],
              }),
            ],
          },
        ],
      });

      // 2. Đóng gói (Pack) file Word thành Blob và tải xuống
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `License_${licenseData.license_code}.docx`;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Đã tải giấy phép thành công!");

    } catch (error) {
      console.error("Lỗi khi tạo file Word:", error);
      toast.error("Có lỗi xảy ra khi tạo giấy phép. Vui lòng thử lại!");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-24 flex flex-col items-center justify-center text-mist">
        <Loader2 className="h-8 w-8 animate-spin text-gold mb-4" />
        <p>Đang đồng bộ thư viện...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-6 py-24 grid place-items-center">
        <div className="glass rounded-3xl p-12 text-center max-w-md">
          <FolderOpen className="h-12 w-12 text-gold mx-auto mb-4" />

          <h2 className="text-2xl text-canvas">Thư viện trống</h2>

          <Button asChild className="mt-6">
            <Link to="/">Mua nhạc ngay</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl text-canvas">
        Tài Nguyên của bạn
      </h1>

      <p className="text-mist/70 text-sm mt-2">
        Nhạc bản quyền và giấy phép sở hữu của bạn.
      </p>

      <div className="mt-10 space-y-8">
        {orders.map((o) => (
          <div key={o.id} className="glass rounded-3xl p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <p className="font-display text-canvas">Đơn {o.id}</p>

                <p className="text-mist/60 text-xs mt-1">
                  {o.date} · {formatVND(o.total)}
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  o.status === "Đã duyệt"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-mist/10 text-mist border border-mist/20"
                }`}
              >
                {o.status}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {o.items.map((t) => (
                <div
                  key={t.id}
                  className="glass-soft rounded-2xl p-3 flex gap-3"
                >
                  <img
                    src={t.cover}
                    alt="Cover"
                    className="h-20 w-20 rounded-xl object-cover"
                  />

                  <div className="flex-1 min-w-0 flex flex-col">
                    <p className="font-display text-canvas truncate">
                      {t.title}
                    </p>

                    <p className="text-mist/60 text-xs">{t.artist}</p>

                    {o.status === "Đã duyệt" ? (
                      <div className="mt-auto pt-2 flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={downloading === `track-${t.id}`}
                          onClick={() => handleDownloadTrack(t)}
                        >
                          {downloading === `track-${t.id}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          Tải nhạc
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDownloadLicense(o, t)}
                        >
                          <FileText className="h-3 w-3" />
                          Giấy phép
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-auto text-mist/50 text-xs italic">
                        Chờ duyệt để tải.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

