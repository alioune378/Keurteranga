import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client — SERVER ONLY. Bypasses RLS, so it is used exclusively
 * inside server actions / route handlers after validation. The key is read
 * from SUPABASE_SERVICE_ROLE_KEY (never prefixed NEXT_PUBLIC_, never sent to
 * the browser).
 */
let client: SupabaseClient | null = null;

export function isBookingConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getServiceClient(): SupabaseClient | null {
  if (!isBookingConfigured()) return null;
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}
