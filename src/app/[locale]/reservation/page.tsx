import { CalendarClock } from 'lucide-react';
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

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'booking' });
  const m = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, pathname: '/reservation', title: m('bookingTitle'), description: t('intro') });
}

export default async function ReservationPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ experience?: string }>;
}) {
  const { locale } = await params;
  const { experience } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('booking');

  const enabled = isBookingConfigured();
  const experiences = enabled ? (await getExperiences()).map((e) => toSummary(e, locale)) : [];

  return (
    <>
      <section className="border-b border-sand-200 bg-sand-100 pb-12 pt-16 md:pb-16 md:pt-20">
        <div className="container max-w-3xl text-center">
          <Reveal>
            <p className="eyebrow justify-center">{t('eyebrow')}</p>
            <h1 className="mt-5 text-display-xl">{t('title')}</h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft">{t('intro')}</p>
          </Reveal>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container">
          {enabled && experiences.length > 0 ? (
            <BookingWizard experiences={experiences} initialSlug={experience} />
          ) : (
            // Booking is never simulated: without a database, the flow is not offered.
            <div className="card mx-auto max-w-xl p-10 text-center">
              <CalendarClock className="mx-auto h-12 w-12 text-terracotta-500" aria-hidden="true" />
              <h2 className="mt-4 text-display-md">{t('notConfigured.title')}</h2>
              <p className="mt-3 text-ink-soft">{t('notConfigured.text')}</p>
              <Link href="/contact" className="btn-green mt-6">{t('notConfigured.cta')}</Link>
            </div>
          )}
        </div>
      </section>

      <section className="pb-24">
        <div className="container">
          <PartnerSection />
        </div>
      </section>
    </>
  );
}
