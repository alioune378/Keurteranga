/**
 * Real guest reviews only. The testimonials section stays hidden on the live
 * site while this list is empty (a dashed placeholder appears in development).
 *
 * Example entry:
 * {
 *   name: 'Prénom N.',
 *   origin: { fr: 'Lyon, France', en: 'Lyon, France' },
 *   quote: { fr: '…texte de l'avis…', en: '…review text…' },
 *   date: '2026-11'
 * }
 */
export interface Testimonial {
  name: string;
  origin: { fr: string; en: string };
  quote: { fr: string; en: string };
  date?: string;
}

export const testimonials: Testimonial[] = [];
