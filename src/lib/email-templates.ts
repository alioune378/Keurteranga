import { site } from '@/config/site';
import type { Locale } from '@/i18n/routing';
import { discountedTotal, discountLabel } from './promo';
import { escapeHtml, formatDate, formatPrice, siteUrl } from './utils';

const C = {
  green: '#0A5532',
  greenDark: '#062F1F',
  gold: '#DDAE4E',
  cream: '#FBF8F2',
  sand: '#EADCC3',
  ink: '#1D2621',
  soft: '#4A564F'
};

/** Contact details shown in emails — overridden by the owner's dashboard settings. */
let contact = { email: site.email, whatsapp: site.whatsapp, phoneDisplay: site.phoneDisplay };
/** Public address customers see and reply to (e.g. hello@…), never the private inbox. */
export function publicReplyTo() {
  return contact.email || undefined;
}
export function setEmailContact(c: { email: string | null; whatsapp: string | null; phoneDisplay: string | null }) {
  contact = c;
}

function contactLine(locale: Locale) {
  const parts: string[] = [];
  if (contact.email) parts.push(`<a href="mailto:${escapeHtml(contact.email)}" style="color:${C.gold};text-decoration:none;">${escapeHtml(contact.email)}</a>`);
  if (contact.whatsapp)
    parts.push(`<a href="https://wa.me/${escapeHtml(contact.whatsapp)}" style="color:${C.gold};text-decoration:none;">WhatsApp${contact.phoneDisplay ? ' ' + escapeHtml(contact.phoneDisplay) : ''}</a>`);
  parts.push(`<a href="${siteUrl(`/${locale}`)}" style="color:${C.gold};text-decoration:none;">${escapeHtml(siteUrl().replace(/^https?:\/\//, ''))}</a>`);
  return parts.join(' · ');
}

function layout(locale: Locale, title: string, body: string, preheader = '') {
  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:Helvetica,Arial,sans-serif;color:${C.ink};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${C.sand};">
  <tr><td style="background:${C.green};padding:28px 32px;">
    <img src="${siteUrl('/images/logo/logo-ker-teranga-light.png')}" alt="Kër Téranga" width="150" style="display:block;width:150px;height:auto;border:0;">
  </td></tr>
  <tr><td style="padding:32px;">${body}</td></tr>
  <tr><td style="background:${C.greenDark};padding:22px 32px;color:#cfe3d7;font-size:13px;line-height:1.7;">
    Kër Téranga · ${escapeHtml(site.address.city)}, ${escapeHtml(site.address.country)}<br>${contactLine(locale)}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function rows(items: Array<[string, string]>) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:12px;padding:8px 20px;margin:20px 0;">
${items
  .map(
    ([k, v]) => `<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${C.sand};color:${C.soft};font-size:14px;width:42%;vertical-align:top;">${escapeHtml(k)}</td>
  <td style="padding:10px 0;border-bottom:1px solid ${C.sand};font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(v)}</td>
</tr>`
  )
  .join('')}
</table>`;
}

function button(href: string, label: string, dark = false) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${dark ? C.green : C.gold};color:${dark ? '#ffffff' : C.greenDark};text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px;font-size:15px;">${escapeHtml(label)}</a>`;
}

export interface BookingEmailData {
  bookingId: string;
  /** true once the owner has confirmed the request */
  confirmed: boolean;
  reference: string;
  experienceTitle: string;
  date: string;
  startTime: string;
  endTime: string | null;
  participants: number;
  language: 'fr' | 'en';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  specialRequests: string;
  location: string;
  priceXof: number | null;
  locale: Locale;
  /** partner / influencer code used for this booking */
  promoCode: string | null;
  discountPercent: number | null;
  discountXof: number | null;
}

function promoOf(d: BookingEmailData) {
  return d.promoCode ? { discount_percent: d.discountPercent, discount_xof: d.discountXof } : null;
}

