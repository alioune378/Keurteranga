'use server';

import { redirect } from 'next/navigation';
import { site } from '@/config/site';
import { adminError, flash, requireAdmin } from '@/lib/admin';
import { sendEmailBatch } from '@/lib/email';
import { publicReplyTo, reviewThanksEmail, setEmailContact } from '@/lib/email-templates';
import { THANKS_MARK } from '@/lib/review';
import { resolveContact, type SiteSettingsRow } from '@/lib/site-settings';
import { cleanLine, cleanText, isEmail } from '@/lib/validation';

const MAX_RECIPIENTS = 100;

/**
 * Sends the post-workshop thank-you email (with the Google review button) to the
 * guests ticked for a session plus any extra addresses typed by the owner.
 */
export async function sendReviewThanks(fd: FormData) {
  const { supabase } = await requireAdmin();
  const sessionId = cleanLine(fd.get('sessionId'), 60);
  const to = `/admin/remerciements${sessionId ? `?session=${sessionId}` : ''}`;

  const { data: settings } = await supabase.from('site_settings').select('contact, content').eq('id', 1).maybeSingle();
  const row = (settings ?? null) as SiteSettingsRow | null;
  const reviewUrl = (row?.contact?.google_review || site.googleReview || '').trim();
  if (!/^https:\/\//i.test(reviewUrl)) {
    redirect(flash(to, 'err', 'Ajoutez d’abord le lien « Laisser un avis » de votre fiche Google dans Site & coordonnées.'));
  }
  setEmailContact(resolveContact(row));

  const noteFr = cleanText(fd.get('note_fr'), 800) || null;
  const noteEn = cleanText(fd.get('note_en'), 800) || null;
  const extraLocale = fd.get('extra_locale') === 'en' ? 'en' : 'fr';

  // guests ticked from the session's bookings
  const ids = fd.getAll('booking').map((v) => cleanLine(v, 60)).filter(Boolean);
  type Guest = { id: string; first_name: string; email: string; locale: string; admin_notes: string | null };
  let guests: Guest[] = [];
  if (ids.length) {
    const { data, error } = await supabase.from('bookings').select('id, first_name, email, locale, admin_notes').in('id', ids);
    if (error) redirect(flash(to, 'err', adminError(error.message)));
    guests = (data ?? []) as Guest[];
  }

  // extra addresses typed by hand (guests who did not book online)
  const typed = String(fd.get('extras') ?? '')
    .split(/[\s,;]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const invalid = typed.filter((v) => !isEmail(v));
  if (invalid.length) redirect(flash(to, 'err', `Adresse(s) invalide(s) : ${invalid.slice(0, 5).join(', ')}`));

  const seen = new Set<string>();
  const messages: Array<{ to: string; subject: string; html: string; replyTo?: string }> = [];
  const add = (email: string, locale: 'fr' | 'en', firstName: string | null) => {
    const key = email.trim().toLowerCase();
    if (!isEmail(key) || seen.has(key)) return;
    seen.add(key);
    const { subject, html } = reviewThanksEmail({ locale, firstName, reviewUrl, note: locale === 'fr' ? noteFr : noteEn });
    messages.push({ to: key, subject, html, replyTo: publicReplyTo() });
  };
  for (const g of guests) add(g.email, g.locale === 'en' ? 'en' : 'fr', g.first_name);
  for (const e of typed) add(e, extraLocale, null);

  if (!messages.length) redirect(flash(to, 'err', 'Aucun destinataire : cochez des participants ou ajoutez des adresses e-mail.'));
  if (messages.length > MAX_RECIPIENTS) redirect(flash(to, 'err', `Maximum ${MAX_RECIPIENTS} destinataires par envoi.`));

  try {
    await sendEmailBatch(messages);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    redirect(flash(to, 'err', msg.startsWith('EMAIL_NOT_CONFIGURED') ? 'L’envoi d’e-mails n’est pas configuré sur le site.' : `Échec de l’envoi : ${msg}`));
  }

  // keep a trace on each booking so the owner sees who has already been thanked
  const stamp = `${THANKS_MARK} le ${new Date().toLocaleDateString('fr-FR', { timeZone: 'Africa/Dakar' })}`;
  for (const g of guests) {
    const notes = g.admin_notes ? `${g.admin_notes}\n${stamp}` : stamp;
    await supabase.from('bookings').update({ admin_notes: notes.slice(0, 4000) }).eq('id', g.id);
  }

  redirect(flash(to, 'ok', `E-mail de remerciement envoyé à ${messages.length} personne${messages.length > 1 ? 's' : ''}.`));
}
