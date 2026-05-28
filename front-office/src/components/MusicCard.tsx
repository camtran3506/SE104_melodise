import { Link } from "@tanstack/react-router";
import { ShoppingBag, Play } from "lucide-react";
import { type Track, useStore, formatVND } from "@/lib/store";
import { toast } from "sonner";
import { usePlayer } from "@/components/Player";
import { supabase } from "@/integrations/supabase/client";

export function MusicCard({ track }: { track: Track }) {
  const user = useStore((s) => s.user);
  const cart = useStore((s) => s.cart);
  const addToCart = useStore((s) => s.addToCart);
  
  // MỚI: Chỉ lấy dữ liệu thật từ Database do __root.tsx quét
  const ownedTrackIds = useStore((s) => s.ownedTrackIds || []);
  const pendingTrackIds = useStore((s) => s.pendingTrackIds || []);

  // Ép kiểu String để so sánh an toàn 100%
  const inCart = cart.some((c) => String(c.trackId) === String(track.id));
  const isActuallyOwned = ownedTrackIds.includes(String(track.id));
  const isPending = pendingTrackIds.includes(String(track.id));
  
  const isDisabled = inCart || isActuallyOwned || isPending;
  const play = usePlayer((s) => s.play);

  // Hiển thị chữ trên nút tùy theo trạng thái thật
  let tooltipText = "Thêm vào giỏ";
  if (isActuallyOwned) tooltipText = "Đã sở hữu";
  else if (isPending) tooltipText = "Đang chờ duyệt";
  else if (inCart) tooltipText = "Đã trong giỏ";

  async function add(e: React.MouseEvent) {
    e.preventDefault();
    if (isDisabled) return;
    
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");

    try {
      const { data: dbUser } = await (supabase as any).from("users").select("user_id").eq("auth_id", authData.user.id).single();
      if (!dbUser) throw new Error("Không tìm thấy user");

      // Chốt chặn cuối cùng ở Database (Tránh spam API)
      const { data: userOrders } = await (supabase as any).from("orders").select("order_id").eq("user_id", dbUser.user_id);
      if (userOrders && userOrders.length > 0) {
        const orderIds = userOrders.map((o: any) => o.order_id);
        const { data: trackInOrders } = await (supabase as any)
          .from("order_details")
          .select("order_id")
          .eq("track_id", Number(track.id))
          .in("order_id", orderIds)
          .limit(1);

        if (trackInOrders && trackInOrders.length > 0) {
          return toast.info("Bài hát này đã nằm trong đơn hàng của bạn.");
        }
      }

      const { data: insertedData, error: dbError } = await (supabase as any)
        .from("cart_items")
        .insert({ user_id: dbUser.user_id, track_id: Number(track.id) })
        .select();

      if (dbError) {
        if (dbError.code === "23505") {
          addToCart(String(track.id));
          return toast.info("Bài hát này đã có sẵn trong giỏ hàng");
        }
        throw dbError;
      }

      addToCart(String(track.id));
      toast.success("Đã thêm vào giỏ hàng", { description: track.title });
    } catch (err: any) {
      toast.error("Lỗi: " + (err.message || "Vui lòng thử lại"));
    }
  }

  function preview(e: React.MouseEvent) {
    e.preventDefault();
    play(track);
  }

  return (
    <Link to="/track/$id" params={{ id: String(track.id) }} className="group block">
      <div className="relative overflow-hidden rounded-3xl glass-soft p-3 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(242,201,76,0.4)] hover:border-gold/40">
        <div className="relative aspect-square overflow-hidden rounded-2xl">
          <img src={track.cover} alt={track.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-cobalt/90 via-transparent to-transparent opacity-60" />
          <button onClick={preview} className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition cursor-pointer" aria-label="Nghe thử">
            <span className="h-14 w-14 rounded-full bg-gold text-cobalt grid place-items-center shadow-[0_0_30px_rgba(242,201,76,0.6)]">
              <Play className="h-6 w-6 fill-current ml-0.5" />
            </span>
          </button>
        </div>
        <div className="px-2 pt-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-canvas text-lg font-semibold truncate">{track.title}</h3>
              <p className="text-mist/70 text-xs mt-0.5">{track.artist}</p>
            </div>
            {user && (
              <button
                onClick={add}
                disabled={isDisabled}
                aria-label={tooltipText}
                title={tooltipText}
                className={`h-9 w-9 shrink-0 rounded-full border grid place-items-center transition ${isDisabled ? "border-mist/30 text-mist/50 bg-mist/5 cursor-not-allowed" : "border-gold/50 text-gold hover:bg-gold/10 cursor-pointer"}`}
              >
                <ShoppingBag className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-end mt-3">
            <span className="text-gold font-bold text-sm">{formatVND(track.price)}</span>
          </div>
          
        </div>
      </div>
    </Link>
  );
}