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

type Track = {
  id: string;
  title: string;
  artist: string;
  artistId: number | null; // Thêm ID tác giả
  category: string;
  categoryIds: number[]; // Thêm mảng ID danh mục
  duration: string; 
  price: number;
  preview: string; 
  original: string; 
  cover?: string;
};
type Category = { id: string; name: string; description: string };
type Artist = { id: number; name: string };

const fmt = (n: number) => n.toLocaleString("vi-VN") + "₫";

function MusicPage() {
  const [tab, setTab] = useState<"tracks" | "categories">("tracks");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [tRes, aRes, cRes, tcRes] = await Promise.all([
        melodiseDb.from("tracks").select("*").order("track_id"),
        melodiseDb.from("artists").select("*").order("name"),
        melodiseDb.from("categories").select("*").order("category_id"),
        melodiseDb.from("track_categories").select("*"),
      ]);
      
      if (tRes.error || aRes.error || cRes.error || tcRes.error) {
        toast.error("Không tải được dữ liệu từ Supabase");
        setLoading(false);
        return;
      }

      const fetchedArtists = (aRes.data ?? []).map((a: any) => ({ id: a.artist_id, name: a.name }));
      setArtists(fetchedArtists);
      
      const artistMap = new Map<number, string>(fetchedArtists.map(a => [a.id, a.name]));
      const catMap = new Map<number, string>((cRes.data ?? []).map((c: any) => [c.category_id, c.category]));
      
      const trackCatNamesMap = new Map<number, string[]>();
      const trackCatIdsMap = new Map<number, number[]>();
      
      (tcRes.data ?? []).forEach((tc: any) => {
        if (!trackCatNamesMap.has(tc.track_id)) {
          trackCatNamesMap.set(tc.track_id, []);
          trackCatIdsMap.set(tc.track_id, []);
        }
        trackCatNamesMap.get(tc.track_id)!.push(catMap.get(tc.category_id) ?? "");
        trackCatIdsMap.get(tc.track_id)!.push(tc.category_id);
      });

      setCategories(
        (cRes.data ?? []).map((c: any) => ({
          id: String(c.category_id),
          name: c.category,
          description: c.description ?? "",
        })),
      );

      setTracks(
        (tRes.data ?? []).map((t: any) => ({
          id: String(t.track_id),
          title: t.title,
          artist: t.artist_id ? artistMap.get(t.artist_id) ?? "—" : "—",
          artistId: t.artist_id,
          category: (trackCatNamesMap.get(t.track_id) ?? []).join(", "),
          categoryIds: trackCatIdsMap.get(t.track_id) ?? [],
          duration: t.duration,
          price: t.price,
          // ✅ Đã bỏ hàm split để giữ nguyên đường dẫn chuẩn từ DB
          preview: t.demo_audio_url ?? "",
          original: t.original_audio_url ?? "",
          cover: t.cover_image_url ?? undefined,
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
          artists={artists}
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

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition ${
        active ? "bg-gradient-to-r from-gold to-amber-300 text-primary-foreground shadow-[var(--shadow-gold)]" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

type FilePurpose = "cover" | "demo" | "original";

const uploadFileToSupabase = async (file: File, purpose: FilePurpose): Promise<string> => {
  let bucket = "";
  let folder = "";

  // 1. Phân luồng Bucket và Thư mục chuẩn
  if (purpose === "cover") {
    bucket = "public-media";
    folder = "covers";
  } else if (purpose === "demo") {
    bucket = "public-media";
    folder = "demos";
  } else if (purpose === "original") {
    bucket = "private-vault";
    folder = ""; // Nhạc gốc nằm ở thư mục gốc của private-vault
  }

  // 2. Xử lý tên file: Giữ nguyên tên gốc, thay khoảng trắng thành dấu gạch ngang và thêm timestamp để không bị trùng đè file
  const cleanFileName = file.name.replace(/\s+/g, '-');
  const uniqueName = `${Date.now()}-${cleanFileName}`;

  // 3. Đường dẫn lưu vào Storage (VD: demos/1684...-bensound.mp3)
  const storagePath = folder ? `${folder}/${uniqueName}` : uniqueName;

  // 4. Bắt đầu Upload lên Supabase Storage
  const { error } = await melodiseDb.storage
    .from(bucket)
    .upload(storagePath, file, { cacheControl: '3600', upsert: false });

  if (error) {
    throw new Error(`Không thể tải tệp lên kho ${bucket}: ${error.message}`);
  }

  // 5. 🔥 QUAN TRỌNG NHẤT: Lắp ghép chuỗi để lưu vào Database
  // Format mong muốn: "public-media/demos/ten-file.mp3"
  const dbString = folder 
    ? `${bucket}/${folder}/${uniqueName}` 
    : `${bucket}/${uniqueName}`;

  return dbString; // Trả chuỗi này về để form gán vào payload và lưu xuống DB
};

// Hàm xóa file cũ khỏi Supabase Storage (Phiên bản Thông minh - Quét đa điểm)
const deleteOldFileFromSupabase = async (oldUrl: string, purpose: FilePurpose) => {
  if (!oldUrl || oldUrl.startsWith("http")) return;

  let bucket = purpose === "original" ? "private-vault" : "public-media";
  const fileName = oldUrl.split('/').pop(); 
  if (!fileName) return;

  const parts = oldUrl.split('/');
  if (parts[0] === bucket) parts.shift();
  const currentPath = parts.join('/');

  // Lập mảng quét mọi ngóc ngách
  const pathsToDelete = Array.from(new Set([
    currentPath,
    fileName,
    `demos/${fileName}`,
    `previews/${fileName}`,
    `covers/${fileName}`,
    `originals/${fileName}`
  ])).filter(Boolean);

  const { error } = await melodiseDb.storage.from(bucket).remove(pathsToDelete);
  if (error) console.error(`Lỗi xóa file rác (${purpose}):`, error.message);
};

function TracksTab({
  tracks, setTracks, categories, artists
}: {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  categories: Category[];
  artists: Artist[];
}) {
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Track | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Track | null>(null);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return tracks;
    return tracks.filter((t) => t.title.toLowerCase().includes(k) || t.artist.toLowerCase().includes(k));
  }, [tracks, keyword]);

  const handleSave = async (t: Track) => {
    // Hàm tự động chuẩn hóa đường dẫn, tự động sửa lỗi cho các dữ liệu cũ bị thiếu path
    const formatPath = (path: string | undefined, bucket: string, folder: string) => {
      if (!path) return undefined;
      if (path.startsWith("http")) return path; // Bỏ qua nếu là link ảnh ngoài (URL tuyệt đối)
      if (path.startsWith(bucket)) return path; // Nếu đã có tên bucket ở đầu -> Đã chuẩn, giữ nguyên
      
      // Nếu path bị thiếu đường dẫn (chỉ có tên file), lấy tên file và tự động ghép nối lại
      const fileName = path.split('/').pop(); 
      return folder ? `${bucket}/${folder}/${fileName}` : `${bucket}/${fileName}`;
    };

    // Chuẩn bị payload và dọn dẹp data luôn trước khi lưu
    const dbPayload = {
      title: t.title,
      duration: t.duration,
      price: t.price,
      demo_audio_url: formatPath(t.preview, "public-media", "demos"),
      original_audio_url: formatPath(t.original, "private-vault", ""),
      cover_image_url: formatPath(t.cover, "public-media", "covers"),
      artist_id: t.artistId, 
    };

    let savedTrackId = t.id;

    if (editing) {
      const { error } = await melodiseDb.from("tracks").update(dbPayload).eq("track_id", Number(t.id));
      if (error) { toast.error("Lỗi cập nhật nhạc: " + error.message); return; }

      await melodiseDb.from("track_categories").delete().eq("track_id", Number(t.id));
      
      // Cập nhật lại UI với đường dẫn đã được chuẩn hóa
      const updatedTrack = { 
        ...t, 
        preview: dbPayload.demo_audio_url || "", 
        original: dbPayload.original_audio_url || "", 
        cover: dbPayload.cover_image_url || undefined 
      };
      setTracks((prev) => prev.map((x) => (x.id === t.id ? updatedTrack : x)));
      toast.success("Sửa thành công");
    } else {
      const { data: newTrack, error } = await melodiseDb.from("tracks").insert(dbPayload).select().single();
      if (error) { toast.error("Lỗi thêm nhạc: " + error.message); return; }
      
      savedTrackId = String(newTrack.track_id);
      
      // Cập nhật lại UI với ID thật và đường dẫn chuẩn hóa
      const newTrackData = { 
        ...t, 
        id: savedTrackId,
        preview: dbPayload.demo_audio_url || "", 
        original: dbPayload.original_audio_url || "", 
        cover: dbPayload.cover_image_url || undefined 
      };
      setTracks((prev) => [...prev, newTrackData]);
      toast.success("Thêm nhạc thành công");
    }

    if (t.categoryIds.length > 0) {
      const categoryInserts = t.categoryIds.map(catId => ({
        track_id: Number(savedTrackId),
        category_id: catId
      }));
      await melodiseDb.from("track_categories").insert(categoryInserts);
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
            <div key={t.id} className="glass-card group relative overflow-hidden rounded-2xl p-5 transition hover:-translate-y-1 hover:border-gold/50">
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
                    {t.category || "Chưa phân loại"}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="text-lg font-bold text-gold">{fmt(t.price)}</div>
                {canEditMusic(getCurrentUser()) && (
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(t)} className="rounded-md p-2 text-muted-foreground transition hover:bg-gold/15 hover:text-gold" title="Sửa">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleting(t)} className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive-foreground" title="Xóa">
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
          artists={artists}
          existingIds={tracks.map((t) => t.id)}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSubmit={handleSave}
        />
      )}

      {deleting && (
        <ConfirmDelete
          name={deleting.title}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            // 1. Dọn dẹp sạch file trên Storage trước
            if (deleting.cover) await deleteOldFileFromSupabase(deleting.cover, "cover");
            if (deleting.preview) await deleteOldFileFromSupabase(deleting.preview, "demo");
            if (deleting.original) await deleteOldFileFromSupabase(deleting.original, "original");

            // 2. Xóa dữ liệu DB
            const { error } = await melodiseDb.from("tracks").delete().eq("track_id", deleting.id);
            if (error) { toast.error("Lỗi xóa nhạc: " + error.message); return; }
            setTracks((prev) => prev.filter((x) => x.id !== deleting.id));
            toast.success("Xóa thành công và đã dọn rác lưu trữ");
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}

function TrackForm({
  initial, categories, artists, existingIds, onCancel, onSubmit
}: {
  initial: Track | null;
  categories: Category[];
  artists: Artist[];
  existingIds: string[];
  onCancel: () => void;
  onSubmit: (t: Track) => void;
}) {
  const nextId = String((existingIds.reduce((m, x) => Math.max(m, Number(x) || 0), 0) || 0) + 1);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState<Track>(
    initial ?? {
      id: nextId, title: "", artist: "", artistId: null, category: "", categoryIds: [], duration: "", price: 0, preview: "", original: "",
    },
  );
  const [error, setError] = useState("");

  // Hàm kiểm tra định dạng file ngay khi chọn
  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFileState: React.Dispatch<React.SetStateAction<File | null>>,
    allowedExts: string[],
    errorMsg: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileState(null);
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || "";
    
    // Nếu đuôi file không nằm trong danh sách cho phép
    if (!allowedExts.includes(fileExt)) {
      toast.error(errorMsg); // Hiển thị cảnh báo góc màn hình
      e.target.value = "";   // Xóa file sai khỏi ô input để người dùng chọn lại
      setFileState(null);
    } else {
      setFileState(file);
      setError(""); // Xóa lỗi chung của form (nếu có)
    }
  };

  const submit = async () => {
    // 1. Kiểm tra các trường văn bản cơ bản không được để trống
    if (!form.id?.trim() || !form.title?.trim() || !form.duration?.trim()) {
      setError("Vui lòng nhập đầy đủ Tên bài hát và Thời lượng.");
      return;
    }

    // 1.2. THÊM ĐOẠN NÀY: Kiểm tra Giá bán (phải điền và phải là số dương)
    const priceVal = Number(form.price);
    if (form.price === undefined || form.price === null || String(form.price).trim() === "") {
      setError("Vui lòng nhập Giá bán.");
      return;
    }
    if (isNaN(priceVal) || priceVal <= 0) {
      setError("Giá bán phải là một số dương hợp lệ (lớn hơn 0).");
      return;
    }

    // 1.5. THÊM ĐOẠN NÀY: Kiểm tra định dạng thời lượng mm:ss
    // Giải thích Regex: ^\d{1,2} (Phút có 1 hoặc 2 số) : (Dấu hai chấm) [0-5]\d$ (Giây từ 00 đến 59)
    const durationRegex = /^\d{1,2}:[0-5]\d$/;
    if (!durationRegex.test(form.duration.trim())) {
      setError("Thời lượng không hợp lệ. Vui lòng nhập đúng định dạng phút:giây (ví dụ: 03:24 hoặc 3:24).");
      return;
    }

    // 2. Kiểm tra file đính kèm (Chỉ bắt buộc khi Thêm mới - vì khi Sửa có thể dùng file cũ)
    if (!initial && (!previewFile || !originalFile)) {
      setError("Vui lòng upload đầy đủ Bản nghe thử và Bản nhạc gốc"); 
      return;
    }

    try {
      setIsUploading(true);
      setError("");
      let finalPayload = { ...form };

      // Nếu có chọn ảnh bìa mới
      if (coverFile) {
        // Kiểm tra xem đang ở chế độ Sửa (initial) và có ảnh cũ không -> Gọi lệnh xóa
        if (initial?.cover) await deleteOldFileFromSupabase(initial.cover, "cover");
        // Bắt đầu up file mới
        finalPayload.cover = await uploadFileToSupabase(coverFile, "cover");
      }
      
      // Nếu có chọn nhạc nghe thử mới
      if (previewFile) {
        if (initial?.preview) await deleteOldFileFromSupabase(initial.preview, "demo");
        finalPayload.preview = await uploadFileToSupabase(previewFile, "demo");
      }
      
      // Nếu có chọn file gốc mới
      if (originalFile) {
        if (initial?.original) await deleteOldFileFromSupabase(initial.original, "original");
        finalPayload.original = await uploadFileToSupabase(originalFile, "original");
      }

      await onSubmit(finalPayload);
    } catch (error: any) {
      setError(error.message || "Có lỗi xảy ra khi tải tệp lên kho lưu trữ.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal title={initial ? `Sửa nhạc — ${initial.title}` : "Thêm bài nhạc mới"} onClose={onCancel} size="lg">
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mã bài nhạc">
            <input disabled={!!initial} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} className="input" />
          </Field>
          <Field label="Thời lượng (mm:ss)">
            <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="03:24" className="input" />
          </Field>
        </div>
        
        <Field label="Tên bài hát">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tác giả">
            <select
              value={form.artistId || ""}
              onChange={(e) => {
                const selectedId = Number(e.target.value);
                const selectedArtist = artists.find(a => a.id === selectedId);
                setForm({ ...form, artistId: selectedId, artist: selectedArtist ? selectedArtist.name : "" });
              }}
              className="input"
            >
              <option value="" disabled>-- Chọn tác giả --</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
          
          <Field label="Danh mục (Có thể chọn nhiều)">
            <div className="input flex max-h-32 flex-col gap-2 overflow-y-auto bg-input/40 py-2">
              {categories.map((c) => {
                const isChecked = form.categoryIds.includes(Number(c.id));
                return (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm hover:text-gold">
                    <input
                      type="checkbox"
                      className="accent-gold h-4 w-4 rounded border-border bg-sidebar/50"
                      checked={isChecked}
                      onChange={(e) => {
                        let newIds = [...form.categoryIds];
                        if (e.target.checked) newIds.push(Number(c.id));
                        else newIds = newIds.filter(id => id !== Number(c.id));
                        
                        const newNames = categories.filter(cat => newIds.includes(Number(cat.id))).map(cat => cat.name).join(", ");
                        setForm({ ...form, categoryIds: newIds, category: newNames });
                      }}
                    />
                    {c.name}
                  </label>
                );
              })}
              {categories.length === 0 && <span className="text-muted-foreground text-xs">Chưa có danh mục nào.</span>}
            </div>
          </Field>
        </div>

        <Field label="Giá bán (VNĐ)">
          <input 
            type="number" 
            value={form.price || ""} 
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} 
            className="input [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]" 
          />
        </Field>

        <Field label="Bản nghe thử (.mp3, có Watermark)">
          <input 
            type="file" 
            accept=".mp3,audio/mpeg" 
            onChange={(e) => handleFileSelect(e, setPreviewFile, ['mp3'], "Bản nghe thử chỉ chấp nhận định dạng .mp3")} 
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20" 
          />
          {previewFile ? <p className="mt-1 text-xs text-green-500">Đã chọn tệp mới: {previewFile.name}</p> : form.preview ? <p className="mt-1 truncate text-xs text-muted-foreground">Đang có sẵn: {form.preview.split('/').pop()}</p> : null}
        </Field>

        <Field label="Bản nhạc gốc (.mp3 hoặc .wav)">
          <input 
            type="file" 
            accept=".mp3,.wav,audio/mpeg,audio/wav" 
            onChange={(e) => handleFileSelect(e, setOriginalFile, ['mp3', 'wav'], "Bản nhạc gốc chỉ chấp nhận định dạng .mp3 hoặc .wav")} 
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20" 
          />
          {originalFile ? <p className="mt-1 text-xs text-green-500">Đã chọn tệp mới: {originalFile.name}</p> : form.original ? <p className="mt-1 truncate text-xs text-muted-foreground">Đang có sẵn: {form.original.split('/').pop()}</p> : null}
        </Field>

        <Field label="Ảnh bìa (Tùy chọn - để trống sẽ dùng mặc định)">
          <input 
            type="file" 
            accept=".jpg,.jpeg,.png,image/jpeg,image/png" 
            onChange={(e) => handleFileSelect(e, setCoverFile, ['jpg', 'jpeg', 'png'], "Ảnh bìa chỉ chấp nhận định dạng .jpg, .jpeg, hoặc .png")} 
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20" 
          />
          {/* Phần hiển thị hình ảnh bên dưới giữ nguyên */}
          {coverFile ? <p className="mt-1 text-xs text-green-500">Đã chọn tệp mới: {coverFile.name}</p> : form.cover ? (
            <>
              <p className="mt-1 truncate text-xs text-muted-foreground">Đang có sẵn: {form.cover.split('/').pop()}</p>
              <img 
                src={
                  form.cover.startsWith("http") 
                    ? form.cover 
                    : melodiseDb.storage
                        .from(form.cover.split('/')[0])
                        .getPublicUrl(form.cover.split('/').slice(1).join('/')).data.publicUrl
                } 
                alt="Cover" 
                className="mt-2 h-12 w-12 rounded object-cover" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
              />
            </>
          ) : null}
        </Field>

        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive-foreground">{error}</div>}
        
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30">Hủy bỏ</button>
          <button onClick={submit} disabled={isUploading} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50">
            <Save className="h-4 w-4" /> {isUploading ? "Đang tải tệp lên..." : initial ? "Cập nhật" : "Lưu"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CategoriesTab({
  categories, setCategories, tracks, setTracks
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

  const handleSave = async (data: Category) => {
    const trimmed = data.name.trim();
    if (!trimmed) { toast.error("Yêu cầu nhập đầy đủ thông tin"); return; }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== data.id)) {
      toast.error("Tên danh mục trùng — vui lòng nhập tên khác"); return;
    }

    if (editing) {
      const { error } = await melodiseDb.from("categories").update({ category: data.name, description: data.description }).eq("category_id", data.id);
      if (error) { toast.error("Lỗi cập nhật CSDL: " + error.message); return; }
      
      const oldName = editing.name;
      setCategories((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      setTracks((prev) => prev.map((t) => (t.category === oldName ? { ...t, category: data.name } : t)));
      toast.success("Sửa thành công");
    } else {
      const { data: newCat, error } = await melodiseDb.from("categories").insert({ category: data.name, description: data.description }).select().single();
      if (error) { toast.error("Lỗi thêm CSDL: " + error.message); return; }
      setCategories((prev) => [...prev, { id: String(newCat.category_id), name: newCat.category, description: newCat.description || "" }]);
      toast.success("Thêm thành công");
    }
    setEditing(null);
    setCreating(false);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await melodiseDb.from("categories").delete().eq("category_id", deleting.id);
    if (error) { toast.error("Lỗi xóa CSDL: " + error.message); return; }

    setCategories((prev) => prev.filter((c) => c.id !== deleting.id));
    setTracks((prev) => prev.map((t) => (t.category === deleting.name ? { ...t, category: "" } : t)));
    toast.success("Xoá thành công");
    setDeleting(null);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm danh mục..." className="w-full rounded-lg border border-border bg-input/40 py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-gold focus:outline-none" />
        </div>
        {canEditMusic(getCurrentUser()) && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02]">
            <Plus className="h-4 w-4" /> Thêm mới
          </button>
        )}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Mã</th><th className="px-4 py-3">Tên danh mục</th><th className="px-4 py-3">Mô tả</th><th className="px-4 py-3">Số bài nhạc</th><th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Không tìm thấy dữ liệu</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/40 hover:bg-gold/5">
                  <td className="px-4 py-3 font-mono text-xs text-gold">{c.id}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.description}</td>
                  <td className="px-4 py-3">{tracks.filter((t) => t.categoryIds.includes(Number(c.id))).length}</td>
                  <td className="px-4 py-3">
                    {canEditMusic(getCurrentUser()) && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditing(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-gold/15 hover:text-gold"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => setDeleting(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive-foreground"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(editing || creating) && <CategoryForm initial={editing} existingIds={categories.map((c) => c.id)} onCancel={() => { setEditing(null); setCreating(false); }} onSubmit={handleSave} />}
      {deleting && <ConfirmDelete name={deleting.name} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} extraNote="Các bài nhạc thuộc danh mục này sẽ được gỡ liên kết danh mục." />}
    </>
  );
}

function CategoryForm({ initial, existingIds, onCancel, onSubmit }: { initial: Category | null; existingIds: string[]; onCancel: () => void; onSubmit: (c: Category) => void; }) {
  const nextId = String((existingIds.reduce((m, x) => Math.max(m, Number(x) || 0), 0) || 0) + 1);
  const [form, setForm] = useState<Category>(initial ?? { id: nextId, name: "", description: "" });
  return (
    <Modal title={initial ? "Sửa danh mục" : "Thêm danh mục"} onClose={onCancel}>
      <div className="space-y-3 text-sm">
        <Field label="Mã danh mục"><input disabled={!!initial} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} className="input" /></Field>
        <Field label="Tên danh mục"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></Field>
        <Field label="Mô tả"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30">Hủy bỏ</button>
          <button onClick={() => onSubmit(form)} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02]"><Save className="h-4 w-4" /> {initial ? "Cập nhật" : "Lưu"}</button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmDelete({ name, onCancel, onConfirm, extraNote }: { name: string; onCancel: () => void; onConfirm: () => void; extraNote?: string; }) {
  return (
    <Modal title="Xác nhận xóa?" onClose={onCancel}>
      <p className="text-sm">Bạn có chắc chắn muốn xóa <strong className="text-gold">{name}</strong>?</p>
      {extraNote && <p className="mt-2 text-xs text-muted-foreground">{extraNote}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30">Hủy bỏ</button>
        <button onClick={onConfirm} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90">Xác nhận xóa</button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>{children}</label>;
}