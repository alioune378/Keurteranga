import type { Experience, ExperienceImage } from './types';

/** Cover image of an experience (client- and server-safe). */
export function coverOf(e: Experience): ExperienceImage | null {
  const imgs = e.experience_images ?? [];
  return imgs.find((i) => i.is_cover) ?? imgs[0] ?? null;
}
