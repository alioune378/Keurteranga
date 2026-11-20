import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { photos, site } from '@/config/site';
import { getSiteSettings } from '@/lib/studio';
import { pick } from '@/lib/utils';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';
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
      {/* Opening — words on the left, the terrace on the right */}
      <section className="bg-white pb-16 pt-10 md:pb-24 md:pt-16">
        <div className="container grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-6">
            <p className="eyebrow">{t('eyebrow')}</p>
            <h1 className="mt-3 text-display-2xl">{t('title')}</h1>
            <p className="mt-6 max-w-xl text-[1.1rem] leading-relaxed text-ink-soft md:text-xl">{t('intro')}</p>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-6">
            <Photo
              src={photos.aboutHeritage.src}
              alt={photos.aboutHeritage.alt[locale]}
              illustration={photos.aboutHeritage.illustration}
              priority
              imgClassName="object-[50%_40%]"
              className="aspect-[4/3] w-full rounded-[2rem] rounded-tr-[7rem]"
              sizes="(min-width:1024px) 50vw, 100vw"
            />
          </Reveal>
        </div>
      </section>

      {/* The name — a small glossary card */}
      <section className="bg-white pb-16 md:pb-24">
        <div className="container">
          <Reveal className="mx-auto max-w-5xl rounded-[2.25rem] bg-saffron-100/70 px-6 py-10 md:px-14 md:py-14">
            <p className="eyebrow">Wolof</p>
            <h2 className="mt-2 text-display-lg">{t('name.title')}</h2>
            <dl className="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
              {(['ker', 'teranga'] as const).map((k) => (
                <div key={k}>
                  <dt lang="wo" className="font-display text-5xl font-semibold leading-none text-clay-500 md:text-6xl">{t(`name.${k}`)}</dt>
                  <dd className="mt-4 text-[1.05rem] leading-relaxed text-ink-soft md:text-lg">{t(`name.${k}Text`)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-10 font-hand text-[1.9rem] leading-tight text-kola-700 md:text-[2.3rem]">{t('name.together')}</p>
          </Reveal>
        </div>
      </section>

      {/* Our story — told as a page of a notebook, mission & vision beside it */}
      <section className="bg-white pb-16 md:pb-24">
        <div className="container grid gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow">{t('history.title')}</p>
            <p className="mt-4 text-[1.15rem] leading-[1.8] text-ink md:text-[1.25rem]">
              <Tbc text={historyText || t('history.text')} />
            </p>
          </Reveal>
          <div className="space-y-5 lg:col-span-5">
            {(['mission', 'vision'] as const).map((k, i) => (
              <Reveal key={k} delay={0.06 * (i + 1)} className={i === 0 ? 'rounded-[1.75rem] bg-clay-50 p-6 md:p-8' : 'rounded-[1.75rem] bg-kola-800 p-6 text-white md:p-8'}>
                <h2 className={i === 0 ? 'font-hand text-[1.8rem] leading-none text-clay-500' : 'font-hand text-[1.8rem] leading-none text-saffron-300'}>
                  {t(`${k}.title`)}
                </h2>
                <p className={i === 0 ? 'mt-3 leading-relaxed text-ink-soft' : 'mt-3 leading-relaxed text-white/85'}>{t(`${k}.text`)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Heritage — round photo, the commitments as handwritten notes */}
      <section className="bg-white pb-16 md:pb-24">
        <div className="container grid items-center gap-10 md:grid-cols-2 lg:gap-20">
          <Reveal className="mx-auto w-full max-w-[28rem]">
            <Photo
              src={photos.aboutMarket.src}
              alt={photos.aboutMarket.alt[locale]}
              illustration={photos.aboutMarket.illustration}
              className="bowl w-full"
              sizes="(min-width:768px) 40vw, 90vw"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="text-display-lg">{t('heritage.title')}</h2>
            <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-soft">{t('heritage.text')}</p>
            <ul className="mt-6 space-y-3">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[1.05rem] text-ink">
                  <span aria-hidden="true" className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-clay-400" />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Founder — arched portrait, handwritten name */}
      <section className="bg-white pb-20 md:pb-28">
        <div className="container grid items-center gap-10 md:grid-cols-12 lg:gap-16">
          <Reveal className="md:col-span-5 lg:col-span-4 lg:col-start-2">
            {/* 👉 PHOTO: authentic portrait of the founder → photos.founder.src (never an illustration) */}
            <Photo src={photos.founder.src} alt={photos.founder.alt[locale]} hint={t('founder.photo')} tone="sand" className="mx-auto aspect-[4/5] w-full max-w-sm rounded-b-[2rem] rounded-t-full" sizes="(min-width:768px) 35vw, 90vw" />
          </Reveal>
          <Reveal delay={0.08} className="md:col-span-7 lg:col-span-6">
            <p className="eyebrow">{t('founder.eyebrow')}</p>
            <h2 className="mt-2 text-display-xl">{t('founder.title')}</h2>
            <p className="mt-5 font-hand text-[2.6rem] leading-none text-clay-500">
              {founderName ?? <Tbc text={t('founder.nameTbc')} />}
            </p>
            <p className="mt-5 text-[1.05rem] leading-relaxed text-ink-soft">{t('founder.role')}</p>
            <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-soft">
              {/* 👉 TEXT: replace "founder.bio" in messages/fr.json & en.json with the verified biography */}
              <Tbc text={founderBio || t('founder.bio')} />
            </p>
            <Link href="/experiences" className="btn-gold btn-lg mt-8">
              {t('cta.button')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