const T = {
  fr: {
    reference: 'Référence', experience: 'Expérience', date: 'Date', time: 'Horaire',
    guests: 'Participants', wsLang: "Langue de l'atelier", location: 'Lieu',
    total: 'Total indicatif', payOnSite: " — à régler à l'avance par Orange Money ou Wave, au plus tard 48 h avant l'atelier", priceTbc: 'Prix communiqué par Kër Téranga',
    langFr: 'Français', langEn: 'Anglais'
  },
  en: {
    reference: 'Reference', experience: 'Experience', date: 'Date', time: 'Time',
    guests: 'Guests', wsLang: 'Workshop language', location: 'Location',
    total: 'Estimated total', payOnSite: ' — payable in advance by Orange Money or Wave, at least 48 hours before the workshop', priceTbc: 'Price confirmed by Kër Téranga',
    langFr: 'French', langEn: 'English'
  }
} as const;

function bookingRows(d: BookingEmailData, l: Locale) {
  const t = T[l];
  const time = d.endTime ? `${d.startTime} – ${d.endTime}` : d.startTime;
  const promo = promoOf(d);
  const total = d.priceXof != null ? `${formatPrice(discountedTotal(d.priceXof * d.participants, promo), l)}${t.payOnSite}` : t.priceTbc;
  return rows([
    [t.reference, d.reference],
    [t.experience, d.experienceTitle],
    [t.date, formatDate(d.date, l)],
    [t.time, `${time} (Dakar)`],
    [t.guests, String(d.participants)],
    [t.wsLang, d.language === 'fr' ? t.langFr : t.langEn],
    [t.location, d.location],
    ...(d.promoCode ? [[l === 'fr' ? 'Code promo' : 'Promo code', `${d.promoCode} (${discountLabel(promo, l)})`] as [string, string]] : []),
    [t.total, total]
  ]);
}

/** 48-hour cancellation policy, shown in every booking email sent to the guest. */
function policyBlock(fr: boolean) {
  return `
<div style="border:1px solid #DD9E80;border-radius:12px;padding:14px 16px;margin:0 0 20px;">
  <p style="font-size:14px;font-weight:bold;margin:0 0 6px;">${fr ? "Politique d'annulation" : 'Cancellation policy'}</p>
  <p style="font-size:14px;line-height:1.6;margin:0;">${fr
    ? "Annulation gratuite jusqu'à 48 h avant l'atelier. Passé ce délai, aucun remboursement n'est possible : les ingrédients auront déjà été achetés pour vous."
    : 'Free cancellation up to 48 hours before the workshop. After that, no refund is possible: the ingredients will already have been bought for you.'}</p>
</div>`;
}

