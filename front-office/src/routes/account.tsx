import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account")({
  component: Account,
  head: () => ({ meta: [{ title: "Tài khoản — melodise" }] }),
});

function Account() {
  const user = useStore((s) => s.user);
  const update = useStore((s) => s.updateUser);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
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
    if (!user?.id) {
      return toast.error("Lỗi: Không thể xác định người dùng");
    }

    // Cập nhật database
    const { error } = await (supabase as any)
      .from("users")
      .update({
        full_name: name,
        phone_number: phone,
      })
      .eq("user_id", user.id);

    if (error) {
      return toast.error("Có lỗi xảy ra khi lưu thông tin: " + error.message);
    }

    update({ name, phone, email });
    setEdit(false);
    toast.success("Cập nhật thành công");
  }

  function cancel() {
    setName(user!.name); setPhone(user!.phone); setEmail(user!.email); setPw("");
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
              <Button variant="secondary" size="lg" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /> Sửa thông tin</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <LabelGroup label="Họ và tên"><Input value={name} onChange={(e) => setName(e.target.value)} /></LabelGroup>
            <LabelGroup label="Số điện thoại"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></LabelGroup>
            <LabelGroup label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></LabelGroup>
            <LabelGroup label="Mật khẩu mới (tùy chọn)"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Để trống nếu không đổi" /></LabelGroup>
            <div className="pt-3 flex gap-3 justify-center">
              <Button variant="secondary" size="lg" onClick={cancel}>Hủy bỏ</Button>
              <Button size="lg" onClick={save}>Cập nhật</Button>
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
