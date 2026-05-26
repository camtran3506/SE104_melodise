import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { 
  Plus, Music2, Edit2, Trash2, Disc3, Search, 
  Save, FolderOpen, Loader2, RefreshCw, AlertTriangle 
} from "lucide-react";
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
  artist: string; // Đã giữ lại artist (string), xóa artistId
  category: string;
  categoryIds: number[];
  duration: string; 
  price: number | string; 
  preview: string; 
  original: string; 
  cover?: string;
  isDeleted: boolean; 
};

type Category = { id: string; name: string; description: string };

const fmt = (n: number) => n.toLocaleString("vi-VN") + "₫";

function MusicPage() {
  const [tab, setTab] = useState<"tracks" | "categories" | "trash">("tracks");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Phân loại mảng nhạc
  const activeTracks = tracks.filter(t => !t.isDeleted);
  const trashedTracks = tracks.filter(t => t.isDeleted);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Đã xóa query bảng 'artists'
      const [tRes, cRes, tcRes] = await Promise.all([
        melodiseDb.from("tracks").select("*").order("track_id"),
        melodiseDb.from("categories").select("*").order("category_id"),
        melodiseDb.from("track_categories").select("*"),
      ]);
      
      if (tRes.error || cRes.error || tcRes.error) {
        toast.error("Không tải được dữ liệu từ Supabase");
        setLoading(false);
        return;
      }

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
          artist: t.artist || "—", // Lấy trực tiếp từ cột artist mới
          category: (trackCatNamesMap.get(t.track_id) ?? []).join(", "),
          categoryIds: trackCatIdsMap.get(t.track_id) ?? [],
          duration: t.duration,
          price: t.price,
          preview: t.demo_audio_url ?? "",
          original: t.original_audio_url ?? "",
          cover: t.cover_image_url ?? undefined,
          isDeleted: t.is_deleted ?? false, 
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
          <Music2 className="h-4 w-4" /> Đang bán ({activeTracks.length})
        </TabButton>
        <TabButton active={tab === "categories"} onClick={() => setTab("categories")}>
          <FolderOpen className="h-4 w-4" /> Danh mục
        </TabButton>
        <TabButton active={tab === "trash"} onClick={() => setTab("trash")}>
          <Trash2 className="h-4 w-4" /> Đã gỡ ({trashedTracks.length})
        </TabButton>
      </div>

      {tab === "tracks" && (
        <TracksTab
          tracks={activeTracks}
          setTracks={setTracks}
          categories={categories}
        />
      )}
      
      {tab === "categories" && (
        <CategoriesTab
          categories={categories}
          setCategories={setCategories}
          tracks={activeTracks} 
          setTracks={setTracks}
        />
      )}

      {tab === "trash" && (
        <TrashTab
          trashedTracks={trashedTracks}
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
        active 
          ? "bg-gradient-to-r from-gold to-amber-300 text-primary-foreground shadow-[var(--shadow-gold)]" 
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------------
// STORAGE FUNCTIONS
// ------------------------------------------------------------------
type FilePurpose = "cover" | "demo" | "original";

const uploadFileToSupabase = async (file: File, purpose: FilePurpose): Promise<string> => {
  let bucket = "";
  let folder = "";

  if (purpose === "cover") { 
    bucket = "public-media"; 
    folder = "covers"; 
  } else if (purpose === "demo") { 
    bucket = "public-media"; 
    folder = "demos"; 
  } else if (purpose === "original") { 
    bucket = "private-vault"; 
    folder = ""; 
  }

  // --- MỚI CẬP NHẬT: LÀM SẠCH TÊN FILE TRIỆT ĐỂ ---
  const cleanFileName = file.name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // 1. Xóa dấu tiếng Việt (á, à, ả -> a)
    .replace(/[^a-zA-Z0-9.-]/g, '-');                 // 2. Thay thế mọi ký tự không phải chữ, số, dấu chấm bằng dấu gạch ngang (-)

  const uniqueName = `${Date.now()}-${cleanFileName}`;
  const storagePath = folder ? `${folder}/${uniqueName}` : uniqueName;

  const { error } = await melodiseDb.storage
    .from(bucket)
    .upload(storagePath, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(`Không thể tải tệp lên kho ${bucket}: ${error.message}`);
  
  return folder ? `${bucket}/${folder}/${uniqueName}` : `${bucket}/${uniqueName}`;
};

const deleteOldFileFromSupabase = async (oldUrl: string, purpose: FilePurpose) => {
  if (!oldUrl || oldUrl.startsWith("http")) return;
  
  const bucket = purpose === "original" ? "private-vault" : "public-media";
  let pathToDelete = oldUrl;
  
  if (pathToDelete.startsWith(`${bucket}/`)) {
    pathToDelete = pathToDelete.substring(bucket.length + 1);
  }
  
  const { error } = await melodiseDb.storage.from(bucket).remove([pathToDelete]);
  if (error) console.error(`Lỗi dọn dẹp file cũ (${purpose}):`, error.message);
};

// ------------------------------------------------------------------
// TAB 1: NHẠC ĐANG BÁN (TracksTab)
// ------------------------------------------------------------------
function TracksTab({
  tracks, setTracks, categories
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
    return tracks.filter((t) => 
      t.title.toLowerCase().includes(k) || 
      t.artist.toLowerCase().includes(k)
    );
  }, [tracks, keyword]);

  const handleSave = async (t: Track) => {
    const formatPath = (path: string | undefined, bucket: string, folder: string) => {
      if (!path) return undefined;
      if (path.startsWith("http")) return path; 
      if (path.startsWith(bucket)) return path; 
      const fileName = path.split('/').pop(); 
      return folder ? `${bucket}/${folder}/${fileName}` : `${bucket}/${fileName}`;
    };

    const dbPayload = {
      title: t.title,
      artist: t.artist, // Truyền trực tiếp chuỗi artist lên DB
      duration: t.duration,
      price: t.price,
      demo_audio_url: formatPath(t.preview, "public-media", "demos"),
      original_audio_url: formatPath(t.original, "private-vault", ""),
      cover_image_url: formatPath(t.cover, "public-media", "covers"),
    };

    let savedTrackId = t.id;

    if (editing) {
      const { error } = await melodiseDb
        .from("tracks")
        .update(dbPayload)
        .eq("track_id", Number(t.id));
        
      if (error) { 
        toast.error("Lỗi cập nhật nhạc: " + error.message); 
        return; 
      }

      await melodiseDb.from("track_categories").delete().eq("track_id", Number(t.id));
      
      const updatedTrack = { 
        ...t, 
        preview: dbPayload.demo_audio_url || "", 
        original: dbPayload.original_audio_url || "", 
        cover: dbPayload.cover_image_url || undefined,
        isDeleted: false
      };
      
      setTracks((prev) => prev.map((x) => (x.id === t.id ? updatedTrack : x)));
      toast.success("Sửa thành công");
    } else {
      const { data: newTrack, error } = await melodiseDb
        .from("tracks")
        .insert(dbPayload)
        .select()
        .single();
        
      if (error) { 
        toast.error("Lỗi thêm nhạc: " + error.message); 
        return; 
      }
      
      savedTrackId = String(newTrack.track_id);
      
      const newTrackData = { 
        ...t, 
        id: savedTrackId,
        preview: dbPayload.demo_audio_url || "", 
        original: dbPayload.original_audio_url || "", 
        cover: dbPayload.cover_image_url || undefined,
        isDeleted: false
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
            placeholder="Tìm bài nhạc đang bán..."
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
          Không tìm thấy bài nhạc nào đang bán
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
                <div className="text-lg font-bold text-gold">{fmt(Number(t.price))}</div>
                
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
                      title="Gỡ bài hát"
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
          onCancel={() => { setEditing(null); setCreating(false); }} 
          onSubmit={handleSave}
        />
      )}

      {deleting && (
        <ConfirmAction
          title="Xác nhận gỡ nhạc?"
          message={
            <>
              Bạn có chắc chắn muốn gỡ bài <strong className="text-gold">{deleting.title}</strong> khỏi cửa hàng không?
            </>
          }
          extraNote="Khách hàng mới sẽ không thể mua, nhưng khách đã mua vẫn có thể tải về. (Có thể khôi phục lại trong Thùng rác)"
          confirmText="Xác nhận gỡ"
          confirmStyle="destructive"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            const { error } = await melodiseDb
              .from("tracks")
              .update({ is_deleted: true })
              .eq("track_id", Number(deleting.id));
              
            if (error) { 
              toast.error("Lỗi xóa nhạc: " + error.message); 
              return; 
            }
            
            setTracks((prev) => prev.map((x) => 
              x.id === deleting.id ? { ...x, isDeleted: true } : x
            ));
            
            toast.success("Đã gỡ bài nhạc khỏi cửa hàng");
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}

// ------------------------------------------------------------------
// TAB 2: THÙNG RÁC (TrashTab)
// ------------------------------------------------------------------
function TrashTab({
  trashedTracks, setTracks
}: {
  trashedTracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
}) {
  return (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-sidebar/30 p-3 rounded-lg border border-border">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>
            Đây là những bài nhạc đã được gỡ khỏi cửa hàng (Không thể khôi phục). Người dùng mới không thể nhìn thấy và mua chúng nữa.
          </span>
        </div>
      </div>

      {trashedTracks.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
          Thùng rác trống
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trashedTracks.map((t) => (
            <div key={t.id} className="glass-card group relative overflow-hidden rounded-2xl p-5 border-destructive/20 opacity-75 transition hover:opacity-100">
              <div className="flex items-start gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sidebar/50 ring-2 ring-border">
                  <Music2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-semibold line-through text-muted-foreground">
                    {t.title}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">{t.artist}</div>
                  <div className="mt-1 text-xs text-destructive/80 font-medium">
                    Đã gỡ khỏi cửa hàng
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="text-sm font-bold text-muted-foreground">
                  {fmt(Number(t.price))}
                </div>
                {/* Đã gỡ bỏ nút Khôi phục ở đây */}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------
// CÁC COMPONENT FORM & MODAL DÙNG CHUNG
// ------------------------------------------------------------------
function TrackForm({
  initial, categories, existingIds, onCancel, onSubmit
}: {
  initial: Track | null; 
  categories: Category[]; 
  existingIds: string[];
  onCancel: () => void; 
  onSubmit: (t: Track) => void;
}) {
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<Track>(
    initial ?? {
      id: "", 
      title: "", 
      artist: "", 
      category: "", 
      categoryIds: [], 
      duration: "", 
      price: "", 
      preview: "", 
      original: "", 
      isDeleted: false
    }
  );

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
    
    if (!allowedExts.includes(fileExt)) { 
      toast.error(errorMsg); 
      e.target.value = ""; 
      setFileState(null); 
    } else { 
      setFileState(file); 
      setError(""); 
    }
  };

  // MỚI: Hàm xử lý riêng cho Bản nhạc gốc để đọc thời lượng tự động
  const handleOriginalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setOriginalFile(null);
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || "";

    if (!['mp3', 'wav'].includes(fileExt)) {
      toast.error("Chỉ chấp nhận định dạng .mp3 hoặc .wav");
      e.target.value = "";
      setOriginalFile(null);
    } else {
      setOriginalFile(file);
      setError("");

      // Xử lý đọc thời lượng bằng HTML5 Audio API
      const dur = await new Promise<string>((resolve) => {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(url); // Giải phóng bộ nhớ ngay lập tức
          const m = Math.floor(audio.duration / 60);
          const s = Math.floor(audio.duration % 60);
          resolve(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve("");
        };
      });

      if (dur) {
        setForm(prev => ({ ...prev, duration: dur }));
      } else {
        toast.error("Không thể đọc được thông số thời lượng từ tệp này.");
      }
    }
  };

  const submit = async () => {
    // 1. KIỂM TRA ĐIỀN THIẾU THÔNG TIN BẮT BUỘC
    const isPriceEmpty = form.price === undefined || form.price === null || String(form.price).trim() === "";
    const isMissingFiles = !initial && (!previewFile || !originalFile);

    if (
      !form.title?.trim() || 
      !form.artist?.trim() || 
      isPriceEmpty || 
      isMissingFiles
    ) { 
      setError("Vui lòng nhập đầy đủ thông tin."); 
      return; 
    }

    if (!form.duration?.trim()) {
      setError("Chưa lấy được thời lượng. Vui lòng tải lại bản nhạc gốc hợp lệ.");
      return;
    }
    
    // 2. KIỂM TRA TÍNH HỢP LỆ CỦA DỮ LIỆU ĐÃ NHẬP
    const priceVal = Number(form.price);
    if (isNaN(priceVal) || priceVal <= 0 || !Number.isInteger(priceVal)) { 
      setError("Giá bán phải là số nguyên dương hợp lệ (không chấp nhận số thập phân)."); 
      return; 
    }

    // 3. XỬ LÝ UPLOAD VÀ LƯU VÀO CSDL
    try {
      setIsUploading(true); 
      setError(""); 
      
      let finalPayload = { ...form };
      
      if (coverFile) { 
        if (initial?.cover) await deleteOldFileFromSupabase(initial.cover, "cover"); 
        finalPayload.cover = await uploadFileToSupabase(coverFile, "cover"); 
      }
      
      if (previewFile) { 
        if (initial?.preview) await deleteOldFileFromSupabase(initial.preview, "demo"); 
        finalPayload.preview = await uploadFileToSupabase(previewFile, "demo"); 
      }
      
      if (originalFile) { 
        if (initial?.original) await deleteOldFileFromSupabase(initial.original, "original"); 
        finalPayload.original = await uploadFileToSupabase(originalFile, "original"); 
      }
      
      await onSubmit(finalPayload);
    } catch (error: any) {
      setError(error.message || "Có lỗi xảy ra khi tải tệp.");
    } finally { 
      setIsUploading(false); 
    }
  };

  return (
    <Modal 
      title={initial ? `Sửa nhạc — ${initial.title}` : "Thêm bài nhạc mới"} 
      onClose={onCancel} 
      size="lg"
    >
      <div className="space-y-3 text-sm">
        
        {initial && (
          <Field label="Mã bài nhạc (Track ID)">
            <input 
              disabled={true} 
              value={form.id} 
              className="input w-full bg-input/20 cursor-not-allowed opacity-70" 
            />
          </Field>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Tên bài hát">
              <input 
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })} 
                className="input w-full" 
              />
            </Field>
          </div>
          <div className="col-span-1">
            {/* ĐÃ SỬA: Đổi thời lượng sang chỉ đọc, hiển thị tự động dựa trên file gốc */}
            <Field label="Thời lượng (Tự động)">
              <input 
                disabled={true}
                value={form.duration} 
                placeholder="00:00" 
                className="input w-full bg-input/20 cursor-not-allowed opacity-70" 
              />
            </Field>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tác giả">
            <input 
              type="text"
              value={form.artist} 
              onChange={(e) => setForm({ ...form, artist: e.target.value })} 
              placeholder="Nhập tên tác giả..."
              className="input w-full"
            />
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
                        
                        setForm({ 
                          ...form, 
                          categoryIds: newIds, 
                          category: categories
                            .filter(cat => newIds.includes(Number(cat.id)))
                            .map(cat => cat.name)
                            .join(", ") 
                        }); 
                      }} 
                    />
                    {c.name}
                  </label>
                );
              })}
            </div>
          </Field>
        </div>
        
        <Field label="Giá bán (VNĐ)">
          <input 
            type="number" 
            value={form.price} 
            onChange={(e) => setForm({ 
              ...form, 
              price: e.target.value === "" ? "" : Number(e.target.value) 
            })} 
            className="input w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]" 
            step="1"
          />
        </Field>
        
        <Field label="Bản nghe thử (.mp3)">
          <input 
            type="file" 
            accept=".mp3,audio/mpeg" 
            onChange={(e) => handleFileSelect(e, setPreviewFile, ['mp3'], "Chỉ chấp nhận định dạng .mp3")} 
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20" 
          />
          {previewFile ? (
            <p className="mt-1 text-xs text-green-500">
              Đã chọn tệp mới: {previewFile.name}
            </p>
          ) : form.preview ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Đang có sẵn: {form.preview.split('/').pop()}
            </p>
          ) : null}
        </Field>
        
        <Field label="Bản nhạc gốc (.mp3 hoặc .wav)">
          <input 
            type="file" 
            accept=".mp3,.wav,audio/mpeg,audio/wav" 
            // ĐÃ ĐỔI TỪ handleFileSelect SANG handleOriginalFileSelect ĐỂ CHẠY HÀM ĐỌC THỜI LƯỢNG
            onChange={handleOriginalFileSelect} 
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20" 
          />
          {originalFile ? (
            <p className="mt-1 text-xs text-green-500">
              Đã chọn tệp mới: {originalFile.name}
            </p>
          ) : form.original ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Đang có sẵn: {form.original.split('/').pop()}
            </p>
          ) : null}
        </Field>
        
        <Field label="Ảnh bìa (Tùy chọn - để trống sẽ dùng mặc định)">
          <input 
            type="file" 
            accept=".jpg,.jpeg,.png,image/jpeg,image/png" 
            onChange={(e) => handleFileSelect(e, setCoverFile, ['jpg', 'jpeg', 'png'], "Chỉ chấp nhận định dạng .jpg, .jpeg, hoặc .png")} 
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20" 
          />
          {coverFile ? (
            <p className="mt-1 text-xs text-green-500">
              Đã chọn tệp mới: {coverFile.name}
            </p>
          ) : form.cover ? (
             <>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Đang có sẵn: {form.cover.split('/').pop()}
              </p>
              <img 
                src={
                  form.cover.startsWith("http") 
                    ? form.cover 
                    : melodiseDb.storage
                        .from(form.cover.split('/')[0])
                        .getPublicUrl(form.cover.split('/').slice(1).join('/'))
                        .data.publicUrl
                } 
                alt="Cover" 
                className="mt-2 h-12 w-12 rounded object-cover" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
              />
            </>
          ) : null}
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
            disabled={isUploading} 
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-amber-300 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> 
            {isUploading ? "Đang tải tệp lên..." : initial ? "Cập nhật" : "Lưu"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmAction({ 
  title, message, extraNote, confirmText, confirmStyle = "destructive", onCancel, onConfirm 
}: { 
  title: string; 
  message: React.ReactNode; 
  extraNote?: string; 
  confirmText: string; 
  confirmStyle?: "destructive" | "success"; 
  onCancel: () => void; 
  onConfirm: () => void; 
}) {
  const btnClass = confirmStyle === "destructive" 
    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
    : "bg-green-600 text-white hover:bg-green-700";

  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm">{message}</p>
      
      {extraNote && (
        <p className="mt-2 text-xs text-muted-foreground">{extraNote}</p>
      )}
      
      <div className="mt-4 flex justify-end gap-2">
        <button 
          onClick={onCancel} 
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/30"
        >
          Hủy bỏ
        </button>
        
        <button 
          onClick={onConfirm} 
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${btnClass}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------
// TAB 3: DANH MỤC (CategoriesTab)
// ------------------------------------------------------------------
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
    if (!trimmed) { 
      toast.error("Yêu cầu nhập đầy đủ thông tin"); 
      return; 
    }
    
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== data.id)) { 
      toast.error("Tên danh mục trùng — vui lòng nhập tên khác"); 
      return; 
    }
    
    if (editing) {
      const { error } = await melodiseDb
        .from("categories")
        .update({ category: data.name, description: data.description })
        .eq("category_id", data.id);
        
      if (error) { 
        toast.error("Lỗi cập nhật CSDL: " + error.message); 
        return; 
      }
      
      const oldName = editing.name; 
      setCategories((prev) => prev.map((c) => (c.id === data.id ? data : c))); 
      setTracks((prev) => prev.map((t) => (t.category === oldName ? { ...t, category: data.name } : t))); 
      toast.success("Sửa thành công");
    } else {
      const { data: newCat, error } = await melodiseDb
        .from("categories")
        .insert({ category: data.name, description: data.description })
        .select()
        .single();
        
      if (error) { 
        toast.error("Lỗi thêm CSDL: " + error.message); 
        return; 
      }
      
      setCategories((prev) => [
        ...prev, 
        { id: String(newCat.category_id), name: newCat.category, description: newCat.description || "" }
      ]); 
      toast.success("Thêm thành công");
    }
    
    setEditing(null); 
    setCreating(false);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await melodiseDb
      .from("categories")
      .delete()
      .eq("category_id", deleting.id);
      
    if (error) { 
      toast.error("Lỗi xóa CSDL: " + error.message); 
      return; 
    }
    
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
                  <td className="px-4 py-3">
                    {tracks.filter((t) => t.categoryIds.includes(Number(c.id))).length}
                  </td>
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
          existingIds={categories.map((c) => c.id)} 
          onCancel={() => { setEditing(null); setCreating(false); }} 
          onSubmit={handleSave} 
        />
      )}
      
      {deleting && (
        <ConfirmAction 
          title="Xác nhận xóa?" 
          message={
            <>Bạn có chắc chắn muốn xóa <strong className="text-gold">{deleting.name}</strong>?</>
          } 
          extraNote="Các bài nhạc thuộc danh mục này sẽ được gỡ liên kết danh mục." 
          confirmText="Xác nhận xóa" 
          confirmStyle="destructive" 
          onCancel={() => setDeleting(null)} 
          onConfirm={confirmDelete} 
        />
      )}
    </>
  );
}

function CategoryForm({ 
  initial, existingIds, onCancel, onSubmit 
}: { 
  initial: Category | null; 
  existingIds: string[]; 
  onCancel: () => void; 
  onSubmit: (c: Category) => void; 
}) {
  const nextId = String((existingIds.reduce((m, x) => Math.max(m, Number(x) || 0), 0) || 0) + 1); 
  const [form, setForm] = useState<Category>(initial ?? { id: nextId, name: "", description: "" });
  
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
            <Save className="h-4 w-4" /> 
            {initial ? "Cập nhật" : "Lưu"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { 
  return (
    <label className="block">
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  ); 
}