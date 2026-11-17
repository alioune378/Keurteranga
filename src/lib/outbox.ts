import 'server-only';
import type { Locale } from '@/i18n/routing';
import { notifyAddress, sendEmail } from './email';
import {
  bookingAdminEmail,
  bookingCancelledEmail,
  bookingClientEmail,
  bookingReceivedEmail,
  setEmailContact,
  contactAdminEmail,
  partnerAdminEmail,
  type BookingEmailData
} from './email-templates';
import { resolveContact, type SiteSettingsRow } from './site-settings';
import { getServiceClient } from './supabase/service';
import type { Localized } from './types';
import { formatTime, pick } from './utils';

const MAX_ATTEMPTS = 8;

interface OutboxRow {
  id: string;
  kind: 'booking_received' | 'booking_client' | 'booking_admin' | 'booking_cancelled' | 'partner_admin' | 'contact_admin';
  ref_id: string;
  attempts: number;
}

async function loadBooking(id: string): Promise<BookingEmailData | null> {
  const supabase = getServiceClient()!;
  const { data } = await supabase
    .from('bookings')
    .select(
      `id, status, confirmed_at, reference, participants, language, first_name, last_name, email, phone, country, special_requests, locale,
       sessions ( date, start_time, end_time, price_xof ),
       experiences ( title, location, price_xof )`
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;

  const row = data as unknown as {
    id: string; status: string; confirmed_at: string | null;
    reference: string; participants: number; language: 'fr' | 'en'; first_name: string; last_name: string;
    email: string; phone: string; country: string | null; special_requests: string | null; locale: Locale;
    sessions: { date: string; start_time: string; end_time: string | null; price_xof: number | null };
    experiences: { title: Localized; location: Localized; price_xof: number | null };
  };
  const locale: Locale = row.locale === 'en' ? 'en' : 'fr';
  return {
    bookingId: row.id,
    confirmed: row.status === 'confirmed' || !!row.confirmed_at,
    reference: row.reference,
    experienceTitle: pick(row.experiences.title, locale) ?? '',
    date: row.sessions.date,
    startTime: formatTime(row.sessions.start_time),
    endTime: row.sessions.end_time ? formatTime(row.sessions.end_time) : null,
    participants: row.participants,
    language: row.language,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    country: row.country ?? '',
    specialRequests: row.special_requests ?? '',
    location: pick(row.experiences.location, locale) ?? '',
    // a special price set on the session wins over the experience price
    priceXof: row.sessions.price_xof ?? row.experiences.price_xof,
    locale
  };
}

async function deliver(row: OutboxRow) {
  const supabase = getServiceClient()!;

  if (row.kind === 'booking_received' || row.kind === 'booking_client' || row.kind === 'booking_admin' || row.kind === 'booking_cancelled') {
    const b = await loadBooking(row.ref_id);
    if (!b) throw new Error('BOOKING_NOT_FOUND');
    if (row.kind === 'booking_received') {
      const m = bookingReceivedEmail(b);
      await sendEmail({ to: b.email, subject: m.subject, html: m.html, replyTo: notifyAddress() || undefined });
    } else if (row.kind === 'booking_client') {
      const m = bookingClientEmail(b);
      await sendEmail({ to: b.email, subject: m.subject, html: m.html, replyTo: notifyAddress() || undefined });
    } else if (row.kind === 'booking_cancelled') {
      const m = bookingCancelledEmail(b);
      await sendEmail({ to: b.email, subject: m.subject, html: m.html, replyTo: notifyAddress() || undefined });
    } else {
      const m = bookingAdminEmail(b);
      await sendEmail({ to: notifyAddress(), subject: m.subject, html: m.html, replyTo: b.email });
    }
    return;
  }

  if (row.kind === 'partner_admin') {
    const { data: p } = await supabase.from('partner_inquiries').select('*').eq('id', row.ref_id).maybeSingle();
    if (!p) throw new Error('INQUIRY_NOT_FOUND');
    const m = partnerAdminEmail({
      organization: p.organization, orgType: p.org_type, contactName: p.contact_name, email: p.email,
      phone: p.phone, country: p.country, groupSize: p.group_size, message: p.message
    });
    await sendEmail({ to: notifyAddress(), subject: m.subject, html: m.html, replyTo: p.email });
    return;
  }

  if (row.kind === 'contact_admin') {
    const { data: c } = await supabase.from('contact_messages').select('*').eq('id', row.ref_id).maybeSingle();
    if (!c) throw new Error('MESSAGE_NOT_FOUND');
    const m = contactAdminEmail({ name: c.name, email: c.email, phone: c.phone, subject: c.subject, message: c.message });
    await sendEmail({ to: notifyAddress(), subject: m.subject, html: m.html, replyTo: c.email });
  }
}

/**
 * Sends pending emails. Rows are claimed atomically (no double sending when
 * several workers run). On failure a row stays "pending" with an exponential
 * back-off; after MAX_ATTEMPTS it is marked "failed" and shown in the admin.
 */
export async function processOutbox(opts: { refIds?: string[]; limit?: number } = {}) {
  const supabase = getServiceClient();
  if (!supabase) return { sent: 0, failed: 0 };

  let ids: string[] | null = null;
  if (opts.refIds?.length) {
    const { data } = await supabase.from('email_outbox').select('id').in('ref_id', opts.refIds).eq('status', 'pending');
    const found: string[] = (data ?? []).map((r: { id: string }) => r.id);
    if (found.length === 0) return { sent: 0, failed: 0 };
    ids = found;
  }

  // contact details edited by the owner in the dashboard appear in every email
  const { data: settings } = await supabase.from('site_settings').select('contact, content').eq('id', 1).maybeSingle();
  setEmailContact(resolveContact(settings as SiteSettingsRow | null));

  const { data: rows, error } = await supabase.rpc('claim_outbox', { p_limit: opts.limit ?? 20, p_ids: ids });
  if (error) {
    console.error('[outbox] claim failed', error.message);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (const row of (rows ?? []) as OutboxRow[]) {
    try {
      await deliver(row);
      await supabase.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('id', row.id);
      sent++;
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[outbox] ${row.kind} ${row.ref_id} failed:`, message);
      await supabase
        .from('email_outbox')
        .update({ last_error: message.slice(0, 500), status: row.attempts >= MAX_ATTEMPTS ? 'failed' : 'pending' })
        .eq('id', row.id);
    }
  }
  return { sent, failed };
}

/** Runs `processOutbox` but never waits more than `ms` (the booking is already safe). */
export async function processOutboxQuickly(refIds: string[], ms = 8000) {
  await Promise.race([
    processOutbox({ refIds }).catch((e) => console.error('[outbox]', e)),
    new Promise((resolve) => setTimeout(resolve, ms))
  ]);
}
