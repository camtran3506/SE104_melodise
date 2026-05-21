import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { SearchX, X } from "lucide-react";
import { useMemo } from "react";
import { MusicCard } from "@/components/MusicCard";
import { Button } from "@/components/ui/button";
import { useTracks } from "@/lib/tracks-api";
import { useStore } from "@/lib/store";

type SearchParams = { q?: string; cats?: string };

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: (s.q as string) ?? "",
    cats: (s.cats as string) ?? "",
  }),
  beforeLoad: () => {
    // Precondition: user must be logged in
    if (typeof window !== "undefined" && !useStore.getState().user) {
      throw redirect({ to: "/auth" });
    }
  },
  head: () => ({ meta: [{ title: "Tìm kiếm — melodise" }] }),
});

function SearchPage() {
  const { q, cats } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: tracks = [] } = useTracks();

  const selectedCats: string[] = (cats ?? "").split(",").filter(Boolean);
  const query = (q ?? "").trim().toLowerCase();

  const results = useMemo(() => {
    return tracks.filter((t) => {
      if (query) {
        const haystack = `${t.title} ${t.artist} ${t.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      // Combination of categories — track must include ALL selected categories
      if (selectedCats.length && !selectedCats.every((c) => t.tags.includes(c))) return false;
      return true;
    });
  }, [query, cats, tracks]);

  const tags = [
    q && { k: "q", v: `"${q}"` },
    ...selectedCats.map((v) => ({ k: `cat:${v}`, v })),
  ].filter(Boolean) as { k: string; v: string }[];

  function clearTag(k: string) {
    if (k === "q") return navigate({ search: (prev: any) => ({ ...prev, q: "" }) });
    const value = k.slice("cat:".length);
    const next = selectedCats.filter((v) => v !== value).join(",");
    navigate({ search: (prev: any) => ({ ...prev, cats: next }) });
  }
  function clearAll() { navigate({ search: { q: "", cats: "" } as any }); }

  const hasQuery = tags.length > 0;

  return (
    <div className="container mx-auto max-w-7xl px-6 py-10">
      {hasQuery && <h1 className="font-display text-4xl text-canvas">Kết quả tìm kiếm</h1>}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-5">
          {tags.map((t) => (
            <span key={t.k} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-soft border border-gold/30 text-canvas text-xs">
              {t.v}
              <button onClick={() => clearTag(t.k)} className="text-gold hover:text-canvas cursor-pointer"><X className="h-3 w-3" /></button>
            </span>
          ))}
          <Button variant="secondary" size="sm" onClick={clearAll}>Xóa bộ lọc</Button>
        </div>
      )}

      {results.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-10">
          {results.map((t) => <MusicCard key={t.id} track={t} />)}
        </div>
      ) : (
        <div className="grid place-items-center py-24">
          <div className="glass rounded-3xl p-12 text-center max-w-md">
            <div className="h-20 w-20 mx-auto rounded-full glass-soft grid place-items-center mb-5">
              <SearchX className="h-9 w-9 text-gold" />
            </div>
            <h2 className="font-display text-3xl text-canvas">Không tìm thấy</h2>
            <p className="text-mist/80 mt-3 text-sm">Hãy thử lại với từ khóa hoặc bộ lọc khác.</p>
            <Button asChild size="lg" className="mt-7"><Link to="/">Khám phá nhạc</Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}
