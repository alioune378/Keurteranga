import type { MetadataRoute } from 'next';
import { routing, type AppPathname } from '@/i18n/routing';
import { getExperiences } from '@/lib/data';
import { localizedPath } from '@/lib/seo';
import { siteUrl } from '@/lib/utils';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: Array<{ path: AppPathname; params?: Record<string, string>; priority: number }> = [
    { path: '/', priority: 1 },
    { path: '/experiences', priority: 0.9 },
    { path: '/reservation', priority: 0.9 },
    { path: '/a-propos', priority: 0.6 },
    { path: '/contact', priority: 0.6 }
  ];
  for (const e of await getExperiences()) {
    pages.push({ path: '/experiences/[slug]', params: { slug: e.slug }, priority: 0.95 });
  }

  return pages.flatMap(({ path, params, priority }) =>
    routing.locales.map((locale) => ({
      url: siteUrl(localizedPath(locale, path, params)),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, siteUrl(localizedPath(l, path, params))]))
      }
    }))
  );
}
