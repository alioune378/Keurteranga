import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabase } from './supabase/server';

/**
 * Server-side authorisation for every admin page and action.
 * Uses the signed-in user's own session (RLS applies as that user) and
 * checks the admin_profiles allow-list.
 */
export async function getAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false, profile: null };

  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('user_id, full_name')
    .eq('user_id', user.id)
    .maybeSingle();

  return { supabase, user, isAdmin: !!profile, profile };
}

export async function requireAdmin() {
  const ctx = await getAdmin();
  if (!ctx.user) redirect('/admin/login');
  if (!ctx.isAdmin) redirect('/admin/login?error=forbidden');
  return ctx as typeof ctx & { user: NonNullable<typeof ctx.user> };
}

/** Builds a redirect URL with a flash message (?ok=… or ?err=…). */
export function flash(path: string, kind: 'ok' | 'err', message: string) {
  const [base, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.delete('ok');
  params.delete('err');
  params.set(kind, message);
  return `${base}?${params.toString()}`;
}

export const ADMIN_ERRORS: Record<string, string> = {
  NOT_ENOUGH_SPOTS: 'Capacité insuffisante sur cette séance.',
  INVALID_PARTICIPANTS: 'Nombre de participants invalide.',
  SESSION_NOT_FOUND: 'Séance introuvable.',
  BOOKING_NOT_FOUND: 'Réservation introuvable.',
  FORBIDDEN: 'Action non autorisée.'
};

export function adminError(message: string) {
  const code = Object.keys(ADMIN_ERRORS).find((c) => message.includes(c));
  if (code) return ADMIN_ERRORS[code];
  if (message.includes('duplicate key')) return 'Cet élément existe déjà (doublon).';
  if (message.includes('violates check constraint')) return 'Une valeur saisie est invalide.';
  return 'Une erreur est survenue : ' + message.slice(0, 160);
}
