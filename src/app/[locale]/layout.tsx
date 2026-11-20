import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Caveat, Figtree } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { AnnouncementBanner } from '@/components/studio/StudioCards';
import { JsonLd } from '@/components/ui/JsonLd';
import { isLocale, routing } from '@/i18n/routing';
import { organizationJsonLd, pageMetadata } from '@/lib/seo';
import { getAnnouncements, getSiteSettings } from '@/lib/studio';
import { siteUrl } from '@/lib/utils';
import '../globals.css';

// Warm, characterful grotesque for headings + friendly humanist sans for reading
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
});

// handwritten accent — Wolof words, the steps of the afternoon, little notes
const hand = Caveat({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-hand',
  display: 'swap'
});

const sans = Figtree({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
});

// owner-managed content (banner, contact details) refreshes at least every 5 minutes,
// and immediately whenever the owner saves something in the dashboard
export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t('title'), template: '%s · Kër Téranga' },
    ...pageMetadata({ locale, pathname: '/', description: t('description') })
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const [messages, { contact }, announcements] = await Promise.all([getMessages(), getSiteSettings(), getAnnouncements()]);
  // owner-managed top banner (Studio → Communications, placement "banner")
  const banner = announcements.find((a) => a.placement === 'banner');

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable} ${hand.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {banner && <AnnouncementBanner a={banner} locale={locale} />}
          <Header whatsapp={contact.whatsapp} />
          <main id="main">{children}</main>
          <Footer contact={contact} />
          <WhatsAppButton whatsapp={contact.whatsapp} />
        </NextIntlClientProvider>
        <JsonLd data={organizationJsonLd(locale)} />
      </body>
    </html>
  );
}
