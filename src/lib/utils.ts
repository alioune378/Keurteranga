import type { Locale } from '@/i18n/routing';
import type { Localized } from './types';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/** Pick the value for a locale, falling back to French then any value. */
export function pick<T>(value: Localized<T> | null | undefined, locale: Locale): T | undefined {
  if (!value) return undefined;
  return value[locale] ?? value.fr ?? Object.values(value)[0];
}

export function formatPrice(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-SN' : 'en-GB', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0
  }).format(amount);
}

/** "2026-11-14" -> long localized date, computed in UTC to avoid TZ shifts. */
export function formatDate(iso: string, locale: Locale, opts?: Intl.DateTimeFormatOptions) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
    ...opts
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "10:00:00" -> "10:00" (fr) / "10:00" (en, 24h is the norm in Senegal) */
export function formatTime(time: string | null | undefined) {
  if (!time) return '';
  return time.slice(0, 5);
}

export function toISODate(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's date in Dakar (UTC+0, no DST) as YYYY-MM-DD. */
export function todayInDakar() {
  return toISODate(new Date());
}

export function siteUrl(path = '') {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${path}`;
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
