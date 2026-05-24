import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLES } from "@/lib/constants";

export const Route = createFileRoute("/auth")({
  component: Auth,
  head: () => ({ meta: [{ title: "Đăng nhập — melodise" }] }),
});

// Biểu thức chính quy kiểm tra định dạng
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^.{6,}$/; // Ít nhất 6 ký tự

function Auth() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const login = useStore((s) => s.login);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (tab === "register") {
      // 1. Kiểm tra thiếu thông tin (Báo lỗi chung, không tô đỏ)
      if (!name || !phone || !email || !password) {
        return toast.error("Vui lòng nhập đầy đủ thông tin");
      }
      
      // 2. Kiểm tra "Email" đúng định dạng
      if (!EMAIL_REGEX.test(email)) {
        return toast.error("Email sai định dạng");
      }

      // 3. Kiểm tra độ dài mật khẩu
      if (!PASSWORD_REGEX.test(password)) {
        return toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      }

      try {
        // GỌI API ĐĂNG KÝ XỬ LÝ TRÊN BACKEND TẠI ĐÂY
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: name,
              phone: phone,
              role: ROLES.CUSTOMER,
            },
          },
        });

        if (error) {
          if (error.code === "weak_password" || error.message.includes("weak")) {
            return toast.error("Mật khẩu quá phổ biến hoặc dễ đoán. Vui lòng thử lại!");
          }
          if (error.status === 422 || error.message.includes("already registered") || error.code === "user_already_exists") {
            return toast.error("Email đã được sử dụng. Vui lòng dùng email khác!");
          }
          return toast.error("Lỗi đăng ký: " + (error.message || "Vui lòng thử lại sau"));
        }

        if (!data.user?.id) {
          return toast.error("Lỗi đăng ký: Không thể tạo tài khoản");
        }

        const { data: insertData, error: insertError } = await (supabase as any)
          .from("users")
          .insert([
            {
              email: email,
              full_name: name,
              phone_number: phone,
              role: ROLES.CUSTOMER,
              auth_id: data.user.id,
            },
          ])
          .select("user_id")
          .single();

        if (insertError) {
          return toast.error("Có lỗi xảy ra khi tạo tài khoản: " + insertError.message);
        }

        login({
          id: insertData.user_id,
          name: name,
          email: email,
          phone: phone,
          role: ROLES.CUSTOMER,
        });

        toast.success("Tạo tài khoản thành công!");
        navigate({ to: "/" });

      } catch (err) {
        toast.error("Lỗi kết nối đến máy chủ khi đăng ký");
      }

    } else {
      // LOGIC ĐĂNG NHẬP
      // Kiểm tra thiếu thông tin
      if (!email || !password) {
        return toast.error("Vui lòng nhập đầy đủ thông tin");
      }

      try {
        // GỌI API ĐĂNG NHẬP TỪ SUPABASE
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          return toast.error("Email hoặc mật khẩu không chính xác");
        }

        // Lấy thông tin user từ bảng users (dùng auth_id)
        const { data: userData, error: userError } = await (supabase as any)
          .from("users")
          .select("user_id, full_name, phone_number, role, email")
          .eq("auth_id", data.user.id)
          .single();

        if (userError || !userData) {
          return toast.error("Không tìm thấy thông tin tài khoản");
        }

        // Kiểm tra phân quyền: Chặn nếu không phải Khách hàng
        if (userData.role !== ROLES.CUSTOMER) {
          await supabase.auth.signOut();
          return toast.error("Tài khoản này không có quyền truy cập vào trang mua sắm!");
        }

        // Đăng nhập thành công: Cập nhật state với dữ liệu từ DB
        login({
          id: userData.user_id,
          name: userData.full_name || email.split("@")[0],
          email: userData.email || email,
          phone: userData.phone_number || "",
          role: userData.role,
        });

        toast.success("Đăng nhập thành công!");
        navigate({ to: "/" });

      } catch (err) {
        toast.error("Lỗi kết nối đến máy chủ");
      }
    }
  }

  return (
    <div className="container mx-auto px-6 py-16 grid place-items-center">
      <div className="w-full max-w-md glass rounded-3xl p-8 md:p-10">
        <h1 className="font-display text-3xl text-canvas text-center">Chào mừng đến melodise</h1>
        <p className="text-mist/70 text-sm text-center mt-2">Bước vào bầu trời sao của âm nhạc.</p>

        {/* Tab Đăng nhập / Đăng ký */}
        <div className="mt-7 grid grid-cols-2 p-1 rounded-full glass-soft">
          {(["login", "register"] as const).map((t) => (
            <button 
              key={t} 
              onClick={() => setTab(t)} 
              className={`h-10 rounded-full text-sm font-semibold transition cursor-pointer ${tab === t ? "bg-gold text-cobalt shadow-[0_0_20px_rgba(212,175,55,0.45)]" : "text-mist hover:text-canvas"}`}
            >
              {t === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>

        {/* Form Biểu mẫu nhập liệu */}
        <form onSubmit={submit} className="mt-7 space-y-4">
          {tab === "register" && (
            <>
              <Input 
                placeholder="Họ và tên" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
              <Input 
                placeholder="Số điện thoại" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
            </>
          )}
          <Input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
          <Input 
            type="password" 
            placeholder="Mật khẩu" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />

          <Button type="submit" size="lg" className="w-full mt-2">
            {tab === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </Button>

          {/* Dòng sự kiện phụ: Người dùng nhấn nút “Hủy bỏ” */}
          {tab === "register" && (
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full text-mist hover:text-white"
              onClick={() => setTab("login")}
            >
              Hủy bỏ
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}