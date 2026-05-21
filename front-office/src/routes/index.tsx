import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";
import { MusicCard } from "@/components/MusicCard";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useTracks } from "@/lib/tracks-api";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({ meta: [{ title: "melodise — Khám phá nhạc bản quyền cao cấp" }] }),
});

function Index() {
  const user = useStore((s) => s.user);
  const { data: tracks = [], isLoading } = useTracks();
  return (
    <div className="container mx-auto max-w-7xl px-6">
      {!user && (
        <section className="pt-20 pb-16 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-soft text-gold text-xs uppercase tracking-[0.22em] mb-6">
            <Sparkles className="h-3.5 w-3.5 star-twinkle" /> Premium B2B Royalty Music
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-canvas leading-[1.05] max-w-4xl mx-auto tracking-tight">
            Âm nhạc bản quyền <span className="gradient-text">đẳng cấp</span>, <br />
            cấp phép trong vài cú click.
          </h1>
          <p className="text-mist text-lg mt-7 max-w-2xl mx-auto leading-relaxed">
            Thư viện beat & nhạc bản quyền tuyển chọn cho thương hiệu, agency và creator — duyệt nhanh, license minh bạch, chất lượng phòng thu.
          </p>
          <div className="flex items-center justify-center gap-4 mt-9">
            <Button size="lg" asChild><Link to="/search" search={{ q: "" } as any}>Khám phá nhạc <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button variant="secondary" size="lg" asChild><Link to="/auth">Tạo tài khoản</Link></Button>
          </div>
        </section>
      )}

      {!user && <div className="swirl-divider my-12" />}

      <section className={user ? "pt-12" : ""}>
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl text-canvas">Tuyển tập mới</h2>
            <p className="text-mist/70 text-sm mt-1.5">Những bản nhạc được lựa chọn dưới ánh sao hôm nay.</p>
          </div>
          <Link to="/search" search={{ q: "" } as any} className="text-gold text-sm hover:underline hidden md:inline">Xem tất cả →</Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-3xl glass-soft animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tracks.slice(0, 5).map((t) => (
              <MusicCard key={t.id} track={t} />
            ))}
            {tracks.length > 5 && (
              <Link
                to="/search"
                search={{ q: "" } as any}
                className="group flex flex-col items-center justify-center rounded-3xl glass-soft p-3 transition hover:border-gold/40"
              >
                <span className="text-gold text-lg font-semibold">+{tracks.length - 5}</span>
                <span className="text-mist/70 text-sm mt-1">Xem tất cả</span>
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
