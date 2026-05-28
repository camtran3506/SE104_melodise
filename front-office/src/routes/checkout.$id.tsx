import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore, formatVND } from "@/lib/store";
import { useTracks } from "@/lib/tracks-api";
import { toast } from "sonner";
import { QrCode, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // Bắt buộc import Supabase

export const Route = createFileRoute("/checkout/$id")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Thanh toán — melodise" }] }),
});

function Checkout() {
  const { id } = Route.useParams();
  const orders = useStore((s) => s.orders);
  const user = useStore((s) => s.user); // Lấy thông tin user hiện tại từ Store
  
  const { data: tracks = [] } = useTracks();
  const navigate = useNavigate();
  const order = orders.find((o) => o.id === id);

  const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái chống spam click

  if (!order) {
    return (
      <div className="container mx-auto px-6 py-24 text-center">
        <p className="text-canvas">Không tìm thấy đơn hàng.</p>
        <Button asChild className="mt-6"><Link to="/">Về trang chủ</Link></Button>
      </div>
    );
  }

  const items = order.trackIds.map((tid) => tracks.find((t) => t.id === tid)!).filter(Boolean);

  async function confirmed() {
    if (!user?.email) {
      return toast.error("Vui lòng đăng nhập lại để thanh toán!");
    }

    if (!order) return;

    setIsSubmitting(true);

    try {
      // BƯỚC 1: Lấy user_id (kiểu số nguyên) từ bảng public.users
      const { data: userData, error: userError } = await (supabase as any)
        .from('users')
        .select('user_id')
        .eq('email', user.email)
        .single();

      if (userError || !userData) throw new Error("Không xác định được danh tính người dùng.");

      // BƯỚC 2: Lưu vào bảng orders
      // Lưu ý: Cột status là ENUM, bạn phải thay chữ 'Chờ duyệt' cho KHỚP 100% với giá trị trong DB của bạn
      const { data: newOrder, error: orderError } = await (supabase as any)
        .from('orders')
        .insert([
          { 
            user_id: userData.user_id, 
            status: 'Chờ duyệt',
            order_code: order.id
          }
        ])
        .select('order_id')
        .single();

      if (orderError) throw orderError;

      // BƯỚC 3: Lưu vào bảng order_details
      // Tạo một mảng chứa dữ liệu của tất cả bài hát để insert 1 lần duy nhất cho tối ưu
      const detailsToInsert = order.trackIds.map((trackId) => ({
        order_id: newOrder.order_id,
        track_id: trackId
      }));

      const { error: detailsError } = await (supabase as any)
        .from('order_details')
        .insert(detailsToInsert);

      if (detailsError) throw detailsError;

      // THÀNH CÔNG
      toast.success("Đã ghi nhận thanh toán", { 
        description: "Đơn hàng đang chờ nhân viên duyệt. Bạn sẽ được tải nhạc sau khi được duyệt." 
      });
      
      // (Tùy chọn) Gọi hàm xóa giỏ hàng ở đây nếu bạn có logic clearCart trong store

      navigate({ to: "/library" });

    } catch (error: any) {
      console.error("Lỗi thanh toán:", error);
      toast.error("Có lỗi xảy ra khi lưu đơn hàng: " + (error.message || "Vui lòng thử lại"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl text-canvas">Thanh toán</h1>
      <p className="text-mist/70 text-sm mt-1">Đơn hàng <span className="text-gold">{order.id}</span></p>

      <div className="grid lg:grid-cols-2 gap-8 mt-10">
        {/* Phần Tóm tắt đơn hàng giữ nguyên... */}
        <div className="glass rounded-3xl p-7">
          <h3 className="font-display text-xl text-canvas">Tóm tắt đơn hàng</h3>
          <div className="swirl-divider my-5" />
          <div className="space-y-3">
            {items.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <img src={t.cover} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-canvas text-sm truncate">{t.title}</p>
                  <p className="text-mist/60 text-xs">{t.artist}</p>
                </div>
                <p className="text-gold text-sm font-semibold">{formatVND(t.price)}</p>
              </div>
            ))}
          </div>
          <div className="swirl-divider my-5" />
          <div className="flex justify-between items-baseline">
            <span className="font-display text-canvas">Tổng tiền</span>
            <span className="text-gold font-bold text-3xl font-display">{formatVND(order.total)}</span>
          </div>
        </div>

        {/* Phần Quét mã QR */}
        <div className="glass rounded-3xl p-7 text-center">
          <h3 className="font-display text-xl text-canvas">Quét mã QR để thanh toán</h3>
          <p className="text-mist/70 text-xs mt-2">Sử dụng ứng dụng ngân hàng để quét.</p>
          <div className="mt-6 mx-auto w-64 h-64 rounded-2xl bg-canvas grid place-items-center relative overflow-hidden">
            <QrCode className="h-48 w-48 text-cobalt" strokeWidth={1.2} />
            <div className="absolute inset-2 border-2 border-gold/30 rounded-xl pointer-events-none" />
          </div>
          <p className="text-mist/70 text-xs mt-5">Nội dung CK: <span className="text-gold">{order.id}</span></p>
          
          <Button 
            onClick={confirmed} 
            size="lg" 
            className="w-full mt-7"
            disabled={isSubmitting} // Khóa nút khi đang xử lý
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</>
            ) : (
              "Xác nhận đã thanh toán"
            )}
          </Button>
          
          {!isSubmitting && (
            <Link to="/cart" className="block mt-4 text-mist/80 text-xs hover:text-gold hover:underline">Hủy bỏ</Link>
          )}
        </div>
      </div>
    </div>
  );
}