import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { ExperienceCard } from '@/components/experiences/ExperienceCard';
import { Reveal } from '@/components/ui/Reveal';
import { getExperiences } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'experiences' });
  const m = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, pathname: '/experiences', title: m('experiencesTitle'), description: t('intro') });
}

export default async function ExperiencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('experiences');
  const experiences = await getExperiences();

  return (
    <>
      <section className="border-b border-sand-200 bg-white pb-10 pt-10 md:pb-16 md:pt-16">
        <div className="container">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{t('eyebrow')}</p>
            <h1 className="mt-5 text-display-2xl">{t('title')}</h1>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft md:text-lg">{t('intro')}</p>
          </Reveal>
        </div>
      </section>

      <section className="section">
        {/* Grid scales automatically as new experiences are published in the admin */}
        <div className="container grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {experiences.map((e, i) => (
            <Reveal key={e.id} delay={i * 0.08}>
              <ExperienceCard experience={e} locale={locale} />
            </Reveal>
          ))}
          <Reveal delay={0.12} className="flex flex-col justify-center rounded-3xl border border-dashed border-sand-300 p-8 text-center">
            <p className="font-display text-2xl text-forest-700">{t('comingSoonTitle')}</p>
            <p className="mt-3 text-ink-soft">{t('comingSoonText')}</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
