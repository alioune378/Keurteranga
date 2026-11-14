import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { ExperienceCard } from '@/components/experiences/ExperienceCard';
import { Reveal } from '@/components/ui/Reveal';
import { getExperiences } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'experiences' });
  const m = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, pathname: '/experiences', title: m('experiencesTitle'), description: t('intro') });
}

export default async function ExperiencesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('experiences');
  const experiences = await getExperiences();

  return (
    <>
      <section className="border-b border-sand-200 bg-sand-100 pb-16 pt-20 md:pb-20 md:pt-24">
        <div className="container max-w-3xl text-center">
          <Reveal>
            <p className="eyebrow justify-center">{t('eyebrow')}</p>
            <h1 className="mt-5 text-display-xl">{t('title')}</h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft">{t('intro')}</p>
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
          <Reveal delay={0.12} className="flex flex-col justify-center rounded-2xl border-2 border-dashed border-sand-300 p-8 text-center">
            <p className="font-display text-2xl text-forest-800">{t('comingSoonTitle')}</p>
            <p className="mt-3 text-ink-soft">{t('comingSoonText')}</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
