'use server';

import type { Locale } from '@/i18n/routing';
import { processOutboxQuickly } from '@/lib/outbox';
import { rateLimit } from '@/lib/rate-limit';
import { getServiceClient } from '@/lib/supabase/service';
import { CODE_RE, normalizeCode, type PromoDiscount } from '@/lib/promo';
import type { BookingErrorCode, BookingResult, FormState } from '@/lib/types';
import { buildPhone, cleanLine, cleanText, isEmail, isUuid, looksLikeSpam } from '@/lib/validation';

const KNOWN_ERRORS: BookingErrorCode[] = [
  'NOT_ENOUGH_SPOTS',
  'SESSION_CLOSED',
  'SESSION_PAST',
  'DATE_BLOCKED',
  'INVALID_PARTICIPANTS',
  'INVALID_INPUT',
  'SESSION_NOT_FOUND',
  'INVALID_PROMO'
];

export interface BookingInput {
  idempotencyKey: string;
  sessionId: string;
  participants: number;
  language: 'fr' | 'en';
  firstName: string;
  lastName: string;
  email: string;
  dialCode: string;
  phone: string;
  country: string;
  specialRequests: string;
  /** optional partner / influencer code */
  promoCode?: string;
  consent: boolean;
  website: string; // honeypot
  startedAt: number;
  locale: Locale;
}

/** Creates a booking in PostgreSQL (atomic, row-locked). Never simulated. */
export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: 'NOT_CONFIGURED' };

  if (looksLikeSpam(input.website, input.startedAt, 5)) return { ok: false, error: 'INVALID_INPUT' };

  // ---- validation & sanitisation
  const fields: Record<string, string> = {};
  const firstName = cleanLine(input.firstName, 80);
  const lastName = cleanLine(input.lastName, 80);
  const email = cleanLine(input.email, 200).toLowerCase();
  const phone = buildPhone(input.dialCode, input.phone);
  const country = cleanLine(input.country, 80);
  const specialRequests = cleanText(input.specialRequests, 1000);
  const participants = Math.trunc(Number(input.participants));
  const language = input.language === 'en' ? 'en' : 'fr';
  const locale: Locale = input.locale === 'en' ? 'en' : 'fr';
  const promoCode = normalizeCode(String(input.promoCode ?? ''));
  if (promoCode && !CODE_RE.test(promoCode)) return { ok: false, error: 'INVALID_PROMO' };

  if (!firstName) fields.firstName = 'required';
  if (!lastName) fields.lastName = 'required';
  if (!isEmail(email)) fields.email = 'email';
  if (!phone) fields.phone = 'phone';
  if (!input.consent) fields.consent = 'required';
  if (!isUuid(input.sessionId) || !isUuid(input.idempotencyKey)) return { ok: false, error: 'INVALID_INPUT' };
  if (!Number.isFinite(participants) || participants < 1 || participants > 200) {
    return { ok: false, error: 'INVALID_PARTICIPANTS' };
  }
  if (Object.keys(fields).length) return { ok: false, error: 'INVALID_INPUT', fields };

  // ---- rate limiting (per anonymised IP)
  if (!(await rateLimit('booking', 6, 15 * 60))) return { ok: false, error: 'RATE_LIMITED' };

  // ---- atomic booking in the database
  const { data, error } = await supabase.rpc('create_booking', {
    p_idempotency_key: input.idempotencyKey,
    p_session_id: input.sessionId,
    p_participants: participants,
    p_language: language,
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email,
    p_phone: phone,
    p_country: country,
    p_special_requests: specialRequests,
    p_locale: locale,
    p_promo_code: promoCode || null
  });

  if (error) {
    const code = KNOWN_ERRORS.find((c) => error.message.includes(c));
    if (!code) console.error('[booking] create_booking failed', error.message);
    return { ok: false, error: code ?? 'generic' };
  }

  const result = data as { reference: string; booking_id: string };

  // The booking is committed. Emails are queued in the same transaction;
  // try to send them now — if the provider fails they are retried later.
  await processOutboxQuickly([result.booking_id]);

  return { ok: true, reference: result.reference };
}

