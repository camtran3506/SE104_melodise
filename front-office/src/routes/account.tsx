import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account")({
  component: Account,
  head: () => ({ meta: [{ title: "Tài khoản — melodise" }] }),
});

// KHAI BÁO BIỂU THỨC CHÍNH QUY (Đã bỏ Regex của Email vì không cho sửa nữa)
const PHONE_REGEX = /^[0-9]{10}$/;

function Account() {
  const user = useStore((s) => s.user);
  const update = useStore((s) => s.updateUser);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  
  // State lưu mật khẩu
  const [currentPw, setCurrentPw] = useState("");
  const [pw, setPw] = useState("");

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-24 text-center">
        <p className="text-canvas">Bạn chưa đăng nhập.</p>
        <Button asChild className="mt-6"><Link to="/auth">Đăng nhập</Link></Button>
      </div>
    );
  }

  async function save() {
    // 1. KIỂM TRA LỖI BỎ TRỐNG (Chỉ áp dụng cho Họ tên và Số điện thoại)
    if (!name.trim() || !phone.trim()) {
      return toast.error("Vui lòng nhập đầy đủ thông tin");
    }

    // MỚI THÊM: Khẳng định với TypeScript là user luôn tồn tại
    if (!user) return;

    // 2. KIỂM TRA ĐỊNH DẠNG SỐ ĐIỆN THOẠI
    if (!PHONE_REGEX.test(phone.trim())) {
      return toast.error("Số điện thoại không hợp lệ (phải gồm đúng 10 chữ số)");
    }

    // 3. KIỂM TRA LOGIC ĐỔI MẬT KHẨU
    if (pw) {
      if (pw.length < 6) {
        return toast.error("Mật khẩu mới phải có ít nhất 6 kí tự");
      }
      if (!currentPw) {
        return toast.error("Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu");
      }
    }

    setLoading(true);

    try {
      // 4. CẬP NHẬT SUPABASE AUTH (Bảo mật lõi)
      if (pw) {
        const { error: authError } = await supabase.auth.updateUser({
          password: pw,
          current_password: currentPw // Truyền mật khẩu cũ lên để xác thực
        });
        
        if (authError) {
          // Bắt chính xác lỗi nhập sai mật khẩu cũ từ Supabase
          if (
            authError.message.toLowerCase().includes("current password") || 
            authError.message.toLowerCase().includes("invalid credentials") ||
            authError.status === 403 || 
            authError.status === 400
          ) {
            throw new Error("Mật khẩu hiện tại không chính xác");
          }
          throw new Error("Lỗi cập nhật bảo mật: " + authError.message);
        }
      }

      // 5. CHUẨN BỊ DỮ LIỆU ĐỂ CẬP NHẬT BẢNG USERS
      const updateData: any = {
        full_name: name.trim(), 
        phone_number: phone.trim()
      };
      
      // MỚI: Nếu người dùng có nhập mật khẩu mới thì mới đồng bộ xuống trường password trong CSDL
      if (pw) {
        updateData.password = pw;
      }

      // 6. GỌI API CẬP NHẬT BẢNG USERS
      const { error: dbError } = await (supabase as any)
        .from('users')
        .update(updateData)
        .eq('email', user.email); 

      if (dbError) {
        throw new Error("Lỗi cập nhật hồ sơ: " + dbError.message);
      }

      // 7. THÀNH CÔNG: CẬP NHẬT GIAO DIỆN LOCAL STORE
      update({ name: name.trim(), phone: phone.trim(), email: user.email });
      
      // Xóa trắng ô mật khẩu sau khi lưu
      setCurrentPw("");
      setPw(""); 
      setEdit(false);
      
      toast.success("Cập nhật thành công");

    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra khi lưu thông tin");
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    setName(user!.name); 
    setPhone(user!.phone); 
    setCurrentPw(""); 
    setPw("");        
    setEdit(false);
  }

  return (
    <div className="container mx-auto max-w-2xl px-6 py-16">
      <div className="glass rounded-3xl p-10">
        <div className="flex flex-col items-center text-center">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-gold to-gold-deep grid place-items-center text-cobalt font-display text-4xl font-bold ring-4 ring-gold/30 shadow-[0_0_40px_rgba(242,201,76,0.4)]">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="font-display text-3xl text-canvas mt-5">{user.name}</h1>
          <p className="text-mist/70 text-sm">{user.email}</p>
        </div>

        <div className="swirl-divider my-8" />

        {!edit ? (
          <div className="space-y-4">
            <Field label="Họ và tên" value={user.name} />
            <Field label="Số điện thoại" value={user.phone || "—"} />
            <Field label="Email" value={user.email} />
            <Field label="Mật khẩu" value="••••••••••" />
            <div className="pt-3 flex justify-center">
              <Button variant="secondary" size="lg" onClick={() => setEdit(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Sửa thông tin
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <LabelGroup label="Họ và tên">
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </LabelGroup>
            
            <LabelGroup label="Số điện thoại">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
            </LabelGroup>
            
            {/* EMAIL BỊ KHÓA, KHÔNG CHO CHỈNH SỬA */}
            <LabelGroup label="Email (Không được phép thay đổi)">
              <Input 
                type="email" 
                value={user.email} 
                disabled={true} 
                className="opacity-60 cursor-not-allowed bg-black/20" 
              />
            </LabelGroup>
            
            <div className="pt-4 border-t border-gold/10 mt-4">
              <LabelGroup label="Mật khẩu hiện tại (Bắt buộc nếu đổi mật khẩu)">
                <Input 
                  type="password" 
                  value={currentPw} 
                  onChange={(e) => setCurrentPw(e.target.value)} 
                  placeholder="Nhập mật khẩu hiện tại" 
                  disabled={loading} 
                />
              </LabelGroup>
            </div>

            <LabelGroup label="Mật khẩu mới (Tùy chọn)">
              <Input 
                type="password" 
                value={pw} 
                onChange={(e) => setPw(e.target.value)} 
                placeholder="Để trống nếu không đổi" 
                disabled={loading} 
              />
            </LabelGroup>
            
            <div className="pt-3 flex gap-3 justify-center">
              <Button variant="secondary" size="lg" onClick={cancel} disabled={loading}>Hủy bỏ</Button>
              <Button size="lg" onClick={save} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Cập nhật
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gold/10">
      <span className="text-mist/70 text-sm">{label}</span>
      <span className="text-canvas font-medium">{value}</span>
    </div>
  );
}

function LabelGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-mist/70 text-xs uppercase tracking-widest mb-2 block">{label}</span>
      {children}
    </label>
  );
}