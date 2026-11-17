import { site } from '@/config/site';
import type { Locale } from '@/i18n/routing';
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
}

const T = {
  fr: {
    reference: 'Référence', experience: 'Expérience', date: 'Date', time: 'Horaire',
    guests: 'Participants', wsLang: "Langue de l'atelier", location: 'Lieu',
    total: 'Total indicatif', payOnSite: ' — à régler sur place', priceTbc: 'Prix communiqué par Kër Téranga',
    langFr: 'Français', langEn: 'Anglais'
  },
  en: {
    reference: 'Reference', experience: 'Experience', date: 'Date', time: 'Time',
    guests: 'Guests', wsLang: 'Workshop language', location: 'Location',
    total: 'Estimated total', payOnSite: ' — payable on site', priceTbc: 'Price confirmed by Kër Téranga',
    langFr: 'French', langEn: 'English'
  }
} as const;

function bookingRows(d: BookingEmailData, l: Locale) {
  const t = T[l];
  const time = d.endTime ? `${d.startTime} – ${d.endTime}` : d.startTime;
  const total = d.priceXof != null ? `${formatPrice(d.priceXof * d.participants, l)}${t.payOnSite}` : t.priceTbc;
  return rows([
    [t.reference, d.reference],
    [t.experience, d.experienceTitle],
    [t.date, formatDate(d.date, l)],
    [t.time, `${time} (Dakar)`],
    [t.guests, String(d.participants)],
    [t.wsLang, d.language === 'fr' ? t.langFr : t.langEn],
    [t.location, d.location],
    [t.total, total]
  ]);
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