// ---------------------------------------------------------------------------
// Partner promo code — checked as the guest types it (discount only, never the
// partner's details). Rate-limited so codes cannot be guessed by brute force.
// ---------------------------------------------------------------------------
export async function checkPromoCode(raw: string): Promise<{ ok: true; promo: PromoDiscount } | { ok: false; error: 'INVALID_PROMO' | 'RATE_LIMITED' | 'NOT_CONFIGURED' }> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: 'NOT_CONFIGURED' };
  const code = normalizeCode(String(raw ?? ''));
  if (!CODE_RE.test(code)) return { ok: false, error: 'INVALID_PROMO' };
  if (!(await rateLimit('promo', 15, 15 * 60))) return { ok: false, error: 'RATE_LIMITED' };

  const { data, error } = await supabase.rpc('check_promo', { p_code: code });
  if (error) {
    console.error('[promo] check_promo failed', error.message);
    return { ok: false, error: 'INVALID_PROMO' };
  }
  const r = data as { valid: boolean; code?: string; discount_percent?: number | null; discount_xof?: number | null };
  if (!r?.valid || !r.code) return { ok: false, error: 'INVALID_PROMO' };
  return { ok: true, promo: { code: r.code, discount_percent: r.discount_percent ?? null, discount_xof: r.discount_xof ?? null } };
}

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------
export async function sendContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = getServiceClient();
  if (!supabase) return { status: 'error', error: 'NOT_CONFIGURED' };
  if (looksLikeSpam(formData.get('website'), formData.get('startedAt'))) return { status: 'success' }; // silent drop

  const name = cleanLine(formData.get('name'), 120);
  const email = cleanLine(formData.get('email'), 200).toLowerCase();
  const phone = cleanLine(formData.get('phone'), 30) || null;
  const subject = cleanLine(formData.get('subject'), 200) || null;
  const message = cleanText(formData.get('message'), 5000);
  const locale = formData.get('locale') === 'en' ? 'en' : 'fr';

  const fields: Record<string, string> = {};
  if (!name) fields.name = 'required';
  if (!isEmail(email)) fields.email = 'email';
  if (!message) fields.message = 'required';
  if (!formData.get('consent')) fields.consent = 'required';
  if (Object.keys(fields).length) return { status: 'error', error: 'INVALID_INPUT', fields };

  if (!(await rateLimit('contact', 5, 60 * 60))) return { status: 'error', error: 'RATE_LIMITED' };

  const { data, error } = await supabase
    .from('contact_messages')
    .insert({ name, email, phone, subject, message, locale })
    .select('id')
    .single();
  if (error) {
    console.error('[contact]', error.message);
    return { status: 'error', error: 'generic' };
  }
  await processOutboxQuickly([data.id]);
  return { status: 'success' };
}

// ---------------------------------------------------------------------------
// Partnership inquiry
// ---------------------------------------------------------------------------
const ORG_TYPES = ['hotel', 'agency', 'tour_operator', 'corporate', 'association', 'other'];

export async function sendPartnerInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = getServiceClient();
  if (!supabase) return { status: 'error', error: 'NOT_CONFIGURED' };
  if (looksLikeSpam(formData.get('website'), formData.get('startedAt'))) return { status: 'success' };

  const organization = cleanLine(formData.get('organization'), 160);
  const orgType = cleanLine(formData.get('orgType'), 20);
  const contactName = cleanLine(formData.get('contactName'), 120);
  const email = cleanLine(formData.get('email'), 200).toLowerCase();
  const phone = cleanLine(formData.get('phone'), 30) || null;
  const country = cleanLine(formData.get('country'), 80) || null;
  const groupSize = cleanLine(formData.get('groupSize'), 60) || null;
  const message = cleanText(formData.get('message'), 3000) || null;
  const locale = formData.get('locale') === 'en' ? 'en' : 'fr';

  const fields: Record<string, string> = {};
  if (!organization) fields.organization = 'required';
  if (!ORG_TYPES.includes(orgType)) fields.orgType = 'required';
  if (!contactName) fields.contactName = 'required';
  if (!isEmail(email)) fields.email = 'email';
  if (!formData.get('consent')) fields.consent = 'required';
  if (Object.keys(fields).length) return { status: 'error', error: 'INVALID_INPUT', fields };

  if (!(await rateLimit('partner', 5, 60 * 60))) return { status: 'error', error: 'RATE_LIMITED' };

  const { data, error } = await supabase
    .from('partner_inquiries')
    .insert({ organization, org_type: orgType, contact_name: contactName, email, phone, country, group_size: groupSize, message, locale })
    .select('id')
    .single();
  if (error) {
    console.error('[partner]', error.message);
    return { status: 'error', error: 'generic' };
  }
  await processOutboxQuickly([data.id]);
  return { status: 'success' };
}
