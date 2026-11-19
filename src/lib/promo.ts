/** Partner promo codes — shared by the booking form, emails and admin (no server-only imports). */

export interface PromoDiscount {
  code: string;
  /** e.g. 10 = 10 % off */
  discount_percent: number | null;
  /** fixed amount off the total, in FCFA */
  discount_xof: number | null;
}

/** Same rule as the database: capitals, no spaces. */
export function normalizeCode(raw: string) {
  return raw.replace(/\s/g, '').toUpperCase().slice(0, 30);
}

export const CODE_RE = /^[A-Z0-9_-]{3,30}$/;

/** Total after discount (never below 0). `subtotal` = price × participants. */
export function discountedTotal(subtotal: number, d: Pick<PromoDiscount, 'discount_percent' | 'discount_xof'> | null) {
  if (!d) return subtotal;
  if (d.discount_percent) return Math.max(0, Math.round(subtotal * (1 - d.discount_percent / 100)));
  if (d.discount_xof) return Math.max(0, subtotal - d.discount_xof);
  return subtotal;
}

/** "-10 %" / "-5 000 FCFA" */
export function discountLabel(d: Pick<PromoDiscount, 'discount_percent' | 'discount_xof'> | null, locale: 'fr' | 'en' = 'fr') {
  if (!d) return '';
  if (d.discount_percent) return locale === 'fr' ? `-${d.discount_percent} %` : `-${d.discount_percent}%`;
  if (d.discount_xof) return `-${d.discount_xof.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB')} FCFA`;
  return '';
}

/** Partner types shown in the dashboard */
export const KIND_LABELS: Record<string, string> = {
  influencer: 'Influenceur·se',
  hotel: 'Hôtel',
  agency: 'Agence de voyages',
  tour_operator: 'Tour-opérateur',
  corporate: 'Entreprise',
  association: 'Association',
  other: 'Autre'
};
