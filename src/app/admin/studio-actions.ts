'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminError, flash, requireAdmin } from '@/lib/admin';
import { cleanLine, cleanText, isEmail } from '@/lib/validation';

/**
 * Server actions for Kër Téranga Studio content modules:
 * announcements, special offers, flyers & media, website content.
 * Every action re-checks that the signed-in user is an administrator, and
 * Row Level Security enforces it again inside the database.
 */

const str = (fd: FormData, k: string, max = 200) => cleanLine(fd.get(k), max);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const date = (fd: FormData, k: string) => {
  const v = str(fd, k, 10);
  return isDate(v) ? v : null;
};
const bi = (fd: FormData, k: string, max = 200) => {
  const o: { fr?: string; en?: string } = {};
  const fr = str(fd, `${k}_fr`, max);
  const en = str(fd, `${k}_en`, max);
  if (fr) o.fr = fr;
  if (en) o.en = en;
  return o;
};
const biText = (fd: FormData, k: string, max = 3000) => {
  const o: { fr?: string; en?: string } = {};
  const fr = cleanText(fd.get(`${k}_fr`), max);
  const en = cleanText(fd.get(`${k}_en`), max);
  if (fr) o.fr = fr;
  if (en) o.en = en;
  return o;
};
/** Only our own storage URLs, site-relative links, https links or WhatsApp/mail/tel. */
const safeUrl = (v: string) => {
  if (!v) return null;
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  if (/^(https:\/\/|mailto:|tel:)/i.test(v)) return v;
  return null;
};
const mediaUrl = (v: string) => {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  return v && base && v.startsWith(`${base}/storage/v1/object/public/media/`) ? v : null;
};
const datesOk = (a: string | null, b: string | null) => !a || !b || b >= a;

function refresh() {
  revalidatePath('/[locale]', 'layout');
}

async function removeFromStorage(path: string | null | undefined) {
  if (!path) return;
  const { supabase } = await requireAdmin();
  await supabase.storage.from('media').remove([path]);
}

// ============================================================================
// Announcements (Communications)
// ============================================================================
export async function saveAnnouncement(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const publish = fd.get('intent') === 'publish';
  const unpublish = fd.get('intent') === 'unpublish';
  const to = id ? `/admin/communications/${id}` : '/admin/communications/new';

  const row = {
    title: bi(fd, 'title', 140),
    body: biText(fd, 'body', 1500),
    cta_label: bi(fd, 'cta', 40),
    cta_url: safeUrl(str(fd, 'cta_url', 500)),
    placement: fd.get('placement') === 'banner' ? 'banner' : 'home',
    event_date: date(fd, 'event_date'),
    starts_on: date(fd, 'starts_on'),
    ends_on: date(fd, 'ends_on'),
    image_url: mediaUrl(str(fd, 'image_url', 600)),
    image_path: str(fd, 'image_path', 300) || null,
    sort_order: Number(fd.get('sort_order') || 0) || 0,
    ...(publish ? { status: 'published' } : unpublish ? { status: 'draft' } : {})
  };
  if (!row.image_url) row.image_path = null;

  if (!row.title.fr) redirect(flash(to, 'err', 'Le titre en français est obligatoire.'));
  if (str(fd, 'cta_url', 500) && !row.cta_url) redirect(flash(to, 'err', 'Lien invalide : utilisez une adresse qui commence par https:// ou /fr/…'));
  if (!datesOk(row.starts_on, row.ends_on)) redirect(flash(to, 'err', 'La date de fin doit être après la date de début.'));

  let savedId = id;
  if (id) {
    const { data: old } = await supabase.from('announcements').select('image_path').eq('id', id).maybeSingle();
    const { error } = await supabase.from('announcements').update(row).eq('id', id);
    if (error) redirect(flash(to, 'err', adminError(error.message)));
    if (old?.image_path && old.image_path !== row.image_path) await removeFromStorage(old.image_path);
  } else {
    const { data, error } = await supabase.from('announcements').insert({ ...row, status: publish ? 'published' : 'draft' }).select('id').single();
    if (error) redirect(flash(to, 'err', adminError(error.message)));
    savedId = data!.id;
  }
  refresh();
  redirect(flash(`/admin/communications/${savedId}`, 'ok',
    publish ? 'Annonce publiée : elle est visible sur le site.' : unpublish ? 'Annonce retirée du site (brouillon).' : 'Brouillon enregistré. Vérifiez l’aperçu puis publiez.'));
}

