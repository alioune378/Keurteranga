import type { Metadata } from 'next';
import { site } from '@/config/site';
import { routing, type AppPathname, type Locale } from '@/i18n/routing';
import { siteUrl } from './utils';

/** Public URL path for an internal pathname, e.g. ('en', '/reservation') -> '/en/booking' */
export function localizedPath(locale: Locale, pathname: AppPathname, params: Record<string, string> = {}) {
  const entry = routing.pathnames[pathname];
  let path: string = typeof entry === 'string' ? entry : entry[locale];
  for (const [k, v] of Object.entries(params)) path = path.replace(`[${k}]`, v);
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

export function pageMetadata(opts: {
  locale: Locale;
  pathname: AppPathname;
  params?: Record<string, string>;
  title?: string;
  description: string;
  image?: string | null;
}): Metadata {
  const { locale, pathname, params, title, description, image } = opts;
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, localizedPath(l, pathname, params)])
  );
  const url = localizedPath(locale, pathname, params);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { ...languages, 'x-default': localizedPath(routing.defaultLocale, pathname, params) }
    },
    openGraph: {
      type: 'website',
      siteName: site.name,
      locale: locale === 'fr' ? 'fr_SN' : 'en_US',
      url,
      title: title ? `${title} · ${site.name}` : site.name,
      description,
      // social sharing preview built from the official logo (replace with a photo later if desired)
      images: [{ url: image || '/images/og.jpg', width: 1200, height: 630, alt: site.name }]
    },
    twitter: {
      card: 'summary_large_image',
      title: title ? `${title} · ${site.name}` : site.name,
      description
    }
  };
}

export function organizationJsonLd(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': siteUrl('/#business'),
    name: site.name,
    url: siteUrl(`/${locale}`),
    email: site.email,
    telephone: site.phoneDisplay,
    image: siteUrl('/images/og.jpg'),
    logo: siteUrl('/images/logo/logo-ker-teranga.png'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressCountry: site.address.countryCode
    },
    areaServed: 'Dakar',
    knowsLanguage: ['fr', 'en'],
    sameAs: Object.values(site.social)
  };
}
