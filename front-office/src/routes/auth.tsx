import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: Auth,
  head: () => ({ meta: [{ title: "Đăng nhập — melodise" }] }),
});

function Auth() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const login = useStore((s) => s.login);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "login") {
      if (!email || !password) return toast.error("Vui lòng nhập đầy đủ thông tin");
      login({ name: email.split("@")[0] || "Bạn", email, phone: "" });
      toast.success("Chào mừng trở lại!");
    } else {
      if (!name || !email || !phone || !password) return toast.error("Vui lòng nhập đầy đủ thông tin");
      login({ name, email, phone });
      toast.success("Tài khoản đã được tạo");
    }
    navigate({ to: "/" });
  }

  return (
    <div className="container mx-auto px-6 py-16 grid place-items-center">
      <div className="w-full max-w-md glass rounded-3xl p-8 md:p-10">
        <h1 className="font-display text-3xl text-canvas text-center">Chào mừng đến melodise</h1>
        <p className="text-mist/70 text-sm text-center mt-2">Bước vào bầu trời sao của âm nhạc.</p>

        <div className="mt-7 grid grid-cols-2 p-1 rounded-full glass-soft">
          {(["login", "register"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`h-10 rounded-full text-sm font-semibold transition cursor-pointer ${tab === t ? "bg-gold text-cobalt shadow-[0_0_20px_rgba(45,212,168,0.45)]" : "text-mist hover:text-canvas"}`}>
              {t === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {tab === "register" && (
            <>
              <Input placeholder="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </>
          )}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} />

          <Button type="submit" size="lg" className="w-full">
            {tab === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </Button>
        </form>
      </div>
    </div>
  );
}
