import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'always',
  // Internal pathname (folder name) -> public URL per locale
  pathnames: {
    '/': '/',
    '/a-propos': { fr: '/a-propos', en: '/about' },
    '/experiences': { fr: '/experiences', en: '/experiences' },
    '/experiences/[slug]': { fr: '/experiences/[slug]', en: '/experiences/[slug]' },
    '/contact': { fr: '/contact', en: '/contact' },
    '/reservation': { fr: '/reservation', en: '/booking' }
  }
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (routing.locales as readonly string[]).includes(value);
}
