import { createClient } from "@supabase/supabase-js";

// External Supabase project (Melodise)
const SUPABASE_URL = "https://jutavnymivxbzajupwwl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dGF2bnltaXZ4YnphanVwd3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjU5NjQsImV4cCI6MjA5NDM0MTk2NH0.WLfn15KJDOh0A5QnjHZ9O7xAeAlKIiqy3auFW-6sLTM";

export const melodiseDb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "melodise-admin-auth",
  },
});

export type DbTrack = {
  track_id: number;
  title: string;
  duration: string;
  price: number;
  cover_image_url: string | null;
  demo_audio_url: string | null;
  original_audio_url: string | null;
  description: string | null;
  artist_id: number | null;
};
export type DbArtist = { artist_id: number; name: string; bio: string | null };
export type DbCategory = {
  category_id: number;
  category: string;
  description: string | null;
};
export type DbTrackCategory = { track_id: number; category_id: number };