export function bookingClientEmail(d: BookingEmailData) {
  const fr = d.locale === 'fr';
  const subject = fr
    ? `Réservation confirmée — ${d.experienceTitle} · ${d.reference}`
    : `Booking confirmed — ${d.experienceTitle} · ${d.reference}`;

  const body = `
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:0 0 6px;color:${C.green};">Dalal ak jàmm, ${escapeHtml(d.firstName)}${fr ? ' !' : '!'}</h1>
<p style="margin:0;color:${C.soft};font-size:13px;">${fr ? '« Bienvenue » en wolof' : '“Welcome” in Wolof'}</p>
<p style="font-size:16px;line-height:1.6;margin:18px 0 0;">
  ${fr
    ? 'Votre réservation est confirmée. Nous avons hâte de vous accueillir et de partager avec vous les saveurs et la Teranga du Sénégal.'
    : 'Your booking is confirmed. We look forward to welcoming you and sharing the flavours and Teranga of Senegal with you.'}
</p>
${bookingRows(d, d.locale)}
<p style="font-size:15px;line-height:1.6;margin:0 0 12px;">
  ${fr
    ? "L'adresse exacte et les informations pratiques vous seront communiquées avant l'atelier."
    : 'The exact address and practical information will be sent to you before the workshop.'}
</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
  ${fr
    ? 'Pour modifier ou annuler, répondez simplement à cet e-mail en indiquant votre référence.'
    : 'To change or cancel, simply reply to this email quoting your reference.'}
</p>
${policyBlock(fr)}
${contact.whatsapp ? button(`https://wa.me/${contact.whatsapp}`, fr ? 'Nous écrire sur WhatsApp' : 'Message us on WhatsApp') : ''}
<p style="font-size:15px;margin:28px 0 0;">${fr ? 'À très bientôt,' : 'See you soon,'}<br><strong>Kër Téranga</strong></p>`;

  return { subject, html: layout(d.locale, subject, body, `${d.reference} · ${formatDate(d.date, d.locale)}`) };
}

/** Sent immediately: the request is saved and awaits the owner's confirmation. */
export function bookingReceivedEmail(d: BookingEmailData) {
  const fr = d.locale === 'fr';
  const subject = fr
    ? `Demande de réservation reçue — ${d.experienceTitle} · ${d.reference}`
    : `Booking request received — ${d.experienceTitle} · ${d.reference}`;

  const body = `
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px;margin:0 0 6px;color:${C.green};">${fr ? 'Merci' : 'Thank you'}, ${escapeHtml(d.firstName)}${fr ? ' !' : '!'}</h1>
<p style="font-size:16px;line-height:1.6;margin:18px 0 0;">
  ${fr
    ? 'Nous avons bien reçu votre demande de réservation et vos places sont mises de côté. Kër Téranga la confirme très rapidement : vous recevrez un second e-mail de confirmation.'
    : 'We have received your booking request and your places are being held. Kër Téranga will confirm it shortly — you will receive a second confirmation email.'}
</p>
${bookingRows(d, d.locale)}
<p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
  ${fr
    ? 'Une question ? Répondez simplement à cet e-mail en indiquant votre référence.'
    : 'Any question? Simply reply to this email quoting your reference.'}
</p>
${policyBlock(fr)}
${contact.whatsapp ? button(`https://wa.me/${contact.whatsapp}`, fr ? 'Nous écrire sur WhatsApp' : 'Message us on WhatsApp') : ''}
<p style="font-size:15px;margin:28px 0 0;">${fr ? 'À très bientôt,' : 'See you soon,'}<br><strong>Kër Téranga</strong></p>`;

  return { subject, html: layout(d.locale, subject, body, `${d.reference} · ${formatDate(d.date, d.locale)}`) };
}

export function bookingCancelledEmail(d: BookingEmailData) {
  if (!d.confirmed) return bookingDeclinedEmail(d);
  const fr = d.locale === 'fr';
  const subject = fr
    ? `Réservation annulée — ${d.experienceTitle} · ${d.reference}`
    : `Booking cancelled — ${d.experienceTitle} · ${d.reference}`;
  const body = `
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px;color:${C.green};">
  ${fr ? `Bonjour ${escapeHtml(d.firstName)},` : `Hello ${escapeHtml(d.firstName)},`}
</h1>
<p style="font-size:16px;line-height:1.6;margin:0;">
  ${fr ? 'Votre réservation suivante a été annulée :' : 'The following booking has been cancelled:'}
</p>
${rows([
  [T[d.locale].reference, d.reference],
  [T[d.locale].experience, d.experienceTitle],
  [T[d.locale].date, formatDate(d.date, d.locale)],
  [T[d.locale].time, d.startTime]
])}
<p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
  ${fr
    ? "Si vous n'êtes pas à l'origine de cette annulation ou souhaitez choisir une autre date, répondez à cet e-mail : nous serons ravis de vous accueillir une prochaine fois."
    : "If you did not request this cancellation or would like another date, reply to this email — we would be delighted to welcome you another time."}
</p>
${button(siteUrl(fr ? '/fr/reservation' : '/en/booking'), fr ? 'Choisir une nouvelle date' : 'Choose a new date')}`;
  return { subject, html: layout(d.locale, subject, body) };
}

/** A request the owner could not accept (it was never confirmed). */
function bookingDeclinedEmail(d: BookingEmailData) {
  const fr = d.locale === 'fr';
  const subject = fr
    ? `Votre demande de réservation — ${d.experienceTitle} · ${d.reference}`
    : `Your booking request — ${d.experienceTitle} · ${d.reference}`;
  const body = `
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px;color:${C.green};">
  ${fr ? `Bonjour ${escapeHtml(d.firstName)},` : `Hello ${escapeHtml(d.firstName)},`}
</h1>
<p style="font-size:16px;line-height:1.6;margin:0;">
  ${fr
    ? "Merci pour votre demande. Nous ne pouvons malheureusement pas l'accepter pour ce créneau :"
    : 'Thank you for your request. Unfortunately we are unable to accept it for this time slot:'}
</p>
${rows([
  [T[d.locale].reference, d.reference],
  [T[d.locale].experience, d.experienceTitle],
  [T[d.locale].date, formatDate(d.date, d.locale)],
  [T[d.locale].time, d.startTime]
])}
<p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
  ${fr
    ? "Choisissez une autre date ou répondez à cet e-mail : nous serons ravis de trouver une solution avec vous."
    : 'Choose another date or reply to this email — we will be happy to find another option with you.'}
</p>
${button(siteUrl(fr ? '/fr/reservation' : '/en/booking'), fr ? 'Choisir une autre date' : 'Choose another date')}`;
  return { subject, html: layout(d.locale, subject, body) };
}

export function bookingAdminEmail(d: BookingEmailData) {
  const subject = `Demande à confirmer ${d.reference} — ${formatDate(d.date, 'fr', { weekday: 'short', year: undefined })} ${d.startTime} — ${d.participants} pers.`;
  const body = `
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px;color:${C.green};">Nouvelle demande de réservation</h1>
<p style="font-size:15px;line-height:1.6;margin:0;">Les places sont mises de côté. Confirmez (ou refusez) la demande dans votre tableau de bord : le client reçoit alors un e-mail et le créneau apparaît comme réservé sur le site.</p>
${rows([
  ['Référence', d.reference],
  ['Expérience', d.experienceTitle],
  ['Date', formatDate(d.date, 'fr')],
  ['Horaire', d.endTime ? `${d.startTime} – ${d.endTime}` : d.startTime],
  ['Participants', String(d.participants)],
  ['Langue', d.language === 'fr' ? 'Français' : 'Anglais'],
  ['Nom', `${d.firstName} ${d.lastName}`],
  ['E-mail', d.email],
  ['Téléphone', d.phone],
  ['Pays de résidence', d.country || '—'],
  ['Demandes particulières', d.specialRequests || '—'],
  ...(d.promoCode ? [['Code partenaire', `${d.promoCode} (${discountLabel(promoOf(d))})`] as [string, string]] : []),
  ['Langue du site', d.locale.toUpperCase()]
])}
${button(siteUrl(`/admin/bookings/${d.bookingId}`), 'Confirmer ou refuser', true)}`;
  return { subject, html: layout('fr', subject, body) };
}

const ORG_TYPES: Record<string, string> = {
  hotel: 'Hôtel / hébergement',
  agency: 'Agence de voyages',
  tour_operator: 'Tour-opérateur',
  corporate: 'Entreprise / groupe',
  association: 'Association / organisation culturelle',
  other: 'Autre'
};

export function partnerAdminEmail(d: {
  organization: string;
  orgType: string;
  contactName: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  groupSize?: string | null;
  message?: string | null;
}) {
  const subject = `Demande de partenariat — ${d.organization}`;
  const body = `
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px;color:${C.green};">Demande de partenariat</h1>
${rows([
  ['Organisation', d.organization],
  ['Type', ORG_TYPES[d.orgType] ?? d.orgType],
  ['Contact', d.contactName],
  ['E-mail', d.email],
  ['Téléphone', d.phone || '—'],
  ['Pays', d.country || '—'],
  ['Taille de groupe', d.groupSize || '—']
])}
<p style="font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(d.message || '')}</p>
${button(siteUrl('/admin/partners'), 'Voir les demandes', true)}`;
  return { subject, html: layout('fr', subject, body) };
}

export function contactAdminEmail(d: { name: string; email: string; phone?: string | null; subject?: string | null; message: string }) {
  const subject = `Message du site — ${d.subject || d.name}`;
  const body = `
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px;color:${C.green};">Nouveau message</h1>
${rows([
  ['Nom', d.name],
  ['E-mail', d.email],
  ['Téléphone', d.phone || '—'],
  ['Objet', d.subject || '—']
])}
<p style="font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(d.message)}</p>`;
  return { subject, html: layout('fr', subject, body) };
}

