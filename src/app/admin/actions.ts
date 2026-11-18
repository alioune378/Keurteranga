'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminError, flash, requireAdmin } from '@/lib/admin';
import { processOutbox } from '@/lib/outbox';
import { cleanLine, cleanText, isEmail } from '@/lib/validation';

const str = (fd: FormData, k: string, max = 200) => cleanLine(fd.get(k), max);
const back = (fd: FormData, fallback: string) => {
  const r = String(fd.get('redirectTo') || fallback);
  return r.startsWith('/admin') ? r : fallback;
};
const isTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

function revalidatePublic() {
  revalidatePath('/[locale]', 'layout');
}

// ============================================================================
// Auth
// ============================================================================
export async function signOut() {
  const { supabase } = await requireAdmin();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

// ============================================================================
// Sessions
// ============================================================================
/** Optional special price + public title of a session (special events). */
function sessionExtras(fd: FormData): { price_xof: number | null; label: { fr?: string; en?: string } } | 'invalid' {
  const raw = String(fd.get('price') ?? '').trim();
  const price = raw === '' ? null : Math.round(Number(raw));
  if (price !== null && !(price >= 0)) return 'invalid';
  const label: { fr?: string; en?: string } = {};
  const fr = str(fd, 'label_fr', 80);
  const en = str(fd, 'label_en', 80);
  if (fr) label.fr = fr;
  if (en) label.en = en;
  return { price_xof: price, label };
}

export async function createSession(fd: FormData) {
  const { supabase } = await requireAdmin();
  const to = back(fd, '/admin/sessions');
  const experienceId = str(fd, 'experienceId', 40);
  const date = str(fd, 'date', 10);
  const start = str(fd, 'start', 5);
  const end = str(fd, 'end', 5);
  const capacity = Number(fd.get('capacity'));
  if (!experienceId || !isDate(date) || !isTime(start) || (end && !isTime(end)) || !(capacity > 0)) {
    redirect(flash(to, 'err', 'Merci de renseigner une date, une heure de début et une capacité valides.'));
  }
  const extras = sessionExtras(fd);
  if (extras === 'invalid') redirect(flash(to, 'err', 'Prix spécial invalide.'));
  const { error } = await supabase.from('sessions').insert({
    experience_id: experienceId, date, start_time: start, end_time: end || null, capacity,
    notes: str(fd, 'notes', 300) || null,
    ...extras
  });
  if (error) redirect(flash(to, 'err', adminError(error.message)));
  revalidatePublic();
  redirect(flash(to, 'ok', 'Séance créée.'));
}

/** Recurring sessions: weekdays × time slots between two dates (Africa/Dakar). */
export async function createRecurringSessions(fd: FormData) {
  const { supabase } = await requireAdmin();
  const to = back(fd, '/admin/sessions');
  const experienceId = str(fd, 'experienceId', 40);
  const from = str(fd, 'from', 10);
  const until = str(fd, 'until', 10);
  const capacity = Number(fd.get('capacity'));
  const weekdays = fd.getAll('weekday').map(Number).filter((d) => d >= 0 && d <= 6);
  const slots = String(fd.get('slots') || '')
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [a, b] = s.split(/\s*[-–]\s*/);
      return { start: a, end: b || null };
    });

  if (!experienceId || !isDate(from) || !isDate(until) || from > until || !(capacity > 0) || !weekdays.length ||
      !slots.length || slots.some((s) => !isTime(s.start) || (s.end && !isTime(s.end)))) {
    redirect(flash(to, 'err', 'Vérifiez les dates, les jours, les horaires (ex. 10:00-13:30) et la capacité.'));
  }

  const rows: Array<Record<string, unknown>> = [];
  const d = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${until}T00:00:00Z`);
  while (d <= last && rows.length < 1000) {
    if (weekdays.includes(d.getUTCDay())) {
      const iso = d.toISOString().slice(0, 10);
      for (const s of slots) rows.push({ experience_id: experienceId, date: iso, start_time: s.start, end_time: s.end, capacity });
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  if (!rows.length) redirect(flash(to, 'err', 'Aucune date ne correspond à ces critères.'));

  const { error, count } = await supabase
    .from('sessions')
    .upsert(rows, { onConflict: 'experience_id,date,start_time', ignoreDuplicates: true, count: 'exact' });
  if (error) redirect(flash(to, 'err', adminError(error.message)));
  revalidatePublic();
  redirect(flash(to, 'ok', `${count ?? rows.length} séance(s) créée(s) (les doublons existants sont ignorés).`));
}

export async function updateSession(fd: FormData) {
  const { supabase } = await requireAdmin();
  const to = back(fd, '/admin/sessions');
  const id = str(fd, 'id', 40);
  const patch: Record<string, unknown> = {};
  const capacity = fd.get('capacity');
  if (capacity !== null && capacity !== '') {
    const c = Number(capacity);
    const booked = Number(fd.get('booked') || 0);
    if (!(c > 0)) redirect(flash(to, 'err', 'Capacité invalide.'));
    if (c < booked) redirect(flash(to, 'err', `La capacité ne peut pas être inférieure aux ${booked} place(s) déjà réservée(s).`));
    patch.capacity = c;
  }
  const start = str(fd, 'start', 5);
  const end = str(fd, 'end', 5);
  if (start) {
    if (!isTime(start) || (end && !isTime(end))) redirect(flash(to, 'err', 'Horaire invalide.'));
    patch.start_time = start;
    patch.end_time = end || null;
  }
  const status = str(fd, 'status', 10);
  if (status) {
    if (!['open', 'closed'].includes(status)) redirect(flash(to, 'err', 'Statut invalide.'));
    patch.status = status; // 'open' becomes 'full' automatically if no spots remain
  }
  if (fd.has('notes')) patch.notes = str(fd, 'notes', 300) || null;
  if (fd.get('hasExtras') === '1') {
    const extras = sessionExtras(fd);
    if (extras === 'invalid') redirect(flash(to, 'err', 'Prix spécial invalide.'));
    Object.assign(patch, extras);
  }

  const { error } = await supabase.from('sessions').update(patch).eq('id', id);
  if (error) redirect(flash(to, 'err', adminError(error.message)));
  revalidatePublic();
  redirect(flash(to, 'ok', 'Séance mise à jour.'));
}

export async function deleteSession(fd: FormData) {
  const { supabase } = await requireAdmin();
  const to = back(fd, '/admin/sessions');
  const id = str(fd, 'id', 40);
  const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('session_id', id);
  if ((count ?? 0) > 0) {
    redirect(flash(to, 'err', 'Cette séance a des réservations : fermez-la plutôt que de la supprimer.'));
  }
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) redirect(flash(to, 'err', adminError(error.message)));
  revalidatePublic();
  redirect(flash(to, 'ok', 'Séance supprimée.'));
}

export async function blockDate(fd: FormData) {
  const { supabase } = await requireAdmin();
  const to = back(fd, '/admin/sessions');
  const date = str(fd, 'date', 10);
  const experienceId = str(fd, 'experienceId', 40) || null;
  if (!isDate(date)) redirect(flash(to, 'err', 'Date invalide.'));
  const { error } = await supabase.from('blocked_dates').insert({ date, experience_id: experienceId, reason: str(fd, 'reason', 200) || null });
  if (error) redirect(flash(to, 'err', adminError(error.message)));
  revalidatePublic();
  redirect(flash(to, 'ok', 'Date bloquée : elle n’apparaît plus dans le calendrier public.'));
}

export async function unblockDate(fd: FormData) {
  const { supabase } = await requireAdmin();
  const to = back(fd, '/admin/sessions');
  const { error } = await supabase.from('blocked_dates').delete().eq('id', str(fd, 'id', 40));
  if (error) redirect(flash(to, 'err', adminError(error.message)));
  revalidatePublic();
  redirect(flash(to, 'ok', 'Date débloquée.'));
}

// ============================================================================
// Bookings
// ============================================================================
export async function updateBooking(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const to = back(fd, `/admin/bookings/${id}`);

  const email = str(fd, 'email', 200).toLowerCase();
  const contact = {
    first_name: str(fd, 'firstName', 80),
    last_name: str(fd, 'lastName', 80),
    email,
    phone: str(fd, 'phone', 30),
    country: str(fd, 'country', 80) || null,
    special_requests: cleanText(fd.get('specialRequests'), 1000) || null,
    language: fd.get('language') === 'en' ? 'en' : 'fr'
  };
  if (!contact.first_name || !contact.last_name || !isEmail(email) || contact.phone.length < 6) {
    redirect(flash(to, 'err', 'Nom, e-mail et téléphone sont obligatoires et doivent être valides.'));
  }
  const { error: e1 } = await supabase.from('bookings').update(contact).eq('id', id);
  if (e1) redirect(flash(to, 'err', adminError(e1.message)));

  // participants / session move — capacity checked atomically in the database
  const { error: e2 } = await supabase.rpc('admin_update_booking', {
    p_booking_id: id,
    p_session_id: str(fd, 'sessionId', 40),
    p_participants: Number(fd.get('participants')),
    p_admin_notes: cleanText(fd.get('adminNotes'), 2000) || null,
    p_force: fd.get('force') === '1'
  });
  if (e2) redirect(flash(to, 'err', adminError(e2.message)));
  revalidatePublic();
  redirect(flash(to, 'ok', 'Réservation mise à jour.'));
}

/** Owner accepts a booking request → shown as booked on the website + confirmation email. */
export async function confirmBooking(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const to = back(fd, `/admin/bookings/${id}`);
  const notify = fd.get('notify') !== '0';
  const { error } = await supabase.rpc('admin_confirm_booking', { p_booking_id: id, p_notify: notify });
  if (error) redirect(flash(to, 'err', adminError(error.message)));
  if (notify) await processOutbox({ refIds: [id] }).catch(() => undefined);
  revalidatePublic();
  redirect(flash(to, 'ok', notify ? 'Réservation confirmée — le client reçoit son e-mail de confirmation.' : 'Réservation confirmée.'));
}

/** Cancels a confirmed booking, or declines a pending request (seats released). */
export async function cancelBooking(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const to = back(fd, `/admin/bookings/${id}`);
  const notify = fd.get('notify') === '1';
  const declined = fd.get('wasPending') === '1';
  const { error } = await supabase.rpc('admin_cancel_booking', { p_booking_id: id, p_notify: notify });
  if (error) redirect(flash(to, 'err', adminError(error.message)));
  if (notify) await processOutbox({ refIds: [id] }).catch(() => undefined);
  revalidatePublic();
  const what = declined ? 'Demande refusée, les places sont libérées' : 'Réservation annulée';
  redirect(flash(to, 'ok', notify ? `${what} — le client est prévenu par e-mail.` : `${what}.`));
}

export async function retryEmails(fd: FormData) {
  await requireAdmin();
  const to = back(fd, '/admin');
  const { sent, failed } = await processOutbox({ limit: 50 });
  redirect(flash(to, failed ? 'err' : 'ok', `E-mails envoyés : ${sent}${failed ? ` · échecs : ${failed} (nouvel essai automatique plus tard)` : ''}.`));
}

// ============================================================================
// Experiences (bilingual content)
// ============================================================================
function lines(v: FormDataEntryValue | null) {
  return cleanText(v, 4000).split('\n').map((l) => l.trim()).filter(Boolean);
}
function steps(v: FormDataEntryValue | null) {
  return lines(v).map((l) => {
    const [title, ...rest] = l.split('|');
    return { title: title.trim(), text: rest.join('|').trim() };
  });
}

export async function saveExperience(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const to = id ? `/admin/experiences/${id}` : '/admin/experiences/new';

  const slug = str(fd, 'slug', 80).toLowerCase();
  const price = String(fd.get('price') ?? '').trim();
  const max = String(fd.get('max') ?? '').trim();
  const L = (k: string, maxLen = 300) => ({ fr: str(fd, `${k}_fr`, maxLen), en: str(fd, `${k}_en`, maxLen) });
  const T = (k: string) => ({ fr: cleanText(fd.get(`${k}_fr`), 6000), en: cleanText(fd.get(`${k}_en`), 6000) });

  const row = {
    slug,
    status: ['draft', 'published', 'archived'].includes(String(fd.get('status'))) ? String(fd.get('status')) : 'draft',
    title: L('title', 120),
    summary: T('summary'),
    description: T('description'),
    location: L('location', 200),
    duration: L('duration', 60),
    included: { fr: lines(fd.get('included_fr')), en: lines(fd.get('included_en')) },
    steps: { fr: steps(fd.get('steps_fr')), en: steps(fd.get('steps_en')) },
    languages: fd.getAll('languages').map(String).filter((l) => l === 'fr' || l === 'en'),
    price_xof: price === '' ? null : Math.round(Number(price)),
    min_participants: Math.max(1, Number(fd.get('min') || 1)),
    max_participants: max === '' ? null : Number(max),
    booking_cutoff_hours: Math.max(0, Number(fd.get('cutoff') || 0)),
    featured: fd.get('featured') === '1',
    sort_order: Number(fd.get('sortOrder') || 0)
  };

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) redirect(flash(to, 'err', 'Adresse (slug) invalide : lettres minuscules, chiffres et tirets.'));
  if (!row.title.fr || !row.title.en) redirect(flash(to, 'err', 'Le titre est requis en français et en anglais.'));
  if (!row.languages.length) redirect(flash(to, 'err', 'Choisissez au moins une langue.'));
  if (row.price_xof !== null && !(row.price_xof >= 0)) redirect(flash(to, 'err', 'Prix invalide.'));
  if (row.max_participants !== null && !(row.max_participants >= row.min_participants)) {
    redirect(flash(to, 'err', 'Le maximum de participants doit être supérieur ou égal au minimum.'));
  }

  if (id) {
    const { error } = await supabase.from('experiences').update(row).eq('id', id);
    if (error) redirect(flash(to, 'err', adminError(error.message)));
    revalidatePublic();
    redirect(flash(to, 'ok', 'Expérience enregistrée.'));
  } else {
    const { data, error } = await supabase.from('experiences').insert(row).select('id').single();
    if (error) redirect(flash(to, 'err', adminError(error.message)));
    revalidatePublic();
    redirect(flash(`/admin/experiences/${data!.id}`, 'ok', 'Expérience créée. Ajoutez maintenant des photos.'));
  }
}

// ============================================================================
// Photos (Supabase Storage bucket "photos")
// ============================================================================
const MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 8 * 1024 * 1024;

async function uploadFile(file: File, experienceId: string) {
  const { supabase } = await requireAdmin();
  if (!MIME.includes(file.type)) throw new Error('Format accepté : JPG, PNG, WebP ou AVIF.');
  if (file.size > MAX_BYTES) throw new Error('Image trop lourde (8 Mo maximum).');
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${experienceId}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('photos').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function uploadImages(fd: FormData) {
  const { supabase } = await requireAdmin();
  const experienceId = str(fd, 'experienceId', 40);
  const to = `/admin/experiences/${experienceId}#photos`;
  const files = fd.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) redirect(flash(to, 'err', 'Choisissez au moins une photo.'));

  const { data: existing } = await supabase
    .from('experience_images')
    .select('sort_order, is_cover')
    .eq('experience_id', experienceId);
  let order = Math.max(-1, ...(existing ?? []).map((r) => r.sort_order)) + 1;
  const hasCover = (existing ?? []).some((r) => r.is_cover);

  try {
    for (const [i, file] of files.entries()) {
      const { path, url } = await uploadFile(file, experienceId);
      const { error } = await supabase.from('experience_images').insert({
        experience_id: experienceId,
        src: url,
        storage_path: path,
        alt: { fr: str(fd, 'alt_fr', 200), en: str(fd, 'alt_en', 200) },
        illustration: false,
        is_cover: !hasCover && i === 0,
        sort_order: order++
      });
      if (error) throw new Error(error.message);
    }
  } catch (e) {
    redirect(flash(to, 'err', e instanceof Error ? e.message : 'Échec de l’envoi.'));
  }
  revalidatePublic();
  redirect(flash(to, 'ok', `${files.length} photo(s) ajoutée(s).`));
}

