'use server';

import { redirect } from 'next/navigation';
import { adminError, flash, requireAdmin } from '@/lib/admin';
import { CODE_RE, normalizeCode } from '@/lib/promo';
import { cleanLine, cleanText, isEmail } from '@/lib/validation';

/**
 * Partner promo codes (influencers, hotels, agencies…). Every action re-checks
 * the administrator; Row Level Security enforces it again in the database.
 */

const str = (fd: FormData, k: string, max = 200) => cleanLine(fd.get(k), max);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const date = (fd: FormData, k: string) => {
  const v = str(fd, k, 10);
  return isDate(v) ? v : null;
};
const KINDS = ['influencer', 'hotel', 'agency', 'tour_operator', 'corporate', 'association', 'other'];

export async function savePromoPartner(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const to = id ? `/admin/promo-codes/${id}` : '/admin/promo-codes/new';

  const kindOfDiscount = String(fd.get('discount_kind'));
  const pct = String(fd.get('discount_percent') ?? '').trim();
  const amount = String(fd.get('discount_xof') ?? '').trim();
  const email = str(fd, 'email', 200).toLowerCase();
  const kind = str(fd, 'kind', 20);

  const row = {
    name: str(fd, 'name', 120),
    kind: KINDS.includes(kind) ? kind : 'other',
    contact_name: str(fd, 'contact_name', 120) || null,
    email: email || null,
    phone: str(fd, 'phone', 30) || null,
    code: normalizeCode(str(fd, 'code', 40)),
    discount_percent: kindOfDiscount === 'percent' && pct ? Math.round(Number(pct)) : null,
    discount_xof: kindOfDiscount === 'amount' && amount ? Math.round(Number(amount)) : null,
    notify: fd.get('notify') === '1',
    notify_on: fd.get('notify_on') === 'request' ? 'request' : 'confirmed',
    locale: fd.get('locale') === 'en' ? 'en' : 'fr',
    active: fd.get('active') === '1',
    starts_on: date(fd, 'starts_on'),
    ends_on: date(fd, 'ends_on'),
    notes: cleanText(fd.get('notes'), 1000) || null
  };

  if (!row.name) redirect(flash(to, 'err', 'Le nom du partenaire est obligatoire.'));
  if (!CODE_RE.test(row.code)) {
    redirect(flash(to, 'err', 'Code invalide : 3 à 30 caractères, lettres, chiffres, tiret ou _ (ex. AWA10).'));
  }
  if (row.email && !isEmail(row.email)) redirect(flash(to, 'err', 'Adresse e-mail invalide.'));
  if (row.notify && !row.email) redirect(flash(to, 'err', 'Ajoutez l’e-mail du partenaire pour qu’il reçoive les notifications.'));
  if (row.discount_percent !== null && !(row.discount_percent >= 1 && row.discount_percent <= 100)) {
    redirect(flash(to, 'err', 'La réduction doit être entre 1 et 100 %.'));
  }
  if (row.discount_xof !== null && !(row.discount_xof > 0)) redirect(flash(to, 'err', 'Montant de réduction invalide.'));
  if (row.starts_on && row.ends_on && row.ends_on < row.starts_on) {
    redirect(flash(to, 'err', 'La date de fin doit être après la date de début.'));
  }

  let savedId = id;
  if (id) {
    const { error } = await supabase.from('promo_partners').update(row).eq('id', id);
    if (error) redirect(flash(to, 'err', error.message.includes('duplicate key') ? 'Ce code est déjà utilisé par un autre partenaire.' : adminError(error.message)));
  } else {
    const { data, error } = await supabase.from('promo_partners').insert(row).select('id').single();
    if (error) redirect(flash(to, 'err', error.message.includes('duplicate key') ? 'Ce code est déjà utilisé par un autre partenaire.' : adminError(error.message)));
    savedId = data!.id;
  }
  redirect(flash(`/admin/promo-codes/${savedId}`, 'ok', id ? 'Partenaire mis à jour.' : 'Code créé : partagez le lien avec votre partenaire.'));
}

export async function togglePromoPartner(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const active = fd.get('active') === '1';
  const { error } = await supabase.from('promo_partners').update({ active }).eq('id', id);
  if (error) redirect(flash('/admin/promo-codes', 'err', adminError(error.message)));
  redirect(flash('/admin/promo-codes', 'ok', active ? 'Code réactivé.' : 'Code mis en pause : il n’est plus accepté.'));
}

/** Deleting keeps the bookings (they simply lose the link to the partner). */
export async function deletePromoPartner(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const { error } = await supabase.from('promo_partners').delete().eq('id', id);
  if (error) redirect(flash(`/admin/promo-codes/${id}`, 'err', adminError(error.message)));
  redirect(flash('/admin/promo-codes', 'ok', 'Partenaire supprimé. Les réservations sont conservées.'));
}
