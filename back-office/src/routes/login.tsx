import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles, Mail, Lock, Loader2 } from "lucide-react";
import { StarField } from "@/components/StarField";
import { useEffect, useState, type FormEvent } from "react";
import { signIn, getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getCurrentUser()) navigate({ to: "/" });
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success(`Xin chào ${res.user.full_name}`);
    navigate({ to: "/" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <StarField density={70} />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card animate-fade-in rounded-3xl p-8 shadow-[var(--shadow-velvet)]">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-3 rounded-full bg-gold/15 p-3 ring-2 ring-gold/40 shadow-[0_0_30px_oklch(0.85_0.16_88/0.4)]">
              <Sparkles className="h-7 w-7 text-gold" />
            </div>
            <h1 className="text-gold-shimmer text-3xl font-bold tracking-wide">Melodise</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Admin Panel
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@melodise.vn"
                  className="w-full rounded-lg border border-border bg-input/40 py-2.5 pl-10 pr-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-input/40 py-2.5 pl-10 pr-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive-foreground">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gold via-amber-200 to-gold bg-[length:200%_100%] py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:bg-[position:100%_0] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Đăng nhập
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Sử dụng tài khoản nhân viên đã được cấp trong hệ thống Melodise ✨
          </p>
        </div>
      </div>
    </div>
  );
}
