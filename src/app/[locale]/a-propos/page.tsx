import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { photos, site } from '@/config/site';
import { getSiteSettings } from '@/lib/studio';
import { pick } from '@/lib/utils';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Tbc } from '@/components/ui/Tbc';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'about' });
  const m = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, pathname: '/a-propos', title: m('aboutTitle'), description: t('intro') });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  // owner-edited texts (Studio → Site & coordonnées) win over the built-in ones
  const { content } = await getSiteSettings();
  const founderName = content.founder_name?.trim() || site.founderName;
  const founderBio = pick(content.founder_bio, locale)?.trim();
  const historyText = pick(content.history, locale)?.trim();
  const t = await getTranslations('about');
  const points = t.raw('heritage.points') as string[];

  return (
    <>
      {/* Header */}
      <section className="bg-white">
        <div className="container pb-12 pt-10 md:pb-16 md:pt-16">
          <Reveal className="max-w-4xl">
            <p className="eyebrow">{t('eyebrow')}</p>
            <h1 className="mt-5 text-display-2xl">{t('title')}</h1>
            <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-ink-soft md:text-xl">{t('intro')}</p>
          </Reveal>
        </div>
        <Reveal className="container">
          <Photo
            src={photos.aboutHeritage.src}
            alt={photos.aboutHeritage.alt[locale]}
            illustration={photos.aboutHeritage.illustration}
            priority
            imgClassName="object-[50%_40%]"
            className="aspect-[3/2] w-full rounded-3xl md:aspect-[16/9]"
            sizes="(min-width:1280px) 1200px, 100vw"
          />
        </Reveal>
      </section>

      {/* Name meaning */}
      <section className="section bg-white">
        <div className="container">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Wolof</p>
            <h2 className="mt-4 text-display-lg">{t('name.title')}</h2>
          </Reveal>
          <div className="mt-10 grid border-t border-sand-200 md:grid-cols-2">
            {(['ker', 'teranga'] as const).map((k, i) => (
              <Reveal key={k} delay={i * 0.08} className={i === 0 ? 'border-b border-sand-200 py-8 md:border-b-0 md:border-r md:pr-12' : 'py-8 md:pl-12'}>
                <p className="font-display text-5xl font-semibold leading-none text-terracotta-500">{t(`name.${k}`)}</p>
                <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-soft md:text-lg">{t(`name.${k}Text`)}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-3xl border-t border-sand-200 pt-8 font-display text-xl font-semibold leading-snug text-forest-700 md:text-2xl">
              {t('name.together')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* History / mission / vision */}
      <section className="border-t border-sand-200 bg-white py-16 md:py-24">
        <div className="container grid gap-10 md:grid-cols-3 md:gap-12">
          {(['history', 'mission', 'vision'] as const).map((k, i) => (
            <Reveal key={k} delay={i * 0.06} className="rounded-3xl bg-sand-100 p-6">
              <h2 className="text-2xl">{t(`${k}.title`)}</h2>
              <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
                <Tbc text={(k === 'history' && historyText) || t(`${k}.text`)} />
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Heritage commitment */}
      <section className="section bg-forest-50/60">
        <div className="container grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading title={t('heritage.title')} text={t('heritage.text')} />
            <ul className="mt-8 border-t border-forest-700/10">
              {points.map((p, i) => (
                <Reveal as="li" key={p} delay={i * 0.05} className="flex items-start gap-3 border-b border-forest-700/10 py-4 text-[1.02rem] text-ink-soft">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-gold-500" aria-hidden="true" />
                  {p}
                </Reveal>
              ))}
            </ul>
          </div>
          <Reveal delay={0.1} className="lg:col-span-7">
            <Photo
              src={photos.aboutMarket.src}
              alt={photos.aboutMarket.alt[locale]}
              illustration={photos.aboutMarket.illustration}
              className="aspect-[3/2] w-full rounded-3xl"
              sizes="(min-width:1024px) 58vw, 100vw"
            />
          </Reveal>
        </div>
      </section>

      {/* Founder — real portrait & verified biography required */}
      <section className="section bg-white">
        <div className="container grid items-center gap-10 md:grid-cols-12 lg:gap-16">
          <Reveal className="md:col-span-5 lg:col-span-4 lg:col-start-2">
            {/* 👉 PHOTO: authentic portrait of the founder → photos.founder.src (never an illustration) */}
            <Photo src={photos.founder.src} alt={photos.founder.alt[locale]} hint={t('founder.photo')} tone="sand" className="mx-auto aspect-[4/5] w-full max-w-sm rounded-3xl" sizes="(min-width:768px) 35vw, 90vw" />
          </Reveal>
          <div className="md:col-span-7 lg:col-span-6">
            <SectionHeading eyebrow={t('founder.eyebrow')} title={t('founder.title')} />
            <Reveal delay={0.1}>
              <p className="mt-6 font-display text-2xl text-forest-700">
                {founderName ?? <Tbc text={t('founder.nameTbc')} />}
              </p>
              <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-soft">{t('founder.role')}</p>
              <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-soft">
                {/* 👉 TEXT: replace "founder.bio" in messages/fr.json & en.json with the verified biography */}
                <Tbc text={founderBio || t('founder.bio')} />
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-sand-200 bg-white">
        <div className="container flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between md:py-20">
          <h2 className="max-w-xl text-display-lg">{t('cta.title')}</h2>
          <Link href="/experiences" className="btn-gold btn-lg shrink-0">
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </>
  );
}