/**
 * Sent to the partner / influencer whose code was used. Only what they need to
 * follow their results — never the guest's surname, email or phone number.
 */
export function partnerBookingEmail(
  d: BookingEmailData,
  p: { name: string; code: string; locale: Locale; totalConfirmed: number }
) {
  const fr = p.locale === 'fr';
  const l = p.locale;
  const subject = d.confirmed
    ? fr
      ? `Nouvelle réservation confirmée avec votre code ${p.code}`
      : `New confirmed booking with your code ${p.code}`
    : fr
      ? `Nouvelle demande de réservation avec votre code ${p.code}`
      : `New booking request with your code ${p.code}`;
  const body = `
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px;color:${C.green};">
  ${fr ? `Bonjour ${escapeHtml(p.name)},` : `Hello ${escapeHtml(p.name)},`}
</h1>
<p style="font-size:16px;line-height:1.6;margin:0;">
  ${d.confirmed
    ? fr
      ? `Bonne nouvelle : une réservation avec votre code <strong>${escapeHtml(p.code)}</strong> vient d'être confirmée. Merci de faire découvrir Kër Téranga !`
      : `Good news: a booking with your code <strong>${escapeHtml(p.code)}</strong> has just been confirmed. Thank you for sharing Kër Téranga!`
    : fr
      ? `Une nouvelle demande de réservation vient d'arriver avec votre code <strong>${escapeHtml(p.code)}</strong>. Kër Téranga la confirmera très prochainement.`
      : `A new booking request has just arrived with your code <strong>${escapeHtml(p.code)}</strong>. Kër Téranga will confirm it shortly.`}
