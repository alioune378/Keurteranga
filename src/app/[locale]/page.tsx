import { ArrowRight, CalendarDays, Check, Clock, Languages, MapPin, PartyPopper, Sparkles, Users } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { photos, site, type SitePhoto } from '@/config/site';
import { testimonials } from '@/config/testimonials';
import { PartnerSection } from '@/components/booking/PartnerSection';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';
import { Tbc } from '@/components/ui/Tbc';
import { AnnouncementCard, FlyerCard, OfferCard } from '@/components/studio/StudioCards';
import { coverOf, getExperiences } from '@/lib/data';
import { getAnnouncements, getHomeMedia, getOffers, getSiteSettings } from '@/lib/studio';
import { formatPrice, pick } from '@/lib/utils';

export const revalidate = 300;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const te = await getTranslations('experiences');
  const ta = await getTranslations('about');
  const tp = await getTranslations('placeholder');

  const [experiences, { content }, announcements, offers, flyers] = await Promise.all([
    getExperiences(),
    getSiteSettings(),
    getAnnouncements(),
    getOffers(),
    getHomeMedia()
  ]);
  // Owner-managed content (Studio): hero texts, news, special offers, flyers
  const heroTitle = pick(content.hero_title, locale)?.trim() || t('hero.title');
  const heroSubtitle = pick(content.hero_subtitle, locale)?.trim() || t('hero.subtitle');
  const founderName = content.founder_name?.trim() || site.founderName;
  const news = announcements.filter((a) => a.placement === 'home');
  const homeOffers = offers.filter((o) => o.show_on_home);
  const hasNews = news.length + homeOffers.length + flyers.length > 0;
  const newsTitle = locale === 'fr' ? 'Actualités & offres spéciales' : 'News & special offers';
  const newsTag = locale === 'fr' ? 'À la une' : 'Highlights';
  const flyersTitle = locale === 'fr' ? 'Nos affiches' : 'Our flyers';
  const featured = experiences.find((e) => e.featured) ?? experiences[0];
  const featuredCover = featured ? coverOf(featured) : null;

  const P = (p: SitePhoto) => ({ src: p.src, alt: p.alt[locale], illustration: p.illustration });

  const bookHref = featured ? { pathname: '/reservation' as const, query: { experience: featured.slug } } : ('/reservation' as const);
  const featuredHref = featured
    ? ({ pathname: '/experiences/[slug]', params: { slug: featured.slug } } as const)
    : ('/experiences' as const);
  const duration = featured ? pick(featured.duration, locale) : null;
  const price = featured?.price_xof != null ? formatPrice(featured.price_xof, locale) : null;

  const moments = [
    { key: 'market', p: photos.aboutMarket },
    { key: 'prep', p: photos.storyHands },
    { key: 'cook', p: photos.storyPot },
    { key: 'share', p: photos.tasting }
  ] as const;

  const how = [
    { key: 'date', Icon: CalendarDays },
    { key: 'party', Icon: Users },
    { key: 'confirm', Icon: PartyPopper }
  ] as const;

  return (
    <>
      {/* ───────────── HERO · photo mosaic ───────────── */}
      <section className="bg-white pb-10 pt-3 md:pb-16 md:pt-4">
        <div className="container">
          <div className="grid gap-3 lg:h-[34rem] lg:grid-cols-12 lg:gap-4">
            {/* main visual + copy */}
            <div className="relative lg:col-span-8 lg:overflow-hidden lg:rounded-3xl">
              {/* 👉 PHOTO: replace photos.hero (src/config/site.ts) with an authentic workshop photo */}
              <Photo {...P(photos.hero)} priority tone="green" className="aspect-[3/2] w-full rounded-3xl lg:aspect-auto lg:h-full lg:rounded-none" sizes="(min-width:1024px) 62vw, 100vw" />
              <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-forest-900/85 via-forest-900/30 to-transparent lg:block" aria-hidden="true" />
              <Reveal className="relative -mt-10 mx-2 rounded-3xl bg-white p-5 shadow-lift sm:mx-4 sm:p-7 lg:absolute lg:inset-x-0 lg:bottom-0 lg:mx-0 lg:mt-0 lg:max-w-2xl lg:rounded-none lg:bg-transparent lg:p-10 lg:shadow-none">
                <p className="eyebrow lg:bg-white/15 lg:text-gold-200">{t('hero.tag')}</p>
                <h1 className="mt-3 text-display-2xl lg:text-white">{heroTitle}</h1>
                <p className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft lg:text-lg lg:text-white/85">{heroSubtitle}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link href={bookHref} className="btn-gold btn-lg">
                    {t('hero.cta')}
                  </Link>
                  <Link href={featuredHref} className="btn-outline btn-lg lg:border-transparent lg:bg-white/15 lg:text-white lg:backdrop-blur lg:hover:bg-white lg:hover:text-forest-700">
                    {t('hero.secondary')}
                  </Link>
                </div>
              </Reveal>
            </div>
            {/* side visuals (desktop) */}
            <div className="hidden gap-4 lg:col-span-4 lg:grid lg:grid-rows-2">
              <Photo {...P(photos.storyGuests)} className="h-full rounded-3xl" sizes="33vw" />
              <Photo {...P(photos.storyMarket)} className="h-full rounded-3xl rounded-br-[4rem]" sizes="33vw" />
            </div>
          </div>

          {/* quick facts */}
          <ul className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:mt-5 md:flex-wrap md:justify-center md:overflow-visible md:px-0">
            {duration && (
              <li className="chip shrink-0"><Clock className="h-4 w-4 text-terracotta-500" aria-hidden="true" />{duration}</li>
            )}
            <li className="chip shrink-0"><Languages className="h-4 w-4 text-terracotta-500" aria-hidden="true" />{t('hero.chips.languages')}</li>
            <li className="chip shrink-0"><MapPin className="h-4 w-4 text-terracotta-500" aria-hidden="true" />{t('hero.chips.place')}</li>
            <li className="chip shrink-0"><Sparkles className="h-4 w-4 text-terracotta-500" aria-hidden="true" />{t('hero.chips.unesco')}</li>
          </ul>
        </div>
      </section>

      {/* ───────────── NEWS · owner-managed (Studio → Communications, Offres, Affiches) ───────────── */}
      {hasNews && (
        <section className="bg-white pb-14 md:pb-20" aria-labelledby="news-title">
          <div className="container">
            <p className="eyebrow">{newsTag}</p>
            <h2 id="news-title" className="mt-3 text-display-md">{newsTitle}</h2>
            {(homeOffers.length > 0 || news.length > 0) && (
              <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {homeOffers.map((o) => (
                  <li key={o.id}><OfferCard o={o} locale={locale} /></li>
                ))}
                {news.map((a) => (
                  <li key={a.id}><AnnouncementCard a={a} locale={locale} /></li>
                ))}
              </ul>
            )}
            {flyers.length > 0 && (
              <>
                <h3 className="mt-10 font-display text-xl text-forest-800">{flyersTitle}</h3>
                <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {flyers.map((m) => (
                    <li key={m.id}><FlyerCard m={m} locale={locale} /></li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      {/* ───────────── EXPERIENCE PREVIEW · listing card ───────────── */}
      {featured && (
        <section className="bg-white pb-14 md:pb-20" aria-labelledby="preview-title">
          <div className="container">
            <Reveal className="grid overflow-hidden rounded-4xl bg-forest-700 text-white md:grid-cols-2">
              <div className="relative">
                <Photo
                  src={featuredCover?.src ?? photos.featured.src}
                  alt={pick(featuredCover?.alt, locale) ?? photos.featured.alt[locale]}
                  illustration={featuredCover ? featuredCover.illustration : photos.featured.illustration}
                  tone="green"
                  className="aspect-[3/2] w-full md:aspect-auto md:h-full"
                  sizes="(min-width:768px) 50vw, 100vw"
                />
                <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-forest-700 shadow-soft">
                  {t('preview.badge')}
                </span>
              </div>
              <div className="flex flex-col p-6 md:p-10">
                <p className="eyebrow eyebrow-light self-start">{t('preview.tag')}</p>
                <h2 id="preview-title" className="mt-3 text-display-lg text-white">{pick(featured.title, locale)}</h2>
                <p className="mt-3 leading-relaxed text-white/80">{pick(featured.summary, locale)}</p>
                <ul className="mt-5 space-y-2.5">
                  {(['cook', 'story', 'share'] as const).map((k) => (
                    <li key={k} className="flex items-start gap-2.5 text-[0.98rem] text-white/90">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-400 text-forest-900">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                      {t(`preview.points.${k}`)}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-5 md:mt-auto">
                  <p className="text-sm text-white/70">
                    {price ? (
                      <><span className="font-display text-2xl font-semibold text-white">{price}</span> {te('perPerson')}</>
                    ) : (
                      <span className="italic">{tp('priceTbc')}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <Link href={featuredHref} className="text-sm font-semibold text-white underline decoration-gold-400 decoration-2 underline-offset-4">
                      {t('preview.details')}
                    </Link>
                    <Link href={bookHref} className="btn-gold">
                      {t('preview.cta')}
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ───────────── MOMENTS AT THE TABLE ───────────── */}
      <section className="bg-white pb-14 md:pb-20" aria-labelledby="moments-title">
        <div className="container">
          <Reveal className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">{t('moments.tag')}</p>
              <h2 id="moments-title" className="mt-3 text-display-lg">{t('moments.title')}</h2>
            </div>
            <p className="max-w-md text-ink-soft">{t('moments.text')}</p>
          </Reveal>
        </div>
        <ol className="no-scrollbar mt-7 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 md:container md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-8 lg:px-10">
          {moments.map(({ key, p }, i) => (
            <li key={key} className={`w-[72%] shrink-0 snap-start sm:w-[45%] md:w-auto ${i % 2 === 1 ? 'md:mt-10' : ''}`}>
              <figure>
                <div className="relative">
                  {'video' in p && p.video ? (
                    <video
                      src={p.video}
                      poster={p.src ?? undefined}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={p.alt[locale]}
                      className={`aspect-[3/2] w-full rounded-3xl object-cover ${i === 3 ? 'rounded-tr-[4rem]' : ''}`}
                    />
                  ) : (
                    <Photo {...P(p)} className={`aspect-[3/2] w-full rounded-3xl ${i === 3 ? 'rounded-tr-[4rem]' : ''}`} sizes="(min-width:768px) 25vw, 72vw" />
                  )}
                  <span className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-forest-700 shadow-soft">
                    {i + 1}
                  </span>
                </div>
                <figcaption className="mt-3">
                  <span className="block font-display text-lg font-semibold text-forest-700">{t(`moments.steps.${key}.title`)}</span>
                  <span className="mt-0.5 block text-[0.95rem] leading-relaxed text-ink-soft">{t(`moments.steps.${key}.text`)}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────────── TERANGA · organic composition ───────────── */}
      <section className="bg-white pb-14 md:pb-20">
        <div className="container grid items-center gap-8 md:grid-cols-2 lg:gap-16">
          <Reveal className="relative pb-10 pr-10 sm:pb-14 sm:pr-16">
            <Photo {...P(photos.storyBowl)} className="aspect-[3/2] w-full rounded-[2rem] rounded-tl-[5rem]" sizes="(min-width:768px) 45vw, 90vw" />
            <div className="absolute bottom-0 right-0 w-[48%] rounded-[1.75rem] border-[5px] border-white bg-white shadow-lift">
              <Photo {...P(photos.intro)} className="aspect-[3/2] w-full rounded-[1.4rem]" sizes="(min-width:768px) 22vw, 45vw" />
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="eyebrow">{t('teranga.tag')}</p>
            <h2 className="mt-3 text-display-lg">{t('teranga.title')}</h2>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">{t('teranga.text')}</p>
            <p className="mt-4 inline-flex flex-wrap items-baseline gap-x-2 rounded-2xl bg-terracotta-100/60 px-4 py-2.5 text-terracotta-700">
              <span lang="wo" className="font-display text-lg font-semibold">Dalal ak jàmm</span>
              <span className="text-sm">{t('teranga.welcome')}</span>
            </p>
            <ul className="mt-6 grid grid-cols-3 gap-2">
              {(['home', 'share', 'learn'] as const).map((k) => (
                <li key={k} className="rounded-2xl bg-forest-50 px-2 py-3 text-center">
                  <span className="block font-display text-[1rem] font-semibold text-forest-700">{t(`teranga.values.${k}.title`)}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{t(`teranga.values.${k}.text`)}</span>
                </li>
              ))}
            </ul>
            <Link href="/a-propos" className="link-arrow mt-6">
              {t('teranga.cta')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ───────────── HOW IT WORKS · booking preview ───────────── */}
      <section className="bg-white pb-14 md:pb-20" aria-labelledby="how-title">
        <div className="container">
          <div className="rounded-4xl bg-forest-50 px-4 py-10 sm:px-6 md:px-12 md:py-14">
            <Reveal className="text-center">
              <p className="eyebrow bg-white">{t('how.tag')}</p>
              <h2 id="how-title" className="mx-auto mt-3 max-w-xl text-display-lg">{t('how.title')}</h2>
            </Reveal>
            <ol className="mt-8 grid gap-3 md:grid-cols-3 md:gap-5">
              {how.map(({ key, Icon }, i) => (
                <Reveal as="li" key={key} delay={i * 0.06} className="flex gap-4 rounded-3xl bg-white p-5 md:flex-col md:p-6">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-100 text-gold-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg">{t(`how.steps.${key}.title`)}</h3>
                    <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-soft">{t(`how.steps.${key}.text`)}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              <Link href={bookHref} className="btn-green btn-lg">
                {t('how.cta')}
              </Link>
              <p className="text-sm text-ink-muted">{t('how.note')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── YOUR HOST ───────────── */}
      <section className="bg-white pb-14 md:pb-20" aria-labelledby="host-title">
        <div className="container">
          <Reveal className="flex flex-col items-center gap-6 rounded-4xl border border-sand-200 p-6 text-center md:flex-row md:gap-10 md:p-10 md:text-left">
            {/* 👉 Authentic portrait required — never an illustration (src/config/site.ts → photos.founder) */}
            <Photo
              src={photos.founder.src}
              alt={photos.founder.alt[locale]}
              hint={ta('founder.photo')}
              tone="sand"
              className="aspect-square w-40 shrink-0 rounded-full md:w-48"
              sizes="192px"
            />
            <div>
              <p className="eyebrow">{t('host.tag')}</p>
              <h2 id="host-title" className="mt-3 text-display-md">{t('host.title')}</h2>
              <p className="mt-2 font-semibold text-forest-700">
                <Tbc text={founderName ?? ta('founder.nameTbc')} />
              </p>
              <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{t('host.text')}</p>
              <Link href="/a-propos" className="link-arrow mt-4">
                {t('host.cta')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────── TESTIMONIALS (verified reviews only) ───────────── */}
      {testimonials.length > 0 && (
        <section className="bg-white pb-14 md:pb-20">
          <div className="container">
            <p className="eyebrow">{t('testimonials.tag')}</p>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {testimonials.map((r, i) => (
                <Reveal as="li" key={r.name + i} delay={i * 0.06} className="rounded-3xl bg-sand-100 p-6">
                  <blockquote className="text-[1.05rem] leading-relaxed text-ink">“{r.quote[locale]}”</blockquote>
                  <p className="mt-4 text-sm font-semibold text-forest-700">{r.name}</p>
                  <p className="text-sm text-ink-muted">{r.origin[locale]}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ───────────── FINAL CTA · photo banner ───────────── */}
      <section className="bg-white pb-14 md:pb-20">
        <div className="container">
          <Reveal className="relative overflow-hidden rounded-4xl bg-forest-700 md:flex md:min-h-[26rem] md:items-center md:rounded-tr-[5rem]">
            <Photo {...P(photos.aboutHeritage)} className="aspect-[3/2] w-full md:absolute md:inset-y-0 md:right-0 md:aspect-auto md:h-full md:w-[52%]" sizes="(min-width:768px) 52vw, 100vw" />
            <div className="relative p-6 md:w-[48%] md:p-12">
              <h2 className="text-display-lg text-white">{t('final.title')}</h2>
              <p className="mt-3 text-white/80">{t('final.text')}</p>
              <Link href={bookHref} className="btn-gold btn-lg mt-6">
                {t('final.cta')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────── PARTNERSHIPS ───────────── */}
      <PartnerSection />
    </>
  );
}
