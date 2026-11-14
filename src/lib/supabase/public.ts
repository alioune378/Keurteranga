import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

let cached: SupabaseClient | null = null;

/**
 * Cookie-less anon client for public reads and public RPCs
 * (experiences, availability, booking creation).
 * Returns null when Supabase is not configured (preview mode — booking disabled).
 */
export function getPublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return cached;
}
