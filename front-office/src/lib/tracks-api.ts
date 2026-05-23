import { useQuery } from "@tanstack/react-query";
import { externalSupabase } from "@/lib/external-supabase";
import type { Track } from "@/lib/store";
import { setTracksCache } from "@/lib/store";

const STORAGE_BASE =
  "https://jutavnymivxbzajupwwl.supabase.co/storage/v1/object/public/";

function toPublicUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return STORAGE_BASE + path.replace(/^\/+/, "");
}

type TrackRow = {
  track_id: number;
  title: string;
  duration: string | null;
  price: number;
  cover_image_url: string | null;
  demo_audio_url: string | null;
  description: string | null;
  artist: string | null; // Đã đổi từ artist_id thành artist text
  is_deleted: boolean | null; // Thêm trường is_deleted từ Admin
};

type CategoryRow = { category_id: number; category: string; description: string | null };
type TrackCategoryRow = { track_id: number; category_id: number };

async function fetchAll(): Promise<Track[]> {
  // Đã gỡ bỏ query bảng artists
  const [tracksRes, catsRes, tcRes] = await Promise.all([
    externalSupabase
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: false })
      .order("track_id", { ascending: false }),
    externalSupabase.from("categories").select("*"),
    externalSupabase.from("track_categories").select("*"),
  ]);

  if (tracksRes.error) throw tracksRes.error;
  if (catsRes.error) throw catsRes.error;
  if (tcRes.error) throw tcRes.error;

  const cats = new Map<number, CategoryRow>(
    (catsRes.data as CategoryRow[]).map((c) => [c.category_id, c]),
  );
  
  const tcByTrack = new Map<number, string[]>();
  for (const tc of tcRes.data as TrackCategoryRow[]) {
    const name = cats.get(tc.category_id)?.category;
    if (!name) continue;
    const arr = tcByTrack.get(tc.track_id) ?? [];
    arr.push(name);
    tcByTrack.set(tc.track_id, arr);
  }

  // Lọc bỏ những bài hát đã bị xóa mềm (is_deleted === true) ở Admin
  const activeTracks = (tracksRes.data as TrackRow[]).filter((t) => t.is_deleted !== true);

  const result: Track[] = activeTracks.map((t) => {
    const tags = tcByTrack.get(t.track_id) ?? [];
    return {
      id: String(t.track_id),
      title: t.title,
      artist: t.artist || "Unknown", // Lấy trực tiếp chuỗi văn bản
      cover: toPublicUrl(t.cover_image_url),
      audio: toPublicUrl(t.demo_audio_url),
      price: Number(t.price) || 0,
      genre: tags[0] ?? "—",
      mood: tags[1] ?? tags[0] ?? "—",
      bpm: 0,
      duration: t.duration ?? "0:00",
      tags,
      description: t.description ?? "",
    } as Track; 
    // Ép kiểu 'as Track' để đề phòng trong file store.ts 
    // bạn chưa kịp xóa thuộc tính artistBio ra khỏi interface Track
  });

  setTracksCache(result);
  return result;
}

export function useTracks() {
  return useQuery({
    queryKey: ["tracks"],
    queryFn: fetchAll,
    staleTime: 5 * 60_000,
  });
}

export function useTrack(id: string | undefined) {
  const { data, ...rest } = useTracks();
  return { ...rest, data: data?.find((t) => t.id === id) };
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from("categories")
        .select("category")
        .order("category");
      if (error) throw error;
      return (data as { category: string }[]).map((c) => c.category);
    },
    staleTime: 10 * 60_000,
  });
}