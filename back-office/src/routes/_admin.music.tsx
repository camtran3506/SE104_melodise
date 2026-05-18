import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { Plus, Music2, Edit2, Trash2, Disc3, Search, Save, FolderOpen, Loader2 } from "lucide-react";
import { melodiseDb } from "@/lib/external-supabase";
import { getCurrentUser, hasPermission, canEditMusic } from "@/lib/auth";
import { NoPermission } from "@/components/NoPermission";

export const Route = createFileRoute("/_admin/music")({
  component: MusicGuard,
});

function MusicGuard() {
  if (!hasPermission(getCurrentUser(), "music")) return <NoPermission tab="Quản lý nhạc số" />;
  return <MusicPage />;
}

type TrackStatus = "Đang bán" | "Bản nháp" | "Ngừng bán";
type Track = {
  id: string;
  title: string;
  artist: string;
  category: string;
  duration: string; // mm:ss
  price: number;
  preview: string; // .mp3 only
  original: string; // .mp3 / .wav
  cover?: string;
  status: TrackStatus;
};
type Category = { id: string; name: string; description: string };


const fmt = (n: number) => n.toLocaleString("vi-VN") + "₫";

function MusicPage() {
  const [tab, setTab] = useState<"tracks" | "categories">("tracks");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [tRes, aRes, cRes, tcRes] = await Promise.all([
        melodiseDb.from("tracks").select("*").order("track_id"),
        melodiseDb.from("artists").select("*"),
        melodiseDb.from("categories").select("*").order("category_id"),
        melodiseDb.from("track_categories").select("*"),
      ]);
      if (tRes.error || aRes.error || cRes.error || tcRes.error) {
        toast.error("Không tải được dữ liệu từ Lovable Cloud");
        setLoading(false);
        return;
      }
      const artistMap = new Map<number, string>(
        (aRes.data ?? []).map((a: { artist_id: number; name: string }) => [a.artist_id, a.name]),
      );
      const catMap = new Map<number, string>(
        (cRes.data ?? []).map((c: { category_id: number; category: string }) => [c.category_id, c.category]),
      );
      const trackCatMap = new Map<number, string>();
      (tcRes.data ?? []).forEach((tc: { track_id: number; category_id: number }) => {
        if (!trackCatMap.has(tc.track_id))
          trackCatMap.set(tc.track_id, catMap.get(tc.category_id) ?? "");
      });
      setCategories(
        (cRes.data ?? []).map((c: { category_id: number; category: string; description: string | null }) => ({
          id: `C${String(c.category_id).padStart(2, "0")}`,
          name: c.category,
          description: c.description ?? "",
        })),
      );
      setTracks(
        (tRes.data ?? []).map((t: {
          track_id: number; title: string; duration: string; price: number;
          demo_audio_url: string | null; original_audio_url: string | null;
          cover_image_url: string | null; artist_id: number | null;
        }) => ({
          id: `T${String(t.track_id).padStart(3, "0")}`,
          title: t.title,
          artist: t.artist_id ? artistMap.get(t.artist_id) ?? "—" : "—",
          category: trackCatMap.get(t.track_id) ?? "",
          duration: t.duration,
          price: t.price,
          preview: t.demo_audio_url?.split("/").pop() ?? "",
          original: t.original_audio_url?.split("/").pop() ?? "",
          cover: t.cover_image_url ?? undefined,
          status: "Đang bán" as TrackStatus,
        })),
      );
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Quản lý nhạc số"
        subtitle="Thêm bài hát, cập nhật giá và quản lý danh mục."
      />

      <div className="mb-4 inline-flex rounded-lg border border-border bg-sidebar/40 p-1">
        <TabButton active={tab === "tracks"} onClick={() => setTab("tracks")}>
          <Music2 className="h-4 w-4" /> Nhạc số
        </TabButton>
        <TabButton active={tab === "categories"} onClick={() => setTab("categories")}>
          <FolderOpen className="h-4 w-4" /> Danh mục
        </TabButton>
      </div>

      {tab === "tracks" ? (
        <TracksTab
          tracks={tracks}
          setTracks={setTracks}
          categories={categories}
        />
      ) : (
        <CategoriesTab
          categories={categories}
          setCategories={setCategories}
          tracks={tracks}
          setTracks={setTracks}
        />
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-gradient-to-r from-gold to-amber-300 text-primary-foreground shadow-[var(--shadow-gold)]"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function TracksTab({
  tracks,
  setTracks,
  categories,
}: {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  categories: Category[];
}) {
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Track | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Track | null>(null);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return tracks;
    return tracks.filter(
      (t) => t.title.toLowerCase().includes(k) || t.artist.toLowerCase().includes(k),
    );
  }, [tracks, keyword]);

  const handleSave = (t: Track) => {
    if (editing) {
      setTracks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
      toast.success("Sửa thành công");
    } else {
      setTracks((prev) => [...prev, t]);
      toast.success("Thêm nhạc thành công");
    }
    setEditing(null);
    setCreating(false);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên bài nhạc, tên tác giả..."
            className="w-full rounded-lg border border-border bg-input/40 py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-gold focus:outline-none"
          />
        </div>
        {canEditMusic(getCurrentUser()) && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" /> Thêm mới
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
          Không tìm thấy dữ liệu
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="glass-card group relative overflow-hidden rounded-2xl p-5 transition hover:-translate-y-1 hover:border-gold/50"
            >
              <div className="flex items-start gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold/40 via-accent/40 to-primary/30 ring-2 ring-gold/30">
                  <Disc3 className="h-8 w-8 text-gold animate-spin [animation-duration:8s] group-hover:[animation-duration:2s]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] text-gold/70">{t.id} · {t.duration}</div>
                  <div className="truncate text-lg font-semibold">{t.title}</div>
                  <div className="truncate text-sm text-muted-foreground">{t.artist}</div>
                  <div className="mt-1 inline-block rounded-full bg-accent/30 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                    <Music2 className="mr-1 inline h-2.5 w-2.5" />
                    {t.category}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div>
                  <div className="text-lg font-bold text-gold">{fmt(t.price)}</div>
                  <div
                    className={`mt-0.5 text-[10px] uppercase tracking-wider ${
                      t.status === "Đang bán"
                        ? "text-emerald-300"
                        : t.status === "Bản nháp"
                          ? "text-amber-300"
                          : "text-destructive-foreground"
                    }`}
                  >
                    {t.status}
                  </div>
                </div>
                {canEditMusic(getCurrentUser()) && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditing(t)}
                      className="rounded-md p-2 text-muted-foreground transition hover:bg-gold/15 hover:text-gold"
                      title="Sửa"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(t)}
                      className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive-foreground"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <TrackForm
          initial={editing}
          categories={categories}
          existingIds={tracks.map((t) => t.id)}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSubmit={handleSave}
        />
      )}

      {deleting && (
        <ConfirmDelete
          name={deleting.title}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            setTracks((prev) => prev.filter((x) => x.id !== deleting.id));
            toast.success("Xóa thành công");
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}

function TrackForm({
  initial,
  categories,
  existingIds,
  onCancel,
  onSubmit,
}: {
  initial: Track | null;
  categories: Category[];
  existingIds: string[];
  onCancel: () => void;
  onSubmit: (t: Track) => void;
}) {
  const [form, setForm] = useState<Track>(
    initial ?? {
      id: "T" + String(Math.floor(Math.random() * 900) + 100),
      title: "",
      artist: "",
      category: categories[0]?.name ?? "",
      duration: "",
      price: 0,
      preview: "",
      original: "",
      status: "Bản nháp",
    },
  );
  const [error, setError] = useState("");

  const submit = () => {
    if (
      !form.id.trim() ||
      !form.title.trim() ||
      !form.artist.trim() ||
      !form.category ||
      !form.duration.trim() ||
      !form.preview.trim() ||
      !form.original.trim()
    ) {
      setError("Yêu cầu nhập đầy đủ thông tin");
      return;
    }
    if (!initial && existingIds.includes(form.id)) {
      setError("Mã bài nhạc đã tồn tại");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(form.duration)) {
      setError("Thời lượng phải có định dạng mm:ss");
      return;
    }
    if (form.price <= 0) {
      setError("Giá bán phải lớn hơn 0");
      return;
    }
    if (!/\.mp3$/i.test(form.preview)) {
      setError("Bản nghe thử bắt buộc là file .mp3 (chất lượng thấp hoặc có Watermark)");
      return;
    }
    if (!/\.(mp3|wav)$/i.test(form.original)) {
      setError("Bản nhạc gốc phải có định dạng .mp3 hoặc .wav");
      return;
    }
    const cover = form.cover?.trim() ? form.cover : "default-cover.png";
    onSubmit({ ...form, cover });
  };

  return (
    <Modal
      title={initial ? `Sửa nhạc — ${initial.title}` : "Thêm bài nhạc mới"}
      onClose={onCancel}
      size="lg"
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mã bài nhạc">
            <input
              disabled={!!initial}
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Thời lượng (mm:ss)">
            <input
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              placeholder="03:24"
              className="input"
            />
          </Field>
        </div>
        <Field label="Tên bài hát">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tác giả">
            <input
              value={form.artist}
              onChange={(e) => setForm({ ...form, artist: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Danh mục">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Giá bán (VNĐ)">
            <input
              type="number"
              value={form.price || ""}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="Trạng thái">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TrackStatus })}
              className="input"
            >
              <option>Bản nháp</option>
              <option>Đang bán</option>
              <option>Ngừng bán</option>
            </select>
          </Field>
        </div>
        <Field label="Bản nghe thử (.mp3, có Watermark)">
          <input
            value={form.preview}
            onChange={(e) => setForm({ ...form, preview: e.target.value })}
            placeholder="preview.mp3"
            className="input"
          />
        </Field>
        <Field label="Bản nhạc gốc (.mp3 hoặc .wav)">
          <input
            value={form.original}
            onChange={(e) => setForm({ ...form, original: e.target.value })}
            placeholder="original.wav"
            className="input"
          />
        </Field>
        <Field label="Ảnh bìa (tùy chọn — để trống sẽ dùng mặc định)">
          <input
            value={form.cover ?? ""}
            onChange={(e) => setForm({ ...form, cover: e.target.value })}
            placeholder="cover.png"
            className="input"
          />
        </Field>
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive-foreground">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30"
          >
            Hủy bỏ
          </button>
          <button
            onClick={submit}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02]"
          >
            <Save className="h-4 w-4" /> {initial ? "Cập nhật" : "Lưu"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CategoriesTab({
  categories,
  setCategories,
  tracks,
  setTracks,
}: {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
}) {
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(k));
  }, [categories, keyword]);

  const handleSave = (data: Category) => {
    const trimmed = data.name.trim();
    if (!trimmed) {
      toast.error("Yêu cầu nhập đầy đủ thông tin");
      return;
    }
    const dup = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== data.id,
    );
    if (dup) {
      toast.error("Tên danh mục trùng — vui lòng nhập tên khác");
      return;
    }
    if (editing) {
      const oldName = editing.name;
      setCategories((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      setTracks((prev) =>
        prev.map((t) => (t.category === oldName ? { ...t, category: data.name } : t)),
      );
      toast.success("Sửa thành công");
    } else {
      setCategories((prev) => [...prev, data]);
      toast.success("Thêm thành công");
    }
    setEditing(null);
    setCreating(false);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    setCategories((prev) => prev.filter((c) => c.id !== deleting.id));
    // Ràng buộc: gỡ danh mục khỏi bài nhạc đang dùng
    setTracks((prev) =>
      prev.map((t) => (t.category === deleting.name ? { ...t, category: "" } : t)),
    );
    toast.success("Xoá thành công");
    setDeleting(null);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm danh mục..."
            className="w-full rounded-lg border border-border bg-input/40 py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-gold focus:outline-none"
          />
        </div>
        {canEditMusic(getCurrentUser()) && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" /> Thêm mới
          </button>
        )}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Tên danh mục</th>
              <th className="px-4 py-3">Mô tả</th>
              <th className="px-4 py-3">Số bài nhạc</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Không tìm thấy dữ liệu
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/40 hover:bg-gold/5">
                  <td className="px-4 py-3 font-mono text-xs text-gold">{c.id}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.description}</td>
                  <td className="px-4 py-3">{tracks.filter((t) => t.category === c.name).length}</td>
                  <td className="px-4 py-3">
                    {canEditMusic(getCurrentUser()) && (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditing(c)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-gold/15 hover:text-gold"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <CategoryForm
          initial={editing}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSubmit={handleSave}
        />
      )}

      {deleting && (
        <ConfirmDelete
          name={deleting.name}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
          extraNote="Các bài nhạc thuộc danh mục này sẽ được gỡ liên kết danh mục."
        />
      )}
    </>
  );
}

function CategoryForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: Category | null;
  onCancel: () => void;
  onSubmit: (c: Category) => void;
}) {
  const [form, setForm] = useState<Category>(
    initial ?? { id: "C" + String(Math.floor(Math.random() * 90) + 10), name: "", description: "" },
  );
  return (
    <Modal title={initial ? "Sửa danh mục" : "Thêm danh mục"} onClose={onCancel}>
      <div className="space-y-3 text-sm">
        <Field label="Mã danh mục">
          <input
            disabled={!!initial}
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Tên danh mục">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Mô tả">
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => onSubmit(form)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02]"
          >
            <Save className="h-4 w-4" /> {initial ? "Cập nhật" : "Lưu"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmDelete({
  name,
  onCancel,
  onConfirm,
  extraNote,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
  extraNote?: string;
}) {
  return (
    <Modal title="Xác nhận xóa?" onClose={onCancel}>
      <p className="text-sm">
        Bạn có chắc chắn muốn xóa <strong className="text-gold">{name}</strong>?
      </p>
      {extraNote && <p className="mt-2 text-xs text-muted-foreground">{extraNote}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30"
        >
          Hủy bỏ
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
        >
          Xác nhận xóa
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
