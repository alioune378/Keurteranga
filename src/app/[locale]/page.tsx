import { ArrowRight, BookOpen, HandHeart, Languages, Leaf, Presentation, Quote, Sparkles, UtensilsCrossed, Users } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { photos, type SitePhoto } from '@/config/site';
import { testimonials } from '@/config/testimonials';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { coverOf, getExperiences } from '@/lib/data';
import { formatPrice, pick } from '@/lib/utils';

export const revalidate = 300;

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const te = await getTranslations('experiences');
  const tp = await getTranslations('placeholder');

  const experiences = await getExperiences();
  const featured = experiences.find((e) => e.featured) ?? experiences[0];
  const featuredCover = featured ? coverOf(featured) : null;

  const P = (p: SitePhoto) => ({ src: p.src, alt: p.alt[locale], illustration: p.illustration });

  const highlights = [
    { key: 'gastronomy', Icon: UtensilsCrossed },
    { key: 'traditions', Icon: BookOpen },
    { key: 'teranga', Icon: HandHeart },
    { key: 'transmission', Icon: Sparkles }
  ] as const;

  const trust = [
    { key: 'smallGroups', Icon: Users },
    { key: 'languages', Icon: Languages },
    { key: 'market', Icon: Leaf },
    { key: 'ambassador', Icon: Presentation }
  ] as const;

  const story = [
    { p: photos.storyMarket, className: 'col-span-2 row-span-2 aspect-square md:aspect-auto', tone: 'terracotta' as const },
    { p: photos.storyHands, className: 'aspect-square', tone: 'sand' as const },
    { p: photos.storyPot, className: 'aspect-square', tone: 'gold' as const },
    { p: photos.storyDetail, className: 'aspect-square', tone: 'green' as const },
    { p: photos.storyBowl, className: 'aspect-square', tone: 'sand' as const },
    { p: photos.storyGuests, className: 'col-span-2 aspect-[2/1]', tone: 'terracotta' as const }
  ];

  return (
    <>
      {/* ─────────── HERO ─────────── */}
      <section className="relative isolate min-h-[88svh] overflow-hidden bg-forest-900">
        {/* 👉 PHOTO: replace photos.hero (src/config/site.ts) with an authentic wide photo */}
        <Photo {...P(photos.hero)} tone="green" priority sizes="100vw" className="absolute inset-0 -z-10 h-full w-full" imgClassName="scale-105" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-900/95 via-forest-900/55 to-forest-900/25" />
        <div className="container flex min-h-[88svh] flex-col justify-end pb-16 pt-32 md:pb-24">
          <Reveal className="max-w-3xl">
            <p className="eyebrow text-gold-300">{t('hero.eyebrow')}</p>
            <h1 className="mt-5 text-display-xl text-cream">{t('hero.title')}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/85 md:text-xl">{t('hero.subtitle')}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/reservation" className="btn-gold px-7 py-4 text-base">
                {t('hero.ctaPrimary')}
              </Link>
              {featured && (
                <Link href={{ pathname: '/experiences/[slug]', params: { slug: featured.slug } }} className="btn-ghost-light px-7 py-4 text-base">
                  {t('hero.ctaSecondary')}
                </Link>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── TRUST STRIP ─────────── */}
      <section aria-label="Kër Téranga" className="border-b border-sand-200 bg-white">
        <ul className="container grid grid-cols-2 gap-6 py-8 md:grid-cols-4 md:py-10">
          {trust.map(({ key, Icon }, i) => (
            <Reveal as="li" key={key} delay={i * 0.06} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold text-forest-800">{t(`trust.${key}`)}</span>
                <span className="block text-sm text-ink-soft">{t(`trust.${key}Text`)}</span>
              </span>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ─────────── INTRO ─────────── */}
      <section className="section">
        <div className="container grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal className="relative">
            <Photo {...P(photos.intro)} className="aspect-[4/5] rounded-3xl" sizes="(min-width:1024px) 50vw, 100vw" />
            <div className="absolute -bottom-6 -right-4 hidden w-48 rounded-2xl bg-forest-700 p-5 text-cream shadow-lift md:block">
              <p className="font-display text-3xl text-gold-300">Teranga</p>
              <p className="mt-1 text-sm text-cream/80">{t('highlights.teranga.text')}</p>
            </div>
          </Reveal>
          <div>
            <SectionHeading eyebrow={t('intro.eyebrow')} title={t('intro.title')} />
            <Reveal delay={0.1}>
              <p className="mt-6 text-lg leading-relaxed text-ink-soft">{t('intro.text1')}</p>
              <p className="mt-4 text-lg leading-relaxed text-ink-soft">{t('intro.text2')}</p>
              <Link href="/a-propos" className="mt-8 inline-flex items-center gap-2 font-semibold text-forest-700 hover:gap-3 hover:text-forest-900">
                {t('intro.cta')} <ArrowRight className="h-4 w-4 transition-all" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─────────── FEATURED EXPERIENCE ─────────── */}
      {featured && (
        <section className="relative overflow-hidden bg-forest-800 text-cream">
          <div className="pattern-weave absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="container relative grid items-center gap-12 py-20 md:py-28 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div>
              <SectionHeading light eyebrow={t('featured.eyebrow')} title={pick(featured.title, locale) ?? t('featured.title')} text={t('featured.text')} />
              <Reveal delay={0.1}>
                <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-cream/15 py-6">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.15em] text-gold-300">{te('duration')}</dt>
                    <dd className="mt-1 font-display text-xl">{pick(featured.duration, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.15em] text-gold-300">{te('languages')}</dt>
                    <dd className="mt-1 font-display text-xl">{featured.languages.map((l) => l.toUpperCase()).join(' · ')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.15em] text-gold-300">{te('price')}</dt>
                    <dd className="mt-1 font-display text-xl">
                      {featured.price_xof != null ? formatPrice(featured.price_xof, locale) : <span className="text-base italic text-cream/70">{tp('priceTbc')}</span>}
                    </dd>
                  </div>
                </dl>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={{ pathname: '/reservation', query: { experience: featured.slug } }} className="btn-gold px-7 py-4 text-base">
                    {t('featured.cta')}
                  </Link>
                  <Link href={{ pathname: '/experiences/[slug]', params: { slug: featured.slug } }} className="btn-ghost-light px-7 py-4 text-base">
                    {t('featured.details')}
                  </Link>
                </div>
              </Reveal>
            </div>
            <Reveal delay={0.15} className="relative">
              <Photo
                src={featuredCover?.src ?? photos.featured.src}
                alt={pick(featuredCover?.alt, locale) ?? photos.featured.alt[locale]}
                illustration={featuredCover ? featuredCover.illustration : photos.featured.illustration}
                tone="gold"
                className="aspect-square rounded-[2.5rem] shadow-lift"
                sizes="(min-width:1024px) 45vw, 100vw"
              />
              <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full border-2 border-gold-400/60 md:-left-8 md:-top-8 md:h-32 md:w-32" aria-hidden="true" />
            </Reveal>
          </div>
        </section>
      )}

      {/* ─────────── HIGHLIGHTS ─────────── */}
      <section className="section">
        <div className="container">
          <SectionHeading align="center" eyebrow={t('highlights.eyebrow')} title={t('highlights.title')} />
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map(({ key, Icon }, i) => (
              <Reveal as="li" key={key} delay={i * 0.08} className="card p-7 transition duration-500 hover:-translate-y-1 hover:shadow-lift">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-100 text-gold-600">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl">{t(`highlights.${key}.title`)}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{t(`highlights.${key}.text`)}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ─────────── VISUAL STORY ─────────── */}
      <section className="section bg-sand-100 pt-20 md:pt-24">
        <div className="container">
          <SectionHeading eyebrow={t('story.eyebrow')} title={t('story.title')} text={t('story.text')} />
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {story.map(({ p, className, tone }, i) => (
              <Reveal key={p.src ?? i} delay={i * 0.05} className={className}>
                <Photo {...P(p)} tone={tone} className="h-full min-h-40 w-full rounded-2xl" sizes="(min-width:768px) 25vw, 50vw" />
              </Reveal>
            ))}
          </div>
          <p className="mt-5 text-sm italic text-ink-muted">{tp('illustrationNote')}</p>
        </div>
      </section>

      {/* ─────────── TESTIMONIALS — real reviews only (hidden when empty in production) ─────────── */}
      {(testimonials.length > 0 || process.env.NODE_ENV !== 'production') && (
        <section className="section">
          <div className="container">
            <SectionHeading align="center" eyebrow={t('testimonials.eyebrow')} title={t('testimonials.title')} />
            {testimonials.length > 0 ? (
              <ul className="mt-14 grid gap-6 md:grid-cols-3">
                {testimonials.map((r, i) => (
                  <Reveal as="li" key={r.name + i} delay={i * 0.08} className="card relative p-8">
                    <Quote className="h-8 w-8 text-gold-400" aria-hidden="true" />
                    <blockquote className="mt-4 font-display text-lg leading-relaxed text-forest-800">“{r.quote[locale]}”</blockquote>
                    <p className="mt-6 font-semibold">{r.name}</p>
                    <p className="text-sm text-ink-muted">{r.origin[locale]}</p>
                  </Reveal>
                ))}
              </ul>
            ) : (
              <p className="mx-auto mt-10 max-w-xl rounded-2xl border-2 border-dashed border-sand-300 p-8 text-center text-ink-muted">
                {t('testimonials.placeholder')}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ─────────── FINAL CTA ─────────── */}
      <section className="pb-24 pt-4">
        <div className="container">
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-terracotta-500 px-6 py-16 text-center text-cream md:px-16 md:py-20">
            <div className="pattern-weave absolute inset-0 opacity-40" aria-hidden="true" />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-display-lg text-cream">{t('final.title')}</h2>
              <p className="mt-5 text-lg text-cream/90">{t('final.text')}</p>
              <Link href="/reservation" className="btn mt-9 bg-cream px-8 py-4 text-base text-forest-900 hover:-translate-y-0.5 hover:bg-white hover:shadow-lift">
                {t('final.cta')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
