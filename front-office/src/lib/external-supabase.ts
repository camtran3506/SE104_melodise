import { createClient } from "@supabase/supabase-js";

// External Supabase project (separate from Lovable Cloud)
// Anon key is a public publishable key — safe to expose in client code.
// All data access is protected by Row Level Security policies on the database.
const SUPABASE_URL = "https://jutavnymivxbzajupwwl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dGF2bnltaXZ4YnphanVwd3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjU5NjQsImV4cCI6MjA5NDM0MTk2NH0.WLfn15KJDOh0A5QnjHZ9O7xAeAlKIiqy3auFW-6sLTM";

export const externalSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "melodise-external-auth",
  },
});

// Generic helpers — use these from components/hooks.
// Example:
//   const { data, error } = await externalSupabase.from("tracks").select("*");
//   const { data, error } = await externalSupabase.auth.signInWithPassword({ email, password });
export async function selectFrom<T = unknown>(
  table: string,
  columns = "*",
): Promise<T[]> {
  const { data, error } = await externalSupabase.from(table).select(columns);
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function insertInto<T = unknown>(
  table: string,
  row: Record<string, unknown> | Record<string, unknown>[],
): Promise<T[]> {
  const { data, error } = await externalSupabase.from(table).insert(row).select();
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function updateRow<T = unknown>(
  table: string,
  match: Record<string, unknown>,
  values: Record<string, unknown>,
): Promise<T[]> {
  let q = externalSupabase.from(table).update(values);
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { data, error } = await q.select();
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function deleteRow(
  table: string,
  match: Record<string, unknown>,
): Promise<void> {
  let q = externalSupabase.from(table).delete();
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { error } = await q;
  if (error) throw error;
}
