import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, formatVND } from "@/lib/store";
import { useTracks } from "@/lib/tracks-api";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cart")({
  component: Cart,
  head: () => ({ meta: [{ title: "Giỏ hàng — melodise" }] }),
});

function Cart() {
  const navigate = useNavigate();
  const { data: tracks = [] } = useTracks();
  
  // MỚI: Lấy hàm xóa của Global Store để đồng bộ với thanh Header
  const removeFromCart = useStore((s) => s.removeFromCart);
  
  // Các state quản lý dữ liệu đồng bộ với Database
  const [cartTrackIds, setCartTrackIds] = useState<number[]>([]);
  const [dbUserId, setDbUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPay, setProcessingPay] = useState(false);

  // 1. Tải danh sách bài hát trong giỏ hàng từ Supabase
  async function fetchDbCart() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: dbUser } = await (supabase as any)
        .from("users")
        .select("user_id")
        .eq("auth_id", user.id)
        .single();

      if (dbUser) {
        setDbUserId(dbUser.user_id);
        
        const { data: dbCartItems, error } = await (supabase as any)
          .from("cart_items")
          .select("track_id")
          .eq("user_id", dbUser.user_id);

        if (error) throw error;
        setCartTrackIds((dbCartItems || []).map((item: any) => Number(item.track_id)));
      }
    } catch (error: any) {
      console.error("Lỗi tải giỏ hàng:", error);
      toast.error("Không thể đồng bộ dữ liệu giỏ hàng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDbCart();
  }, []);

  const items = cartTrackIds
    .map((id) => tracks.find((t) => Number(t.id) === id)!)
    .filter(Boolean);

  const total = items.reduce((sum, t) => sum + t.price, 0);

  // 2. Hàm xóa bài hát khỏi giỏ hàng
  async function handleRemove(trackId: number) {
    if (!dbUserId) return;
    try {
      const { error } = await (supabase as any)
        .from("cart_items")
        .delete()
        .eq("user_id", dbUserId)
        .eq("track_id", trackId);

      if (error) throw error;

      // Bước A: Cập nhật lại UI local lập tức (để bài hát biến mất khỏi danh sách)
      setCartTrackIds((prev) => prev.filter((id) => id !== trackId));
      
      // Bước B (MỚI): Xóa khỏi Global Store để icon Header tự động giảm số lượng xuống
      removeFromCart(String(trackId));
      
      toast.success("Đã xóa khỏi giỏ hàng");
    } catch (error: any) {
      toast.error("Xóa sản phẩm thất bại: " + error.message);
    }
  }

  // Hàm tạo mã đơn nháp ngẫu nhiên
  function generateOrderCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'ORD-';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  // Khởi tạo phiên thanh toán (Không gọi Database)
  async function pay() {
    if (!dbUserId || items.length === 0) return;
    
    // Tạo 1 mã ngẫu nhiên để làm Nội dung chuyển khoản
    const shortCode = generateOrderCode(); 
    
    // Tuyệt đối không Insert vào Database ở bước này.
    // Chuyển thẳng sang trang QR và mang theo mã shortCode
    navigate({ to: "/checkout/$id", params: { id: shortCode } });
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-24 flex flex-col items-center justify-center text-mist">
        <Loader2 className="h-8 w-8 animate-spin text-gold mb-4" />
        <p>Đang tải dữ liệu giỏ hàng...</p>
      </div>
    );
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
      <h1 className="font-display text-4xl text-canvas mb-8">
        Giỏ hàng <span className="text-mist/50 text-xl">({items.length})</span>
      </h1>
      
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
              <button 
                onClick={() => handleRemove(Number(t.id))} 
                className="h-10 w-10 grid place-items-center rounded-full text-mist hover:text-destructive hover:bg-destructive/10 transition cursor-pointer" 
                aria-label="Xóa"
              >
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
          <Button 
            onClick={pay} 
            disabled={processingPay} 
            size="lg" 
            className="w-full mt-6"
          >
            {processingPay ? "Đang xử lý..." : "Thanh toán"}
          </Button>
        </aside>
      </div>
    </div>
  );
}