import 'server-only';
import { fallbackExperiences } from '@/data/experiences';
import type { Locale } from '@/i18n/routing';
import { getPublicClient } from './supabase/public';
import { coverOf } from './data-utils';
import type { Experience, ExperienceSummary } from './types';
import { pick } from './utils';

const COLUMNS = `id, slug, status, title, summary, description, location, duration, included, steps,
  languages, price_xof, min_participants, max_participants, booking_cutoff_hours, featured, sort_order,
  experience_images ( id, src, storage_path, alt, is_cover, illustration, sort_order )`;

function sortImages(e: Experience): Experience {
  e.experience_images = [...(e.experience_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return e;
}

export async function getExperiences(): Promise<Experience[]> {
  const supabase = getPublicClient();
  if (!supabase) return fallbackExperiences;

  const { data, error } = await supabase
    .from('experiences')
    .select(COLUMNS)
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[data] getExperiences', error.message);
    return [];
  }
  return ((data ?? []) as Experience[]).map(sortImages);
}

export async function getExperience(slug: string): Promise<Experience | null> {
  const supabase = getPublicClient();
  if (!supabase) return fallbackExperiences.find((e) => e.slug === slug) ?? null;

  const { data, error } = await supabase
    .from('experiences')
    .select(COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) console.error('[data] getExperience', error.message);
  return data ? sortImages(data as Experience) : null;
}

export { coverOf };

export function toSummary(e: Experience, locale: Locale): ExperienceSummary {
  const cover = coverOf(e);
  return {
    id: e.id,
    slug: e.slug,
    title: pick(e.title, locale) ?? e.slug,
    summary: pick(e.summary, locale) ?? '',
    duration: pick(e.duration, locale) ?? '',
    location: pick(e.location, locale) ?? '',
    price_xof: e.price_xof,
    min_participants: e.min_participants,
    max_participants: e.max_participants,
    languages: e.languages,
    cover: cover
      ? { src: cover.src, alt: pick(cover.alt, locale) ?? '', illustration: cover.illustration }
      : null
  };
}
