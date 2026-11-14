import { ArrowRight, Check } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { photos, site, type SitePhoto } from '@/config/site';
import { testimonials } from '@/config/testimonials';
import { PartnerSection } from '@/components/booking/PartnerSection';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';
import { Tbc } from '@/components/ui/Tbc';
import { coverOf, getExperiences } from '@/lib/data';
import { formatPrice, pick } from '@/lib/utils';

export const revalidate = 300;

const accent = (chunks: ReactNode) => <em className="accent">{chunks}</em>;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const te = await getTranslations('experiences');
  const ta = await getTranslations('about');
  const tp = await getTranslations('placeholder');

  const experiences = await getExperiences();
  const featured = experiences.find((e) => e.featured) ?? experiences[0];
  const featuredCover = featured ? coverOf(featured) : null;
  const languageNames = te.raw('languageNames') as Record<string, string>;

  const P = (p: SitePhoto) => ({ src: p.src, alt: p.alt[locale], illustration: p.illustration });

  const journey = [
    { key: 'market', p: photos.storyMarket },
    { key: 'prep', p: photos.storyHands },
    { key: 'cook', p: photos.storyPot },
    { key: 'share', p: photos.tasting }
  ] as const;

  const moments = ['ingredients', 'gestures', 'history', 'sharing'] as const;
  const bookingSteps = ['date', 'party', 'confirm'] as const;

  const featuredHref = featured
    ? ({ pathname: '/experiences/[slug]', params: { slug: featured.slug } } as const)
    : ('/experiences' as const);

  return (
    <>
      {/* ───────────────────────── 1–3 · HERO ───────────────────────── */}
      <section className="bg-white">
        <div className="container grid items-center gap-8 pb-14 pt-8 md:gap-12 md:pb-20 md:pt-12 lg:grid-cols-12 lg:gap-14 lg:pb-24">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow">{t('hero.eyebrow')}</p>
            <h1 className="mt-5 text-display-2xl text-forest-700">{t.rich('hero.title', { accent })}</h1>
            <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-ink-soft md:mt-6 md:text-lg">{t('hero.subtitle')}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4 md:mt-9">
              <Link href={featured ? { pathname: '/reservation', query: { experience: featured.slug } } : '/reservation'} className="btn-gold btn-lg">
                {t('hero.ctaPrimary')}
              </Link>
              <Link href={featuredHref} className="link-arrow">
                {t('hero.ctaSecondary')} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="relative lg:col-span-7">
            {/* 👉 PHOTO: replace photos.hero (src/config/site.ts) with an authentic workshop photo */}
            <Photo {...P(photos.hero)} priority tone="green" className="aspect-[3/2] w-full rounded-sm" sizes="(min-width:1024px) 58vw, 100vw" />
            <div className="absolute -bottom-8 -left-8 hidden w-[38%] border-[6px] border-white bg-white shadow-lift xl:block">
              <Photo {...P(photos.intro)} className="aspect-[3/2] w-full" sizes="260px" />
            </div>
            <p className="mt-3 flex items-center justify-end gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              <span className="h-px w-6 bg-gold-400" aria-hidden="true" /> {t('hero.caption')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── 4 · INTRODUCTION ───────────────────────── */}
      <section className="border-y border-sand-200 bg-white">
        <div className="container py-14 md:py-20">
          <Reveal className="mx-auto max-w-4xl text-center">
            <p className="eyebrow justify-center">{t('intro.eyebrow')}</p>
            <p className="mt-6 font-display text-[1.7rem] leading-[1.25] text-forest-700 md:text-[2.4rem] md:leading-[1.2]">
              {t.rich('intro.statement', { accent })}
            </p>
          </Reveal>
          <ul className="mx-auto mt-10 grid max-w-4xl gap-px overflow-hidden rounded-sm border border-sand-200 bg-sand-200 sm:grid-cols-3 md:mt-14">
            {(['handsOn', 'languages', 'place'] as const).map((k) => (
              <li key={k} className="bg-white px-5 py-5 text-center">
                <span className="block font-display text-xl text-forest-700">{t(`intro.facts.${k}.title`)}</span>
                <span className="mt-1 block text-sm text-ink-muted">{t(`intro.facts.${k}.text`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────────────────── 5 · TERANGA STORY ───────────────────────── */}
      <section className="section bg-white">
        <div className="container grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-7">
            <Photo {...P(photos.storyBowl)} className="aspect-[3/2] w-full rounded-sm" sizes="(min-width:1024px) 58vw, 100vw" />
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="eyebrow">{t('teranga.eyebrow')}</p>
            <h2 className="mt-4 text-display-lg">{t('teranga.title')}</h2>
            <p className="mt-6 text-[1.05rem] leading-relaxed text-ink-soft">{t('teranga.text1')}</p>
            <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-soft">{t('teranga.text2')}</p>
            <figure className="mt-8 border-l-2 border-gold-400 pl-5">
              <blockquote lang="wo" className="font-display text-[1.9rem] italic leading-tight text-terracotta-500">
                Dalal ak jàmm
              </blockquote>
              <figcaption className="mt-1 text-sm text-ink-muted">{t('teranga.greeting')}</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── 6 · SIGNATURE WORKSHOP ───────────────────────── */}
      {featured && (
        <section className="bg-forest-700 text-white" aria-labelledby="workshop-title">
          <div className="container py-16 md:py-24">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-16">
              <Reveal className="lg:col-span-6">
                <p className="eyebrow eyebrow-light">{t('workshop.eyebrow')}</p>
                <h2 id="workshop-title" className="mt-4 text-display-xl text-white">
                  {pick(featured.title, locale) ?? te('title')}
                </h2>
              </Reveal>
              <Reveal delay={0.08} className="lg:col-span-6">
                <p className="text-[1.05rem] leading-relaxed text-white/80 md:text-lg">{t('workshop.lead')}</p>
              </Reveal>
            </div>

            <div className="mt-10 grid gap-10 md:mt-14 lg:grid-cols-12 lg:gap-16">
              <Reveal className="lg:col-span-7">
                <Photo
                  src={featuredCover?.src ?? photos.featured.src}
                  alt={pick(featuredCover?.alt, locale) ?? photos.featured.alt[locale]}
                  illustration={featuredCover ? featuredCover.illustration : photos.featured.illustration}
                  tone="green"
                  className="aspect-[3/2] w-full rounded-sm"
                  sizes="(min-width:1024px) 58vw, 100vw"
                />
              </Reveal>
              <div className="lg:col-span-5">
                <ol className="border-t border-white/15">
                  {moments.map((k, i) => (
                    <Reveal as="li" key={k} delay={i * 0.05} className="flex gap-5 border-b border-white/15 py-5">
                      <span className="pt-1 font-sans text-xs font-semibold tabular-nums text-gold-300">0{i + 1}</span>
                      <div>
                        <h3 className="text-[1.5rem] leading-tight text-white">{t(`workshop.moments.${k}.title`)}</h3>
                        <p className="mt-1 text-[0.95rem] leading-relaxed text-white/70">{t(`workshop.moments.${k}.text`)}</p>
                      </div>
                    </Reveal>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-8 border-t border-white/15 pt-8 md:mt-14 lg:flex-row lg:items-center lg:justify-between">
              <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4 lg:flex lg:gap-12">
                {[
                  { k: te('duration'), v: pick(featured.duration, locale) },
                  { k: te('languages'), v: featured.languages.map((l) => languageNames[l] ?? l).join(' · ') },
                  { k: te('location'), v: site.address.street ?? site.address.city },
                  { k: te('price'), v: featured.price_xof != null ? formatPrice(featured.price_xof, locale) : null }
                ].map(({ k, v }) => (
                  <div key={k}>
                    <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-gold-300">{k}</dt>
                    <dd className="mt-1 text-[0.95rem] text-white">
                      {v ?? <span className="italic text-white/60">{tp('priceTbc')}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap items-center gap-4">
                <Link href={{ pathname: '/reservation', query: { experience: featured.slug } }} className="btn-gold btn-lg">
                  {t('workshop.cta')}
                </Link>
                <Link href={featuredHref} className="btn-ghost-light btn-lg">
                  {t('workshop.details')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────── 7 · FOUNDER ───────────────────────── */}
      <section className="section bg-white" aria-labelledby="founder-title">
        <div className="container grid items-center gap-10 md:grid-cols-12 lg:gap-16">
          <Reveal className="md:col-span-5 lg:col-span-4 lg:col-start-2">
            {/* 👉 Authentic portrait required — never an illustration (src/config/site.ts → photos.founder) */}
            <Photo
              src={photos.founder.src}
              alt={photos.founder.alt[locale]}
              hint={ta('founder.photo')}
              tone="sand"
              className="mx-auto aspect-[4/5] w-full max-w-sm rounded-sm"
              sizes="(min-width:768px) 35vw, 90vw"
            />
          </Reveal>
          <Reveal delay={0.1} className="md:col-span-7 lg:col-span-6">
            <p className="eyebrow">{t('founder.eyebrow')}</p>
            <h2 id="founder-title" className="mt-4 text-display-lg">{t('founder.title')}</h2>
            <p className="mt-5 font-display text-2xl text-forest-700">
              <Tbc text={site.founderName ?? ta('founder.nameTbc')} />
            </p>
            <p className="mt-5 text-[1.05rem] leading-relaxed text-ink-soft">{t('founder.text')}</p>
            <Link href="/a-propos" className="link-arrow mt-8">
              {t('founder.cta')} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── 8 · JOURNEY GALLERY ───────────────────────── */}
      <section className="border-t border-sand-200 bg-white py-16 md:py-24 lg:py-28" aria-labelledby="journey-title">
        <div className="container">
          <Reveal className="grid gap-4 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <p className="eyebrow">{t('journey.eyebrow')}</p>
              <h2 id="journey-title" className="mt-4 text-display-lg">{t('journey.title')}</h2>
            </div>
            <p className="text-[1.05rem] leading-relaxed text-ink-soft md:col-span-5">{t('journey.text')}</p>
          </Reveal>
        </div>

        {/* mobile: swipeable row · desktop: staggered editorial grid */}
        <ol className="no-scrollbar mt-10 flex scroll-px-5 snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:container md:mt-14 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-4 md:overflow-visible md:px-8 lg:px-10">
          {journey.map(({ key, p }, i) => (
            <li key={key} className={`w-[78%] shrink-0 snap-start sm:w-[60%] md:w-auto ${i % 2 === 1 ? 'md:mt-24' : ''}`}>
              <figure>
                <Photo {...P(p)} className="aspect-[3/2] w-full rounded-sm" sizes="(min-width:768px) 45vw, 80vw" />
                <figcaption className="mt-4 flex gap-4">
                  <span className="font-display text-[2rem] leading-none text-gold-400">0{i + 1}</span>
                  <span>
                    <span className="block font-display text-[1.45rem] leading-tight text-forest-700">{t(`journey.steps.${key}.title`)}</span>
                    <span className="mt-1 block text-[0.95rem] leading-relaxed text-ink-soft">{t(`journey.steps.${key}.text`)}</span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
        <p className="container mt-8 text-xs italic text-ink-muted">{tp('illustrationNote')}</p>
      </section>

      {/* ───────────────────────── 9 · TESTIMONIALS (verified reviews only) ───────────────────────── */}
      {testimonials.length > 0 && (
        <section className="section border-t border-sand-200 bg-white">
          <div className="container">
            <p className="eyebrow">{t('testimonials.eyebrow')}</p>
            <ul className="mt-10 grid gap-10 md:grid-cols-3">
              {testimonials.map((r, i) => (
                <Reveal as="li" key={r.name + i} delay={i * 0.06} className="border-t border-gold-400 pt-6">
                  <blockquote className="font-display text-[1.45rem] leading-snug text-forest-700">“{r.quote[locale]}”</blockquote>
                  <p className="mt-5 text-sm font-semibold">{r.name}</p>
                  <p className="text-sm text-ink-muted">{r.origin[locale]}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ───────────────────────── 10 · BOOKING PREVIEW + FINAL CTA ───────────────────────── */}
      <section className="bg-forest-50/60" aria-labelledby="booking-title">
        <div className="container grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <Reveal>
              <p className="eyebrow">{t('booking.eyebrow')}</p>
              <h2 id="booking-title" className="mt-4 text-display-lg">{t('booking.title')}</h2>
            </Reveal>
            <ol className="mt-8 space-y-0 border-t border-forest-700/10">
              {bookingSteps.map((k, i) => (
                <Reveal as="li" key={k} delay={i * 0.05} className="flex gap-5 border-b border-forest-700/10 py-5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-400 font-sans text-xs font-semibold text-forest-700">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[1.4rem] leading-tight">{t(`booking.steps.${k}.title`)}</h3>
                    <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-soft">{t(`booking.steps.${k}.text`)}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>

          <Reveal delay={0.1} className="lg:col-span-6">
            <div className="overflow-hidden rounded-sm bg-white shadow-soft">
              <Photo {...P(photos.storyGuests)} className="aspect-[3/2] w-full" sizes="(min-width:1024px) 45vw, 100vw" />
              <div className="p-6 md:p-10">
                <h3 className="text-display-md">{t('final.title')}</h3>
                <p className="mt-3 text-[1.05rem] leading-relaxed text-ink-soft">{t('final.text')}</p>
                <ul className="mt-5 space-y-2 text-sm text-ink-soft">
                  {(['realtime', 'payment'] as const).map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" aria-hidden="true" /> {t(`final.points.${k}`)}
                    </li>
                  ))}
                </ul>
                <Link href="/reservation" className="btn-gold btn-lg mt-7 w-full sm:w-auto">
                  {t('final.cta')}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── 11 · PARTNERSHIPS ───────────────────────── */}
      <PartnerSection />
    </>
  );
}
