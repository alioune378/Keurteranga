import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { photos, site } from '@/config/site';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Tbc } from '@/components/ui/Tbc';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  const m = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, pathname: '/a-propos', title: m('aboutTitle'), description: t('intro') });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const points = t.raw('heritage.points') as string[];

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden bg-forest-800 pb-20 pt-20 text-cream md:pb-28 md:pt-28">
        <div className="pattern-weave absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative max-w-4xl text-center">
          <Reveal>
            <p className="eyebrow justify-center text-gold-300">{t('eyebrow')}</p>
            <h1 className="mt-5 text-display-xl text-cream">{t('title')}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-cream/85 md:text-xl">{t('intro')}</p>
          </Reveal>
        </div>
      </section>

      {/* Name meaning */}
      <section className="section">
        <div className="container">
          <SectionHeading align="center" title={t('name.title')} />
          <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
            {(['ker', 'teranga'] as const).map((k, i) => (
              <Reveal key={k} delay={i * 0.1} className="card p-8 text-center md:p-10">
                <p className="font-display text-5xl text-terracotta-500">{t(`name.${k}`)}</p>
                <p className="mt-4 text-lg leading-relaxed text-ink-soft">{t(`name.${k}Text`)}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-10 max-w-2xl text-center font-display text-2xl leading-snug text-forest-800">
              {t('name.together')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* History / mission / vision */}
      <section className="section bg-sand-100">
        <div className="container grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <Reveal>
            <Photo
              src={photos.aboutHeritage.src}
              alt={photos.aboutHeritage.alt[locale]}
              illustration={photos.aboutHeritage.illustration}
              className="aspect-[4/5] rounded-3xl"
              sizes="(min-width:1024px) 45vw, 100vw"
            />
          </Reveal>
          <div className="space-y-12">
            {(['history', 'mission', 'vision'] as const).map((k, i) => (
              <Reveal key={k} delay={i * 0.08}>
                <h2 className="text-display-md">{t(`${k}.title`)}</h2>
                <p className="mt-4 text-lg leading-relaxed text-ink-soft">
                  <Tbc text={t(`${k}.text`)} />
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Heritage commitment */}
      <section className="section">
        <div className="container grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading title={t('heritage.title')} text={t('heritage.text')} />
            <ul className="mt-8 space-y-4">
              {points.map((p, i) => (
                <Reveal as="li" key={p} delay={i * 0.06} className="flex items-start gap-3 text-lg text-ink-soft">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-cream">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {p}
                </Reveal>
              ))}
            </ul>
          </div>
          <Reveal delay={0.1}>
            <Photo
              src={photos.aboutMarket.src}
              alt={photos.aboutMarket.alt[locale]}
              illustration={photos.aboutMarket.illustration}
              className="aspect-[4/3] rounded-3xl"
              sizes="(min-width:1024px) 50vw, 100vw"
            />
          </Reveal>
        </div>
      </section>

      {/* Founder — real portrait & verified biography required */}
      <section className="section bg-forest-900 text-cream">
        <div className="container grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal>
            {/* 👉 PHOTO: authentic portrait of the founder → photos.founder.src (never an illustration) */}
            <Photo src={photos.founder.src} alt={photos.founder.alt[locale]} hint={t('founder.photo')} tone="green" className="aspect-[4/5] rounded-3xl ring-1 ring-cream/10" sizes="(min-width:1024px) 40vw, 100vw" />
          </Reveal>
          <div>
            <SectionHeading light eyebrow={t('founder.eyebrow')} title={t('founder.title')} />
            <Reveal delay={0.1}>
              <p className="mt-6 font-display text-2xl text-gold-200">
                {site.founderName ?? <Tbc text={t('founder.nameTbc')} className="not-italic" />}
              </p>
              <p className="mt-4 text-lg leading-relaxed text-cream/85">{t('founder.role')}</p>
              <p className="mt-4 text-lg leading-relaxed text-cream/85">
                {/* 👉 TEXT: replace "founder.bio" in messages/fr.json & en.json with the verified biography */}
                <Tbc text={t('founder.bio')} className="not-italic" />
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container text-center">
          <Reveal>
            <h2 className="text-display-lg">{t('cta.title')}</h2>
            <Link href="/experiences" className="btn-green mt-8 px-8 py-4 text-base">
              {t('cta.button')}
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
