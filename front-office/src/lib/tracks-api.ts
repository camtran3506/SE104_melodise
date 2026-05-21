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
  artist_id: number;
};
type ArtistRow = { artist_id: number; name: string; bio: string | null };
type CategoryRow = { category_id: number; category: string; description: string | null };
type TrackCategoryRow = { track_id: number; category_id: number };

async function fetchAll(): Promise<Track[]> {
  const [tracksRes, artistsRes, catsRes, tcRes] = await Promise.all([
    externalSupabase
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: false })
      .order("track_id", { ascending: false }),
    externalSupabase.from("artists").select("*"),
    externalSupabase.from("categories").select("*"),
    externalSupabase.from("track_categories").select("*"),
  ]);
  if (tracksRes.error) throw tracksRes.error;
  if (artistsRes.error) throw artistsRes.error;
  if (catsRes.error) throw catsRes.error;
  if (tcRes.error) throw tcRes.error;

  const artists = new Map<number, ArtistRow>(
    (artistsRes.data as ArtistRow[]).map((a) => [a.artist_id, a]),
  );
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

  const result: Track[] = (tracksRes.data as TrackRow[]).map((t) => {
    const tags = tcByTrack.get(t.track_id) ?? [];
    return {
      id: String(t.track_id),
      title: t.title,
      artist: artists.get(t.artist_id)?.name ?? "Unknown",
      artistBio: artists.get(t.artist_id)?.bio ?? "",
      cover: toPublicUrl(t.cover_image_url),
      audio: toPublicUrl(t.demo_audio_url),
      price: Number(t.price) || 0,
      genre: tags[0] ?? "—",
      mood: tags[1] ?? tags[0] ?? "—",
      bpm: 0,
      duration: t.duration ?? "0:00",
      tags,
      description: t.description ?? "",
    };
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
