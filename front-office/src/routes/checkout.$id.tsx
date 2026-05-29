import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useStore, formatVND } from "@/lib/store";
import { useTracks } from "@/lib/tracks-api";
import { toast } from "sonner";
import { QrCode, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout/$id")({
  component: Checkout,
  beforeLoad: () => {
    // Precondition: user must be logged in
    if (typeof window !== "undefined" && !useStore.getState().user) {
      throw redirect({ to: "/auth" });
    }
  },
  head: () => ({ meta: [{ title: "Thanh toán — melodise" }] }),
});

function Checkout() {
  // Lấy mã ngẫu nhiên (ORD-XXXXX) truyền từ trang Cart sang
  const { id: orderCode } = Route.useParams(); 
  
  const { data: tracks = [] } = useTracks();
  const navigate = useNavigate();
  const removeFromCart = useStore((s) => s.removeFromCart);

  // States quản lý dữ liệu giỏ hàng (vì đơn hàng chưa tồn tại)
  const [dbUserId, setDbUserId] = useState<number | null>(null);
  const [cartTrackIds, setCartTrackIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Kéo dữ liệu Giỏ hàng lên để hiện tổng tiền & mã QR
  useEffect(() => {
    async function fetchCartData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate({ to: "/auth" });

        const { data: dbUser } = await (supabase as any)
          .from('users')
          .select('user_id')
          .eq('auth_id', user.id)
          .single();

        if (!dbUser) throw new Error("User not found");
        setDbUserId(dbUser.user_id);

        const { data: cartItems } = await (supabase as any)
          .from('cart_items')
          .select('track_id')
          .eq('user_id', dbUser.user_id);

        if (!cartItems || cartItems.length === 0) {
          toast.info("Phiên thanh toán đã hết hạn hoặc giỏ hàng trống.");
          return navigate({ to: "/cart" });
        }

        setCartTrackIds(cartItems.map((c: any) => Number(c.track_id)));
      } catch (err) {
        console.error("Lỗi tải giỏ hàng:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCartData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-24 flex flex-col items-center justify-center text-mist">
        <Loader2 className="h-8 w-8 animate-spin text-gold mb-4" />
        <p>Đang khởi tạo mã thanh toán...</p>
      </div>
    );
  }

  const items = cartTrackIds.map((tid) => tracks.find((t: any) => Number(t.id) === tid)!).filter(Boolean);
  const totalAmount = items.reduce((sum: number, t: any) => sum + t.price, 0);

  // 2. KHI KHÁCH HÀNG BẤM "XÁC NHẬN" -> MỚI INSERT ĐƠN VÀO DATABASE
  async function confirmed() {
    if (!dbUserId || items.length === 0) return;
    setIsSubmitting(true);
    
    try {
      // BƯỚC A: TẠO ĐƠN HÀNG MỚI (CHỈ TẠO KHI ĐÃ CHUYỂN KHOẢN)
      const { data: newOrder, error: orderErr } = await (supabase as any)
        .from('orders')
        .insert({
          user_id: dbUserId,
          order_code: orderCode, // Dùng chính mã hiển thị ở QR
          status: 'Chờ duyệt'    // TUÂN THỦ 100% DATABASE CỦA BẠN
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // BƯỚC B: TẠO CHI TIẾT BÀI HÁT TRONG ĐƠN (ORDER DETAILS)
      const orderDetailsPayload = items.map((item: any) => ({
        order_id: newOrder.order_id,
        track_id: Number(item.id),
        price: item.price
      }));

      const { error: detailsErr } = await (supabase as any)
        .from('order_details')
        .insert(orderDetailsPayload);

      if (detailsErr) throw detailsErr;

      // BƯỚC C: THANH TOÁN XONG THÌ XÓA SẠCH GIỎ HÀNG
      await (supabase as any).from('cart_items').delete().eq('user_id', dbUserId);
      items.forEach((item: any) => removeFromCart(String(item.id)));

      toast.success("Đã ghi nhận thanh toán", { 
        description: "Đơn hàng đang chờ nhân viên duyệt. Bạn sẽ được tải nhạc sau khi được duyệt." 
      });
      
      navigate({ to: "/library" });

    } catch (error: any) {
      console.error("Lỗi thanh toán:", error);
      toast.error("Có lỗi xảy ra: " + (error.message || "Vui lòng thử lại"));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl text-canvas">Thanh toán</h1>
      <p className="text-mist/70 text-sm mt-1">Đơn hàng <span className="text-gold">{orderCode}</span></p>

      <div className="grid lg:grid-cols-2 gap-8 mt-10">
        {/* Phần Tóm tắt */}
        <div className="glass rounded-3xl p-7 h-fit">
          <h3 className="font-display text-xl text-canvas">Tóm tắt</h3>
          <div className="swirl-divider my-5" />
          <div className="space-y-3">
            {items.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3">
                <img src={t.cover} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-canvas text-sm truncate">{t.title}</p>
                </div>
                <p className="text-gold text-sm font-semibold">{formatVND(t.price)}</p>
              </div>
            ))}
          </div>
          <div className="swirl-divider my-5" />
          <div className="flex justify-between items-baseline">
            <span className="font-display text-canvas">Tổng tiền</span>
            <span className="text-gold font-bold text-3xl font-display">{formatVND(totalAmount)}</span>
          </div>
        </div>

        {/* Phần Quét mã QR */}
        <div className="glass rounded-3xl p-7 text-center h-fit">
          <h3 className="font-display text-xl text-canvas">Quét mã QR</h3>
          <p className="text-mist/70 text-xs mt-2">Sử dụng ứng dụng ngân hàng để quét.</p>
          <div className="mt-6 mx-auto w-64 h-64 rounded-2xl bg-canvas grid place-items-center relative overflow-hidden">
            <QrCode className="h-48 w-48 text-cobalt" strokeWidth={1.2} />
            <div className="absolute inset-2 border-2 border-gold/30 rounded-xl pointer-events-none" />
          </div>
          <p className="text-mist/70 text-xs mt-5">Nội dung CK: <span className="text-gold font-bold">{orderCode}</span></p>
          
          <Button onClick={confirmed} size="lg" className="w-full mt-7" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</> : "Xác nhận đã thanh toán"}
          </Button>
          
          {/* NÚT HỦY BỎ BÂY GIỜ CHỈ LÀ QUAY LẠI, KHÔNG CẦN CHẠY CODE XÓA DATABASE VÌ CÓ TẠO ĐÂU MÀ XÓA! */}
          {!isSubmitting && (
            <Link to="/cart" className="block mt-4 text-mist/80 text-xs hover:text-gold hover:underline transition-colors">
              Hủy bỏ (Quay lại giỏ hàng)
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}