export async function deleteAnnouncement(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const { data: old } = await supabase.from('announcements').select('image_path').eq('id', id).maybeSingle();
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) redirect(flash('/admin/communications', 'err', adminError(error.message)));
  await removeFromStorage(old?.image_path);
  refresh();
  redirect(flash('/admin/communications', 'ok', 'Annonce supprimée.'));
}

// ============================================================================
// Special offers
// ============================================================================
export async function saveOffer(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const publish = fd.get('intent') === 'publish';
  const unpublish = fd.get('intent') === 'unpublish';
  const to = id ? `/admin/offers/${id}` : '/admin/offers/new';

  const kind = String(fd.get('kind'));
  const pct = String(fd.get('discount_percent') ?? '').trim();
  const price = String(fd.get('offer_price') ?? '').trim();
  const row = {
    title: bi(fd, 'title', 140),
    description: biText(fd, 'description', 1500),
    experience_id: /^[0-9a-f-]{36}$/i.test(str(fd, 'experience_id', 40)) ? str(fd, 'experience_id', 40) : null,
    discount_percent: kind === 'percent' && pct ? Math.round(Number(pct)) : null,
    offer_price_xof: kind === 'price' && price ? Math.round(Number(price)) : null,
    code: str(fd, 'code', 40).toUpperCase() || null,
    starts_on: date(fd, 'starts_on'),
    ends_on: date(fd, 'ends_on'),
    show_on_home: fd.get('show_on_home') === '1',
    image_url: mediaUrl(str(fd, 'image_url', 600)),
    image_path: str(fd, 'image_path', 300) || null,
    sort_order: Number(fd.get('sort_order') || 0) || 0,
    ...(publish ? { status: 'published' } : unpublish ? { status: 'draft' } : {})
  };
  if (!row.image_url) row.image_path = null;

  if (!row.title.fr) redirect(flash(to, 'err', 'Le titre en français est obligatoire.'));
  if (row.discount_percent !== null && !(row.discount_percent >= 1 && row.discount_percent <= 100)) {
    redirect(flash(to, 'err', 'La réduction doit être entre 1 et 100 %.'));
  }
  if (row.offer_price_xof !== null && !(row.offer_price_xof >= 0)) redirect(flash(to, 'err', 'Prix spécial invalide.'));
  if (!datesOk(row.starts_on, row.ends_on)) redirect(flash(to, 'err', 'La date d’expiration doit être après la date de début.'));

  let savedId = id;
  if (id) {
    const { data: old } = await supabase.from('offers').select('image_path').eq('id', id).maybeSingle();
    const { error } = await supabase.from('offers').update(row).eq('id', id);
    if (error) redirect(flash(to, 'err', adminError(error.message)));
    if (old?.image_path && old.image_path !== row.image_path) await removeFromStorage(old.image_path);
  } else {
    const { data, error } = await supabase.from('offers').insert({ ...row, status: publish ? 'published' : 'draft' }).select('id').single();
    if (error) redirect(flash(to, 'err', adminError(error.message)));
    savedId = data!.id;
  }
  refresh();
  redirect(flash(`/admin/offers/${savedId}`, 'ok',
    publish ? 'Offre publiée : elle est visible sur le site.' : unpublish ? 'Offre désactivée (retirée du site).' : 'Brouillon enregistré. Vérifiez l’aperçu puis publiez.'));
}

export async function deleteOffer(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const { data: old } = await supabase.from('offers').select('image_path').eq('id', id).maybeSingle();
  const { error } = await supabase.from('offers').delete().eq('id', id);
  if (error) redirect(flash('/admin/offers', 'err', adminError(error.message)));
  await removeFromStorage(old?.image_path);
  refresh();
  redirect(flash('/admin/offers', 'ok', 'Offre supprimée.'));
}

