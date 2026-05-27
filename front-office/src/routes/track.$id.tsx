import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Clock, FileText } from "lucide-react"; // Đã bỏ icon Music vì không còn dùng ô Thể loại
import { Button } from "@/components/ui/button";
import { useStore, formatVND } from "@/lib/store";
import { useTrack } from "@/lib/tracks-api";
import { usePlayer } from "@/components/Player";
import { toast } from "sonner";

export const Route = createFileRoute("/track/$id")({
  component: TrackDetail,
});

function TrackDetail() {
  const { id } = Route.useParams();
  const { data: track, isLoading } = useTrack(id);
  const user = useStore((s) => s.user);
  const cart = useStore((s) => s.cart);
  const addToCart = useStore((s) => s.addToCart);
  const play = usePlayer((s) => s.play);

  if (isLoading) return <div className="container mx-auto p-12 text-mist">Đang tải…</div>;
  if (!track) return <div className="container mx-auto p-12 text-canvas">Không tìm thấy bài nhạc.</div>;
  const inCart = cart.some((c) => c.trackId === track.id);

  function add() {
    if (inCart) return;
    addToCart(track!.id);
    toast.success("Đã thêm vào giỏ hàng");
  }

  // MỚI: Xử lý chuỗi danh mục, biến dấu phẩy thành dấu chấm tròn phân cách (·)
  const displayCategory = track.tags && track.tags.length > 0 
    ? track.tags.join(' · ') 
    : (track.genre || "CHƯA PHÂN LOẠI");

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <Link to="/" className="text-mist/70 text-sm hover:text-gold">← Quay lại</Link>
      <div className="grid md:grid-cols-[420px_1fr] gap-10 mt-6">
        <div className="relative">
          <img src={track.cover} alt={track.title} className="w-full aspect-square rounded-3xl object-cover ring-1 ring-gold/30 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]" />
          <Button size="lg" onClick={() => play(track)} className="absolute -bottom-5 left-1/2 -translate-x-1/2 shadow-[0_10px_40px_rgba(242,201,76,0.6)]">
            ► Nghe thử
          </Button>
        </div>
        <div>
          {/* ĐÃ SỬA: Hiển thị danh mục màu vàng ở đây */}
          <p className="text-gold text-xs uppercase tracking-[0.3em]">{displayCategory}</p>
          
          <h1 className="font-display text-5xl text-canvas mt-3 leading-tight">{track.title}</h1>
          <p className="text-mist/80 mt-2 text-lg">bởi <span className="text-canvas">{track.artist}</span></p>

          {/* ĐÃ XÓA KHỐI HIỂN THỊ TAGS (Hashtag) Ở ĐÂY */}

          {/* ĐÃ SỬA: Chỉ giữ lại ô Thời lượng và giới hạn chiều rộng */}
          <div className="mt-8 max-w-[200px]">
            <Stat icon={<Clock className="h-4 w-4" />} label="Thời lượng" value={track.duration} />
          </div>

          <div className="mt-10 glass rounded-3xl p-6 flex items-center justify-between">
            <div>
              <p className="text-mist/70 text-xs uppercase tracking-widest">Giá bản quyền</p>
              <p className="text-gold font-display text-4xl font-bold mt-1">{formatVND(track.price)}</p>
            </div>
            {user ? (
              <Button size="lg" onClick={add} disabled={inCart}>
                <ShoppingBag className="h-4 w-4" /> {inCart ? "Đã trong giỏ" : "Thêm vào giỏ"}
              </Button>
            ) : (
              <Button size="lg" asChild><Link to="/auth">Đăng nhập để mua</Link></Button>
            )}
          </div>
        </div>
      </div>

      <section className="mt-12 glass rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gold/15 text-gold grid place-items-center ring-1 ring-gold/30">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl text-canvas">Mô tả</h2>
          </div>
        </div>
        {track.description ? (
          <p className="text-mist/80 mt-4 leading-relaxed whitespace-pre-line">
            {track.description}
          </p>
        ) : (
          <p className="text-mist/50 mt-4 italic">Chưa có thông tin mô tả cho bài nhạc này.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-soft rounded-2xl p-4">
      <div className="flex items-center gap-2 text-gold">{icon}<span className="text-[10px] uppercase tracking-widest text-mist/70">{label}</span></div>
      <p className="text-canvas font-display text-lg mt-1">{value}</p>
    </div>
  );
}