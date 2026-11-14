import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface BookingFilters {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  session?: string;
}

export interface AdminBookingRow {
  id: string;
  reference: string;
  status: string;
  participants: number;
  language: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string | null;
  special_requests: string | null;
  admin_notes: string | null;
  locale: string;
  created_at: string;
  cancelled_at: string | null;
  session_id: string;
  sessions: { date: string; start_time: string; end_time: string | null } | null;
  experiences: { title: { fr?: string; en?: string } } | null;
}

/** Shared query for the bookings list and the CSV export. */
export async function queryBookings(supabase: SupabaseClient, f: BookingFilters, limit = 500) {
  let query = supabase
    .from('bookings')
    .select(
      `id, reference, status, participants, language, first_name, last_name, email, phone, country,
       special_requests, admin_notes, locale, created_at, cancelled_at, session_id,
       sessions!inner ( date, start_time, end_time ), experiences ( title )`
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  // only letters, digits and a few safe characters — prevents filter injection
  const q = (f.q ?? '').replace(/[^\p{L}\p{N}@.\- ]/gu, '').trim().slice(0, 80);
  if (q) query = query.or(`reference.ilike.%${q}%,email.ilike.%${q}%,last_name.ilike.%${q}%,first_name.ilike.%${q}%,phone.ilike.%${q}%`);
  if (f.status === 'confirmed' || f.status === 'cancelled') query = query.eq('status', f.status);
  if (f.session && /^[0-9a-f-]{36}$/i.test(f.session)) query = query.eq('session_id', f.session);
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) query = query.gte('sessions.date', f.from);
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) query = query.lte('sessions.date', f.to);

  const { data, error } = await query;
  return { rows: (data ?? []) as unknown as AdminBookingRow[], error };
}
