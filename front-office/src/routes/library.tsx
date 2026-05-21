import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileText, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, formatVND } from "@/lib/store";
import { useTracks } from "@/lib/tracks-api";
import { toast } from "sonner";

export const Route = createFileRoute("/library")({
  component: Library,
  head: () => ({ meta: [{ title: "Tài Nguyên — melodise" }] }),
});

function Library() {
  const orders = useStore((s) => s.orders);
  const { data: tracks = [] } = useTracks();

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-6 py-24 grid place-items-center">
        <div className="glass rounded-3xl p-12 text-center max-w-md">
          <div className="h-20 w-20 mx-auto rounded-full glass-soft grid place-items-center mb-5">
            <FolderOpen className="h-9 w-9 text-gold" />
          </div>
          <h2 className="font-display text-3xl text-canvas">Thư viện trống</h2>
          <p className="text-mist/80 mt-3 text-sm">Bạn chưa có đơn hàng nào.</p>
          <Button asChild size="lg" className="mt-7"><Link to="/">Khám phá nhạc</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl text-canvas">Tài Nguyên của bạn</h1>
      <p className="text-mist/70 text-sm mt-2">Tất cả nhạc bản quyền và giấy phép trong các đơn hàng của bạn.</p>

      <div className="mt-10 space-y-8">
        {orders.slice().reverse().map((o) => {
          const items = o.trackIds.map((id) => tracks.find((t) => t.id === id)!).filter(Boolean);
          return (
            <div key={o.id} className="glass rounded-3xl p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <p className="font-display text-canvas">Đơn {o.id}</p>
                  <p className="text-mist/60 text-xs mt-1">{new Date(o.createdAt).toLocaleString("vi-VN")} · {formatVND(o.total)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${o.status === "approved" ? "bg-gold/20 text-gold border border-gold/40" : "bg-mist/10 text-mist border border-mist/20"}`}>
                  {o.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((t) => (
                  <div key={t.id} className="glass-soft rounded-2xl p-3 flex gap-3">
                    <img src={t.cover} alt="" className="h-20 w-20 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <p className="font-display text-canvas truncate">{t.title}</p>
                      <p className="text-mist/60 text-xs">{t.artist}</p>
                      {o.status === "approved" ? (
                        <div className="mt-auto pt-2 flex flex-col gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => toast.success("Đang tải nhạc…")}><Download className="h-3 w-3" /> Tải nhạc</Button>
                          <Button size="sm" variant="secondary" onClick={() => toast.success("Đang tải giấy phép…")}><FileText className="h-3 w-3" /> Giấy phép</Button>
                        </div>
                      ) : (
                        <p className="mt-auto text-mist/50 text-xs italic">Tải xuống mở khi duyệt xong.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
