import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileText, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { License } from "@/lib/store";

export const Route = createFileRoute("/library")({
  component: Library,
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

            (supabase as any).from("tracks").select("*").eq("is_deleted", false),

            (supabase as any).from("licenses").select("*"),
          ]);

        if (ordersRes.error) throw ordersRes.error;
        if (detailsRes.error) throw detailsRes.error;
        if (tracksRes.error) throw tracksRes.error;
        if (licensesRes.error) throw licensesRes.error;

        const dbOrders = ordersRes.data || [];
        const dbDetails = detailsRes.data || [];
        const dbTracks = tracksRes.data || [];
        const dbLicenses = licensesRes.data || [];

        const mappedOrders: Order[] = dbOrders.map((o: any) => {

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
                price: Number(t?.price) || 0,
              };
            });

          const orderLicense = dbLicenses.find((l: any) =>
            String(l.order_id ?? "").trim() === String(o.order_id ?? "").trim()
          );

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

  const handleDownloadLicense = (order: Order, track: Track) => {
    const licenseData = order.license;

    if (!licenseData || !licenseData.license_code) {
      toast.error("Không tìm thấy thông tin giấy phép! Hãy kiểm tra xem đơn hàng đã ở trạng thái 'Đã duyệt' chưa.");
      return;
    }

    const licenseText = `============================================================
              GIẤY CHỨNG NHẬN BẢN QUYỀN ÂM NHẠC
                        MELODISE MUSIC
============================================================

MÃ GIẤY PHÉP: ${licenseData.license_code}
MÃ ĐƠN HÀNG:  ${order.id}
NGÀY CẤP:     ${new Date(licenseData.issued_at).toLocaleDateString("vi-VN")}

Tên tác phẩm: ${track.title}
Tác giả:      ${track.artist}
Phạm vi:      ${licenseData.license_scope}
Thời hạn:     ${licenseData.license_term}

Xin cảm ơn bạn đã đồng hành cùng Melodise!
============================================================`;

    const blob = new Blob([licenseText], {
      type: "text/plain;charset=utf-8",
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `License_${licenseData.license_code}.txt`;

    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("Đã tải giấy phép!");
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

