import { CalendarClock, Check } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { PartnerSection } from '@/components/booking/PartnerSection';
import { Reveal } from '@/components/ui/Reveal';
import { getExperiences, toSummary } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';
import { isBookingConfigured } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'booking' });
  const m = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, pathname: '/reservation', title: m('bookingTitle'), description: t('intro') });
}

export default async function ReservationPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ experience?: string }>;
}) {
  const locale = (await params).locale as Locale;
  const { experience } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('booking');

  const enabled = isBookingConfigured();
  const experiences = enabled ? (await getExperiences()).map((e) => toSummary(e, locale)) : [];

  return (
    <>
      <section className="border-b border-sand-200 bg-white pb-8 pt-10 md:pb-12 md:pt-16">
        <div className="container">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{t('eyebrow')}</p>
            <h1 className="mt-4 text-display-xl">{t('title')}</h1>
            <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft md:text-lg">{t('intro')}</p>
          </Reveal>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
            {(['realtime', 'languages', 'payment'] as const).map((k) => (
              <li key={k} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-gold-500" aria-hidden="true" /> {t(`assurance.${k}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white py-8 md:py-14">
        <div className="container">
          {enabled && experiences.length > 0 ? (
            <BookingWizard experiences={experiences} initialSlug={experience} />
          ) : (
            // Booking is never simulated: without a database, the flow is not offered.
            <div className="card mx-auto max-w-xl p-8 text-center md:p-10">
              <CalendarClock className="mx-auto h-10 w-10 text-terracotta-500" aria-hidden="true" />
              <h2 className="mt-4 text-display-md">{t('notConfigured.title')}</h2>
              <p className="mt-3 text-ink-soft">{t('notConfigured.text')}</p>
              <Link href="/contact" className="btn-green mt-6">{t('notConfigured.cta')}</Link>
            </div>
          )}
        </div>
      </section>

      <PartnerSection className="mt-8 md:mt-12" />
    </>
  );
}
