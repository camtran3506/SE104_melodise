import { Link } from "@tanstack/react-router";
import { ShoppingBag, Play } from "lucide-react";
import { type Track, useStore, formatVND } from "@/lib/store";
import { toast } from "sonner";
import { usePlayer } from "@/components/Player";

export function MusicCard({ track }: { track: Track }) {
  const user = useStore((s) => s.user);
  const cart = useStore((s) => s.cart);
  const orders = useStore((s) => s.orders);
  const addToCart = useStore((s) => s.addToCart);
  const inCart = cart.some((c) => c.trackId === track.id);
  const owned = orders.some((o) => o.trackIds.includes(track.id));
  const play = usePlayer((s) => s.play);

  function add(e: React.MouseEvent) {
    e.preventDefault();
    if (inCart || owned) return;
    addToCart(track.id);
    toast.success("Đã thêm vào giỏ hàng", { description: track.title });
  }

  function preview(e: React.MouseEvent) {
    e.preventDefault();
    play(track);
  }

  return (
    <Link to="/track/$id" params={{ id: track.id }} className="group block">
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
                disabled={owned}
                aria-label={owned ? "Đã sở hữu" : "Thêm vào giỏ"}
                title={owned ? "Đã có trong Tài nguyên" : inCart ? "Đã trong giỏ" : "Thêm vào giỏ"}
                className={`h-9 w-9 shrink-0 rounded-full border grid place-items-center transition ${owned ? "border-mist/30 text-mist/50 bg-mist/5 cursor-not-allowed" : inCart ? "bg-gold text-cobalt border-gold cursor-pointer" : "border-gold/50 text-gold hover:bg-gold/10 cursor-pointer"}`}
              >
                <ShoppingBag className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] uppercase tracking-widest text-mist/50">{track.genre}</span>
            <span className="text-gold font-bold text-sm">{formatVND(track.price)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
