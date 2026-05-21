import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, FolderOpen, Search, SlidersHorizontal, LogOut, UserCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { useCategories } from "@/lib/tracks-api";

export function Header() {
  const user = useStore((s) => s.user);
  const cart = useStore((s) => s.cart);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();

  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function applyFilters(closeAfter = true) {
    if (closeAfter) setOpen(false);
    navigate({
      to: "/search",
      search: { q, cats: cats.join(",") } as any,
    });
  }
  function clearFilters() { setQ(""); setCats([]); }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    applyFilters(false);
  }

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(0,31,63,0.85)] border-b border-gold/20">
      <div className="container mx-auto max-w-7xl px-6 h-20 flex items-center gap-4">
        <Link to="/" className="font-display text-3xl font-bold text-gold tracking-tight shrink-0">melodise</Link>

        <div className="flex-1 flex justify-center">
          <div ref={ref} className="w-full max-w-2xl relative">
            <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-gold absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm theo tên, nghệ sĩ, tag…"
                  className="pl-11 h-12 rounded-full"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`h-12 px-4 rounded-full border flex items-center gap-2 text-sm transition cursor-pointer ${open ? "bg-gold text-cobalt border-gold" : "border-gold/40 text-gold hover:bg-gold/10"}`}
                aria-label="Bộ lọc"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Bộ lọc</span>
              </button>
            </form>

            {open && (
              <div className="absolute left-0 right-0 top-14 rounded-3xl z-50 bg-[#062a52] border border-gold/40 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] flex flex-col max-h-[70vh]">
                <div className="overflow-y-auto p-6 pb-3">
                  <FilterGroup label="Thể loại" options={categories} values={cats} onToggle={(v) => toggle(cats, setCats, v)} />
                </div>
                <div className="flex gap-3 justify-end px-6 py-4 border-t border-gold/20 bg-[#062a52] rounded-b-3xl">
                  <Button variant="secondary" type="button" onClick={clearFilters}>Bỏ lọc</Button>
                  <Button type="button" onClick={() => applyFilters(true)}>Lọc</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-2 shrink-0">
          {!user ? (
            <Button asChild variant="secondary"><Link to="/auth">Đăng nhập</Link></Button>
          ) : (
            <>
              <Link to="/library" className="relative h-11 w-11 rounded-full border border-gold/40 grid place-items-center text-gold hover:bg-gold/10 transition" aria-label="Tài nguyên">
                <FolderOpen className="h-5 w-5" />
              </Link>
              <Link to="/cart" className="relative h-11 w-11 rounded-full border border-gold/40 grid place-items-center text-gold hover:bg-gold/10 transition" aria-label="Giỏ hàng">
                <ShoppingBag className="h-5 w-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-gold text-cobalt text-[11px] font-bold grid place-items-center">{cart.length}</span>
                )}
              </Link>
              <div ref={userRef} className="relative">
                <button onClick={() => setUserMenu((o) => !o)} className="h-11 w-11 rounded-full bg-gradient-to-br from-gold to-gold-deep text-cobalt grid place-items-center font-bold text-sm cursor-pointer ring-2 ring-gold/30 hover:ring-gold/60 transition">
                  {user.name.charAt(0).toUpperCase()}
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-14 w-56 rounded-2xl p-2 z-50 bg-[#062a52] border border-gold/40 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)]">
                    <Link to="/account" onClick={() => setUserMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gold/10 text-canvas text-sm">
                      <UserCircle2 className="h-4 w-4 text-gold" /> Thông tin tài khoản
                    </Link>
                    <button onClick={() => { logout(); setUserMenu(false); navigate({ to: "/" }); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gold/10 text-canvas text-sm cursor-pointer">
                      <LogOut className="h-4 w-4 text-gold" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function FilterGroup({ label, options, values, onToggle }: { label: string; options: string[]; values: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="text-xs uppercase tracking-widest text-canvas/90 font-semibold mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = values.includes(o);
          return (
            <button key={o} type="button" onClick={() => onToggle(o)} className={`px-4 h-9 rounded-full text-xs border transition cursor-pointer ${active ? "bg-gold text-cobalt border-gold font-semibold" : "border-gold/50 text-canvas hover:border-gold hover:bg-gold/10"}`}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