// ============================================================================
// Media library (flyers, posters, photos, PDFs)
// ============================================================================
export async function addMedia(fd: FormData) {
  const { supabase } = await requireAdmin();
  const to = '/admin/media';
  const url = mediaUrl(str(fd, 'file_url', 600));
  const mime = str(fd, 'file_mime', 40);
  if (!url || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mime)) {
    redirect(flash(to, 'err', 'Choisissez d’abord un fichier (JPG, PNG, WebP ou PDF).'));
  }
  const kind = ['flyer', 'poster', 'photo', 'other'].includes(String(fd.get('kind'))) ? String(fd.get('kind')) : 'flyer';
  const row = {
    title: bi(fd, 'title', 120),
    kind,
    file_url: url,
    storage_path: str(fd, 'file_path', 300) || null,
    mime,
    show_on_home: fd.get('show_on_home') === '1',
    starts_on: date(fd, 'starts_on'),
    ends_on: date(fd, 'ends_on')
  };
  if (!datesOk(row.starts_on, row.ends_on)) redirect(flash(to, 'err', 'La date de fin doit être après la date de début.'));
  const { error } = await supabase.from('media').insert(row);
  if (error) redirect(flash(to, 'err', adminError(error.message)));
  refresh();
  redirect(flash(to, 'ok', row.show_on_home ? 'Fichier ajouté et affiché sur la page d’accueil.' : 'Fichier ajouté à la bibliothèque.'));
}

export async function updateMedia(fd: FormData) {
  const { supabase } = await requireAdmin();
  const to = '/admin/media';
  const id = str(fd, 'id', 40);
  const op = String(fd.get('op'));
  if (op === 'delete') {
    const { data: old } = await supabase.from('media').select('storage_path').eq('id', id).maybeSingle();
    const { error } = await supabase.from('media').delete().eq('id', id);
    if (error) redirect(flash(to, 'err', adminError(error.message)));
    await removeFromStorage(old?.storage_path);
    refresh();
    redirect(flash(to, 'ok', 'Fichier supprimé.'));
  }
  const patch = {
    title: bi(fd, 'title', 120),
    show_on_home: fd.get('show_on_home') === '1',
    starts_on: date(fd, 'starts_on'),
    ends_on: date(fd, 'ends_on'),
    sort_order: Number(fd.get('sort_order') || 0) || 0
  };
  if (!datesOk(patch.starts_on, patch.ends_on)) redirect(flash(to, 'err', 'La date de fin doit être après la date de début.'));
  const { error } = await supabase.from('media').update(patch).eq('id', id);
  if (error) redirect(flash(to, 'err', adminError(error.message)));
  refresh();
  redirect(flash(to, 'ok', 'Fichier mis à jour.'));
}

// ============================================================================
// Website content & business information
// ============================================================================
export async function saveSettings(fd: FormData) {
  const { supabase } = await requireAdmin();
  const to = '/admin/settings';

  const email = str(fd, 'email', 200).toLowerCase();
  const social = (k: string) => {
    const v = str(fd, k, 300);
    return v && /^https:\/\//i.test(v) ? v : '';
  };
  const contact = {
    email,
    phone: str(fd, 'phone', 30),
    whatsapp: str(fd, 'whatsapp', 30),
    street: str(fd, 'street', 200),
    instagram: social('instagram'),
    facebook: social('facebook'),
    tiktok: social('tiktok'),
    linkedin: social('linkedin'),
    google_review: social('google_review')
  };
  if (email && !isEmail(email)) redirect(flash(to, 'err', 'Adresse e-mail invalide.'));
  for (const k of ['instagram', 'facebook', 'tiktok', 'linkedin', 'google_review'] as const) {
    if (str(fd, k, 300) && !contact[k]) redirect(flash(to, 'err', `Lien ${k} invalide : il doit commencer par https://`));
  }
  if (contact.whatsapp && contact.whatsapp.replace(/\D/g, '').length < 8) {
    redirect(flash(to, 'err', 'Numéro WhatsApp invalide : indiquez-le avec l’indicatif, ex. +221 77 123 45 67.'));
  }

  const content = {
    hero_title: bi(fd, 'hero_title', 140),
    hero_subtitle: biText(fd, 'hero_subtitle', 400),
    founder_name: str(fd, 'founder_name', 120),
    founder_bio: biText(fd, 'founder_bio', 3000),
    history: biText(fd, 'history', 3000)
  };

  const { error } = await supabase.from('site_settings').upsert({ id: 1, contact, content });
  if (error) redirect(flash(to, 'err', adminError(error.message)));
  refresh();
  redirect(flash(to, 'ok', 'Modifications publiées sur le site.'));
}
