import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, formatVND } from "@/lib/store";
import { useTracks } from "@/lib/tracks-api";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  component: Cart,
  head: () => ({ meta: [{ title: "Giỏ hàng — melodise" }] }),
});

function Cart() {
  const cart = useStore((s) => s.cart);
  const remove = useStore((s) => s.removeFromCart);
  const checkout = useStore((s) => s.checkout);
  const navigate = useNavigate();
  const { data: tracks = [] } = useTracks();

  const items = cart.map((c) => tracks.find((t) => t.id === c.trackId)!).filter(Boolean);
  const total = items.reduce((s, t) => s + t.price, 0);

  function pay() {
    const id = checkout();
    // toast.success("Đơn hàng đã tạo");
    navigate({ to: "/checkout/$id", params: { id } });
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-6 py-24 grid place-items-center">
        <div className="glass rounded-3xl p-12 text-center max-w-md">
          <div className="h-20 w-20 mx-auto rounded-full glass-soft grid place-items-center mb-5">
            <ShoppingBag className="h-9 w-9 text-gold" />
          </div>
          <h2 className="font-display text-3xl text-canvas">Giỏ hàng trống</h2>
          <p className="text-mist/80 mt-3 text-sm">Chưa có sản phẩm nào trong giỏ hàng của bạn.</p>
          <Button asChild size="lg" className="mt-7"><Link to="/">Khám phá nhạc</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl text-canvas mb-8">Giỏ hàng <span className="text-mist/50 text-xl">({items.length})</span></h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} className="glass rounded-2xl p-4 flex items-center gap-4">
              <img src={t.cover} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg text-canvas truncate">{t.title}</p>
                <p className="text-mist/70 text-xs">{t.artist}</p>
                <span className="text-[10px] uppercase tracking-widest text-mist/50">{t.genre}</span>
              </div>
              <p className="text-gold font-bold">{formatVND(t.price)}</p>
              <button onClick={() => remove(t.id)} className="h-10 w-10 grid place-items-center rounded-full text-mist hover:text-destructive hover:bg-destructive/10 transition cursor-pointer" aria-label="Xóa">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <aside className="glass rounded-3xl p-7 sticky top-28">
          <h3 className="font-display text-xl text-canvas">Tóm tắt đơn hàng</h3>
          <div className="swirl-divider my-5" />
          <div className="flex justify-between text-mist text-sm"><span>Tạm tính</span><span>{formatVND(total)}</span></div>
          <div className="flex justify-between text-mist text-sm mt-2"><span>VAT</span><span>Đã bao gồm</span></div>
          <div className="swirl-divider my-5" />
          <div className="flex justify-between items-baseline">
            <span className="text-canvas font-display">Tổng tiền</span>
            <span className="text-gold font-bold text-2xl font-display">{formatVND(total)}</span>
          </div>
          <Button onClick={pay} size="lg" className="w-full mt-6">Thanh toán</Button>
        </aside>
      </div>
    </div>
  );
}
