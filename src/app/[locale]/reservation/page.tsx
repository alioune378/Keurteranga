import { CalendarClock, Check } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { PartnerSection } from '@/components/booking/PartnerSection';
import { Reveal } from '@/components/ui/Reveal';
import { Photo } from '@/components/ui/Photo';
import { photos } from '@/config/site';
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
  searchParams: Promise<{ experience?: string; code?: string; promo?: string }>;
}) {
  const locale = (await params).locale as Locale;
  const { experience, code, promo } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('booking');

  const enabled = isBookingConfigured();
  const experiences = enabled ? (await getExperiences()).map((e) => toSummary(e, locale)) : [];

  return (
    <>
      <section className="bg-white pt-4 md:pt-8">
        <div className="container">
          <div className="grid gap-5 overflow-hidden rounded-4xl bg-forest-50 md:grid-cols-[1fr_auto]">
            <Reveal className="self-center p-6 md:p-10">
              <p className="eyebrow bg-white">{t('eyebrow')}</p>
              <h1 className="mt-3 text-display-xl">{t('title')}</h1>
              <p className="mt-3 max-w-xl leading-relaxed text-ink-soft md:text-lg">{t('intro')}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {(['realtime', 'languages', 'payment'] as const).map((k) => (
                  <li key={k} className="chip">
                    <Check className="h-4 w-4 text-forest-600" aria-hidden="true" /> {t(`assurance.${k}`)}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Photo
              src={photos.tasting.src}
              alt={photos.tasting.alt[locale]}
              illustration={photos.tasting.illustration}
              className="hidden min-h-[16rem] w-[22rem] md:block md:rounded-l-[3rem] lg:w-[28rem]"
              sizes="28rem"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-6 md:py-10">
        <div className="container">
          {enabled && experiences.length > 0 ? (
            <BookingWizard experiences={experiences} initialSlug={experience} initialCode={code ?? promo} />
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