export async function replaceImage(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const experienceId = str(fd, 'experienceId', 40);
  const to = `/admin/experiences/${experienceId}#photos`;
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) redirect(flash(to, 'err', 'Choisissez une photo.'));

  const { data: img } = await supabase.from('experience_images').select('storage_path').eq('id', id).maybeSingle();
  try {
    const { path, url } = await uploadFile(file as File, experienceId);
    const { error } = await supabase.from('experience_images').update({ src: url, storage_path: path, illustration: false }).eq('id', id);
    if (error) throw new Error(error.message);
    if (img?.storage_path) await supabase.storage.from('photos').remove([img.storage_path]);
  } catch (e) {
    redirect(flash(to, 'err', e instanceof Error ? e.message : 'Échec du remplacement.'));
  }
  revalidatePublic();
  redirect(flash(to, 'ok', 'Photo remplacée.'));
}

export async function updateImage(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, 'id', 40);
  const experienceId = str(fd, 'experienceId', 40);
  const to = `/admin/experiences/${experienceId}#photos`;
  const op = String(fd.get('op'));

  if (op === 'cover') {
    await supabase.from('experience_images').update({ is_cover: false }).eq('experience_id', experienceId);
    await supabase.from('experience_images').update({ is_cover: true }).eq('id', id);
  } else if (op === 'up' || op === 'down') {
    const { data: imgs } = await supabase
      .from('experience_images').select('id, sort_order').eq('experience_id', experienceId).order('sort_order');
    const list = imgs ?? [];
    const i = list.findIndex((x) => x.id === id);
    const j = op === 'up' ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < list.length) {
      await supabase.from('experience_images').update({ sort_order: j }).eq('id', list[i].id);
      await supabase.from('experience_images').update({ sort_order: i }).eq('id', list[j].id);
      for (const [k, x] of list.entries()) if (k !== i && k !== j && x.sort_order !== k) {
        await supabase.from('experience_images').update({ sort_order: k }).eq('id', x.id);
      }
    }
  } else if (op === 'delete') {
    const { data: img } = await supabase.from('experience_images').select('storage_path').eq('id', id).maybeSingle();
    await supabase.from('experience_images').delete().eq('id', id);
    if (img?.storage_path) await supabase.storage.from('photos').remove([img.storage_path]);
  } else if (op === 'meta') {
    await supabase
      .from('experience_images')
      .update({ alt: { fr: str(fd, 'alt_fr', 200), en: str(fd, 'alt_en', 200) }, illustration: fd.get('illustration') === '1' })
      .eq('id', id);
  }
  revalidatePublic();
  redirect(flash(to, 'ok', 'Photos mises à jour.'));
}

// ============================================================================
// Partners & messages
// ============================================================================
export async function setInquiryStatus(fd: FormData) {
  const { supabase } = await requireAdmin();
  const status = String(fd.get('status'));
  if (!['new', 'in_progress', 'closed'].includes(status)) redirect('/admin/partners');
  await supabase.from('partner_inquiries').update({ status }).eq('id', str(fd, 'id', 40));
  redirect(flash('/admin/partners', 'ok', 'Statut mis à jour.'));
}

export async function toggleMessageHandled(fd: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from('contact_messages').update({ handled: fd.get('handled') === '1' }).eq('id', str(fd, 'id', 40));
  redirect(flash('/admin/partners', 'ok', 'Message mis à jour.'));
}
