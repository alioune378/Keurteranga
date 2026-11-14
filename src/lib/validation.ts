/** Server-side validation & sanitisation helpers (never trust the browser). */

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trim, strip control characters, collapse spaces (single line), cap length. */
export function cleanLine(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Same but keeps line breaks (for messages). */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(CONTROL, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, max);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(v: string) {
  return v.length <= 200 && EMAIL_RE.test(v);
}

/** Builds "+221 77 123 45 67" from a dial code and a local number. */
export function buildPhone(dial: unknown, local: unknown): string | null {
  const d = cleanLine(dial, 6);
  const n = cleanLine(local, 24).replace(/[^\d\s()-]/g, '');
  const digits = n.replace(/\D/g, '');
  if (!/^\+\d{1,4}$/.test(d) || digits.length < 6 || digits.length > 14) return null;
  return `${d} ${n.trim().replace(/^0+(?=\d)/, '')}`.trim();
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/**
 * Anti-spam: honeypot field must be empty and the form must have been open
 * for at least `minSeconds` (bots submit instantly).
 */
export function looksLikeSpam(honeypot: unknown, startedAt: unknown, minSeconds = 3) {
  if (typeof honeypot === 'string' && honeypot.trim() !== '') return true;
  const t = Number(startedAt);
  if (!Number.isFinite(t)) return true;
  const elapsed = (Date.now() - t) / 1000;
  return elapsed < minSeconds || elapsed > 60 * 60 * 6;
}
