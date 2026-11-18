import { site } from '@/config/site';
import type { Localized } from './types';

/**
 * Website content & business information edited by the owner in
 * Studio → "Site & coordonnées". Every field is optional: when empty, the
 * site keeps the built-in value from src/config/site.ts / messages/*.json.
 * (Pure functions — safe to import from client and server code.)
 */
export interface SiteSettingsRow {
  contact?: {
    email?: string;
    phone?: string; // as displayed, e.g. "+221 77 146 27 18"
    whatsapp?: string; // any format, digits are kept
    street?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
  } | null;
  content?: {
    hero_title?: Localized;
    hero_subtitle?: Localized;
    founder_name?: string;
    founder_bio?: Localized;
    history?: Localized;
  } | null;
}

export interface ResolvedContact {
  email: string | null;
  phoneDisplay: string | null;
  phoneHref: string | null;
  whatsapp: string | null; // digits only
  street: string | null;
  city: string;
  country: string;
  mapQuery: string;
  social: { instagram: string | null; facebook: string | null; linkedin: string | null; tiktok: string | null };
}

const v = (s: string | undefined | null) => (typeof s === 'string' && s.trim() ? s.trim() : null);

export function resolveContact(row: SiteSettingsRow | null | undefined): ResolvedContact {
  const c = row?.contact ?? {};
  const phone = v(c.phone);
  const wa = v(c.whatsapp);
  const street = v(c.street) ?? site.address.street;
  return {
    email: v(c.email) ?? site.email,
    phoneDisplay: phone ?? site.phoneDisplay,
    phoneHref: phone ? `+${phone.replace(/\D/g, '')}` : site.phoneHref,
    whatsapp: wa ? wa.replace(/\D/g, '') || null : site.whatsapp,
    street,
    city: site.address.city,
    country: site.address.country,
    mapQuery: street ? `${street}, ${site.address.city}, ${site.address.country}` : site.mapQuery,
    social: {
      instagram: v(c.instagram) ?? site.social.instagram,
      facebook: v(c.facebook) ?? site.social.facebook,
      linkedin: v(c.linkedin) ?? site.social.linkedin,
      tiktok: v(c.tiktok) ?? site.social.tiktok
    }
  };
}

/** The default contact (no dashboard overrides) — used when the DB is not configured. */
export const defaultContact = resolveContact(null);