</p>
${rows([
  [fr ? 'Invité' : 'Guest', d.firstName],
  [fr ? 'Expérience' : 'Experience', d.experienceTitle],
  [fr ? 'Date' : 'Date', formatDate(d.date, l)],
  [fr ? 'Participants' : 'Guests', String(d.participants)],
  [fr ? 'Code utilisé' : 'Code used', `${p.code} (${discountLabel(promoOf(d), l)})`],
  [fr ? 'Réservations confirmées avec votre code' : 'Confirmed bookings with your code', String(p.totalConfirmed)]
])}
<p style="font-size:15px;margin:28px 0 0;">${fr ? 'Avec toute notre reconnaissance,' : 'With our warm thanks,'}<br><strong>Kër Téranga</strong></p>`;
  return { subject, html: layout(l, subject, body, `${p.code} · ${formatDate(d.date, l)}`) };
}


/** Thank-you email sent after a workshop, inviting guests to leave a Google review. */
export function reviewThanksEmail(d: { locale: Locale; firstName?: string | null; reviewUrl: string; note?: string | null }) {
  const fr = d.locale === 'fr';
  const name = d.firstName ? ` ${escapeHtml(d.firstName)}` : '';
  const subject = fr ? 'Merci d’avoir cuisiné avec nous — Kër Téranga' : 'Thank you for cooking with us — Kër Téranga';
  const note = d.note ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;white-space:pre-line;">${escapeHtml(d.note)}</p>` : '';
  const body = fr
    ? `<h1 style="margin:0 0 16px;font-size:24px;color:${C.green};">Jërëjëf${name} !</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Merci d’avoir partagé ce moment avec nous autour du thiéboudiène. C’était un plaisir de vous accueillir à Kër Téranga.</p>
${note}<p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Si vous avez apprécié l’atelier, un petit avis sur Google nous aiderait énormément : il permet à d’autres voyageurs et curieux de découvrir Kër Téranga. Cela ne prend qu’une minute.</p>
<p style="margin:0 0 28px;">${button(d.reviewUrl, 'Laisser un avis sur Google')}</p>
<p style="margin:0;font-size:15px;line-height:1.6;color:${C.soft};">À très bientôt,<br>L’équipe Kër Téranga</p>`
    : `<h1 style="margin:0 0 16px;font-size:24px;color:${C.green};">Jërëjëf${name}!</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Thank you for sharing this moment with us around the thiéboudiène. It was a joy to welcome you to Kër Téranga.</p>
${note}<p style="margin:0 0 24px;font-size:16px;line-height:1.6;">If you enjoyed the workshop, a short Google review would help us enormously: it lets other travellers and food lovers discover Kër Téranga. It only takes a minute.</p>
<p style="margin:0 0 28px;">${button(d.reviewUrl, 'Leave a Google review')}</p>
<p style="margin:0;font-size:15px;line-height:1.6;color:${C.soft};">See you soon,<br>The Kër Téranga team</p>`;
  return { subject, html: layout(d.locale, subject, body, fr ? 'Merci pour votre visite — votre avis compte' : 'Thank you for your visit — your review matters') };
}
