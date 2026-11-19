import type { Locale } from '@/i18n/routing';

export type Localized<T = string> = Partial<Record<Locale, T>>;

export interface ExperienceStep {
  title: string;
  text: string;
}

export interface ExperienceImage {
  id: string;
  src: string;
  storage_path?: string | null;
  alt: Localized;
  is_cover: boolean;
  illustration: boolean;
  sort_order: number;
}

export type ExperienceStatus = 'draft' | 'published' | 'archived';

export interface Experience {
  id: string;
  slug: string;
  status: ExperienceStatus;
  title: Localized;
  summary: Localized;
  description: Localized;
  location: Localized;
  duration: Localized;
  included: Localized<string[]>;
  steps: Localized<ExperienceStep[]>;
  languages: string[];
  /** null = price to be confirmed */
  price_xof: number | null;
  min_participants: number;
  /** null = group size to be confirmed (session capacity applies) */
  max_participants: number | null;
  booking_cutoff_hours: number;
  featured: boolean;
  sort_order: number;
  experience_images?: ExperienceImage[];
}

/** Lightweight shape passed to client components (booking wizard). */
export interface ExperienceSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  duration: string;
  location: string;
  price_xof: number | null;
  min_participants: number;
  max_participants: number | null;
  languages: string[];
  cover: { src: string; alt: string; illustration: boolean } | null;
}

export interface AvailabilitySlot {
  id: string;
  date: string; // YYYY-MM-DD (Africa/Dakar)
  start_time: string; // HH:MM:SS
  end_time: string | null;
  capacity: number;
  /** seats still bookable (capacity minus pending requests and confirmed bookings) */
  remaining: number;
  /** seats CONFIRMED by Kër Téranga — shown publicly as "booked" */
  confirmed: number;
  status: 'open' | 'full';
  /** special price for this session (null = experience price) */
  price_xof: number | null;
  /** optional label, e.g. {"fr": "Thiéboudiène spécial"} */
  label: Localized | null;
}

export type BookingErrorCode =
  | 'NOT_ENOUGH_SPOTS'
  | 'SESSION_CLOSED'
  | 'SESSION_PAST'
  | 'DATE_BLOCKED'
  | 'INVALID_PARTICIPANTS'
  | 'INVALID_INPUT'
  | 'SESSION_NOT_FOUND'
  | 'INVALID_PROMO'
  | 'RATE_LIMITED'
  | 'NOT_CONFIGURED'
  | 'generic';

export type BookingResult =
  | { ok: true; reference: string }
  | { ok: false; error: BookingErrorCode; fields?: Record<string, string> };

export type FormState = {
  status: 'idle' | 'success' | 'error';
  error?: string;
  fields?: Record<string, string>;
};
