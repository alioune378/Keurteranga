import { ArrowRight, CalendarDays, Clock, Languages, MapPin, PartyPopper, Users } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { heroVideo, photos, site, type SitePhoto } from '@/config/site';
import { testimonials } from '@/config/testimonials';
import { PartnerSection } from '@/components/booking/PartnerSection';
import { NextSession } from '@/components/home/NextSession';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';
import { Tbc } from '@/components/ui/Tbc';
import { AnnouncementCard, FlyerCard, OfferCard } from '@/components/studio/StudioCards';
import { coverOf, getExperiences } from '@/lib/data';
import { getAnnouncements, getHomeMedia, getOffers, getSiteSettings } from '@/lib/studio';
import { cn, formatPrice, pick } from '@/lib/utils';

export const revalidate = 300;

/**
 * Home — "An afternoon at the house".
 * The page follows one workshop as a guest lives it: a full-screen cooking film
 * with the next open date, then the afternoon told in chapters, the menu card,
 * the host, moments from past workshops and a booking "ticket".
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const te = await getTranslations('experiences');
  const ta = await getTranslations('about');
  const tp = await getTranslations('placeholder');

  const [experiences, { content, contact }, announcements, offers, flyers] = await Promise.all([
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
  const languageNames = te.raw('languageNames') as Record<string, string>;
  const languages = featured?.languages?.length
    ? featured.languages.map((l) => languageNames[l] ?? l).join(' · ')
    : t('hero.chips.languages');
  const group =
    featured?.max_participants != null
      ? te('participants', { min: featured.min_participants, max: featured.max_participants })
      : null;

  const how = [
    { key: 'date', Icon: CalendarDays },
    { key: 'party', Icon: Users },
    { key: 'confirm', Icon: PartyPopper }
  ] as const;

  const gallery = [photos.aboutHeritage, photos.storyHands, photos.hero, photos.storyBowl, photos.momentStove];

  /** handwritten step label of the afternoon */
  const Step = ({ k, light = false }: { k: 'welcome' | 'market' | 'prep' | 'cook' | 'share'; light?: boolean }) => (
    <p className={cn('font-hand text-[2rem] leading-none md:text-[2.4rem]', light ? 'text-saffron-300' : 'text-clay-500')}>{t(`day.steps.${k}`)}</p>
  );
  /** small dotted path between two chapters */
  const Path = () => <div aria-hidden="true" className="mx-auto my-10 h-14 w-0 border-l-2 border-dashed border-clay-200 md:my-14 md:h-20" />;

  return (
    <>
      {/* ───────────── HERO · the kitchen, full screen ───────────── */}
      <section className="relative -mt-16 flex min-h-[88svh] flex-col overflow-hidden bg-kola-900 md:-mt-[4.5rem] lg:min-h-[100svh]">
        <Photo {...P(photos.hero)} priority className="!absolute inset-0 h-full w-full" sizes="100vw" />
        {heroVideo.src && (
          <video
            src={heroVideo.src}
            poster={heroVideo.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-kola-900/95 via-kola-900/45 to-kola-900/50" />

        <div className="container relative mt-auto grid gap-8 pb-10 pt-28 lg:grid-cols-[1fr_22rem] lg:items-end lg:gap-12 lg:pb-16">
          <Reveal className="max-w-3xl text-white">
            <p className="font-hand text-[1.9rem] leading-none text-saffron-300 md:text-[2.3rem]">
              <span lang="wo">Dalal ak jàmm</span>
              <span className="mt-1 block font-sans text-sm font-medium tracking-wide text-white/70 sm:ml-3 sm:mt-0 sm:inline">{t('teranga.welcome')}</span>
            </p>
            <h1 className="mt-4 max-w-[14ch] text-display-hero text-white">{heroTitle}</h1>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-white/85 md:text-lg">{heroSubtitle}</p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-white/80">
              {duration && (
                <li className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-saffron-300" aria-hidden="true" />{duration}</li>
              )}
              <li className="inline-flex items-center gap-2"><Languages className="h-4 w-4 text-saffron-300" aria-hidden="true" />{t('hero.chips.languages')}</li>
              <li className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-saffron-300" aria-hidden="true" />{t('hero.chips.place')}</li>
            </ul>
          </Reveal>
          <Reveal delay={0.15} className="hidden lg:block">
            <NextSession experienceId={featured?.id ?? null} slug={featured?.slug ?? null} price={featured?.price_xof ?? null} whatsapp={contact.whatsapp} />
          </Reveal>
        </div>
      </section>

      {/* next workshop — below the film on phones and tablets */}
      <div className="container relative z-10 -mt-6 lg:hidden">
        <NextSession experienceId={featured?.id ?? null} slug={featured?.slug ?? null} price={featured?.price_xof ?? null} whatsapp={contact.whatsapp} className="mx-auto max-w-lg" />
      </div>

      {/* ───────────── NEWS · owner-managed (Studio → Communications, Offres, Affiches) ───────────── */}
      {hasNews && (
        <section className="bg-white pt-16 md:pt-20" aria-labelledby="news-title">
          <div className="container">
            <p className="eyebrow">{newsTag}</p>
            <h2 id="news-title" className="mt-2 text-display-md">{newsTitle}</h2>
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
                <h3 className="mt-10 font-display text-xl text-kola-700">{flyersTitle}</h3>
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

      {/* ───────────── THE AFTERNOON · told in chapters ───────────── */}
      <section className="bg-white pb-6 pt-20 md:pt-28" aria-labelledby="day-title">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">{t('day.tag')}</p>
            <h2 id="day-title" className="mt-2 text-display-xl">{t('day.title')}</h2>
            <p className="mx-auto mt-4 max-w-lg text-[1.05rem] leading-relaxed text-ink-soft">
              {duration ? t('day.intro', { duration }) : t('day.introNoTime')}
            </p>
          </Reveal>
        </div>

        <Path />

        {/* 1 · arrival — wide photo, text beside it */}
        <div className="container grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-7">
            <Photo {...P(photos.storyGuests)} className="aspect-[4/3] w-full rounded-[2rem] rounded-bl-[6rem]" sizes="(min-width:1024px) 58vw, 100vw" />
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-5">
            <Step k="welcome" />
            <h3 className="mt-3 text-display-lg">{t('teranga.title')}</h3>
            <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-soft">{t('teranga.text')}</p>
            <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {(['home', 'share', 'learn'] as const).map((k) => (
                <div key={k}>
                  <dt lang="wo" className="font-hand text-2xl leading-none text-kola-700">{t(`teranga.values.${k}.title`)}</dt>
                  <dd className="mt-1 text-sm text-ink-muted">{t(`teranga.values.${k}.text`)}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Path />

        {/* 2 · the ingredients — full-width image with a caption card */}
        <Reveal className="relative mx-auto max-w-[96rem] px-3 md:px-6">
          <Photo {...P(photos.storyMarket)} className="aspect-[4/3] w-full rounded-[2rem] sm:aspect-[16/9] lg:aspect-[21/9]" sizes="100vw" />
          <div className="relative mx-3 -mt-16 max-w-md rounded-[1.75rem] bg-white p-6 shadow-lift md:absolute md:bottom-8 md:left-10 md:mx-0 md:mt-0 md:p-8">
            <Step k="market" />
            <h3 className="mt-3 text-display-md">{t('moments.steps.market.title')}</h3>
            <p className="mt-2 leading-relaxed text-ink-soft">{t('moments.steps.market.text')}</p>
          </div>
        </Reveal>

        <Path />

        {/* 3 · hands in — the bowl: round photos */}
        <div className="container grid items-center gap-10 md:grid-cols-2 lg:gap-20">
          <Reveal className="order-2 md:order-1 md:pl-6 lg:pl-16">
            <Step k="prep" />
            <h3 className="mt-3 text-display-lg">{t('moments.steps.prep.title')}</h3>
            <p className="mt-4 max-w-md text-[1.05rem] leading-relaxed text-ink-soft">{t('moments.steps.prep.text')}</p>
            <p className="mt-4 max-w-md text-[1.05rem] leading-relaxed text-ink-soft">{t('preview.points.cook')}.</p>
          </Reveal>
          <Reveal delay={0.08} className="relative order-1 mx-auto w-full max-w-[30rem] md:order-2">
            <Photo {...P(photos.intro)} className="bowl w-[86%]" sizes="(min-width:768px) 40vw, 80vw" />
            <div className="absolute -bottom-2 right-0 w-[42%] rounded-full bg-white p-1.5 shadow-lift">
              <Photo {...P(photos.storyHandsSquare)} className="bowl w-full" sizes="(min-width:768px) 18vw, 36vw" />
            </div>
          </Reveal>
        </div>

        <Path />

        {/* 4 · the slow simmer — a dark band with the film */}
        <div className="mx-auto max-w-[96rem] px-3 md:px-6">
          <Reveal className="grid items-center gap-8 overflow-hidden rounded-[2.5rem] bg-kola-800 p-5 text-white md:grid-cols-2 md:gap-12 md:p-10 lg:p-14">
            <div className="md:order-2">
              <Step k="cook" light />
              <h3 className="mt-3 text-display-lg text-white">{t('moments.steps.cook.title')}</h3>
              <p className="mt-4 max-w-md text-[1.05rem] leading-relaxed text-white/80">{t('moments.steps.cook.text')}</p>
              <p className="mt-3 max-w-md text-[1.05rem] leading-relaxed text-white/80">{t('preview.points.story')}.</p>
            </div>
            {photos.storyPot.video ? (
              <video
                src={photos.storyPot.video}
                poster={photos.storyPot.src ?? undefined}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={photos.storyPot.alt[locale]}
                className="aspect-[4/3] w-full rounded-[1.75rem] object-cover md:order-1"
              />
            ) : (
              <Photo {...P(photos.storyPot)} className="aspect-[4/3] w-full rounded-[1.75rem] md:order-1" sizes="50vw" />
            )}
          </Reveal>
        </div>

        <Path />

        {/* 5 · around the bowl */}
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Step k="share" />
            <h3 className="mt-3 text-display-lg">{t('moments.steps.share.title')}</h3>
            <p className="mx-auto mt-4 max-w-lg text-[1.05rem] leading-relaxed text-ink-soft">
              {t('moments.steps.share.text')} {t('preview.points.share')}.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-3 md:mt-12 md:gap-5">
            <Reveal>
              <Photo {...P(photos.tasting)} className="aspect-[4/5] w-full rounded-[2rem] rounded-tl-[5rem] md:aspect-[4/3]" sizes="50vw" />
            </Reveal>
            <Reveal delay={0.08} className="pt-10 md:pt-16">
              <Photo {...P(photos.featured)} className="aspect-[4/5] w-full rounded-[2rem] rounded-br-[5rem] md:aspect-[4/3]" sizes="50vw" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────── ON THE MENU · the experience as a menu card ───────────── */}
      {featured && (
        <section className="bg-white py-20 md:py-28" aria-labelledby="menu-title">
          <div className="container">
            <Reveal className="relative mx-auto max-w-3xl">
              <div className="relative mx-auto -mb-20 w-36 md:-mb-24 md:w-44">
                <Photo
                  src={featuredCover?.src ?? photos.featured.src}
                  alt={pick(featuredCover?.alt, locale) ?? photos.featured.alt[locale]}
                  illustration={featuredCover ? featuredCover.illustration : photos.featured.illustration}
                  className="bowl w-full ring-8 ring-white"
                  sizes="176px"
                />
              </div>
              <div className="rounded-[2.25rem] border border-clay-200 bg-white p-2 shadow-soft">
                <div className="rounded-[1.9rem] border border-dashed border-clay-200 px-6 pb-8 pt-24 text-center md:px-14 md:pb-12 md:pt-28">
                  <p className="eyebrow">{t('menu.tag')}</p>
                  <h2 id="menu-title" className="mt-2 text-display-xl">{pick(featured.title, locale)}</h2>
                  <p className="mx-auto mt-4 max-w-lg leading-relaxed text-ink-soft">{pick(featured.summary, locale)}</p>

                  <dl className="mx-auto mt-8 max-w-md space-y-3 text-left">
                    {[
                      duration && [te('duration'), duration],
                      [te('languages'), languages],
                      group && [te('group'), group],
                      [te('price'), price ? `${price} · ${te('perPerson')}` : tp('priceTbc')]
                    ]
                      .filter((r): r is [string, string] => Boolean(r))
                      .map(([k, v]) => (
                        <div key={k} className="flex items-baseline gap-3">
                          <dt className="font-semibold text-kola-700">{k}</dt>
                          <span aria-hidden="true" className="flex-1 border-b-2 border-dotted border-kola-200" />
                          <dd className="text-right text-ink-soft">{v}</dd>
                        </div>
                      ))}
                  </dl>

                  <p className="mt-8 font-hand text-2xl text-clay-500">{te('included')}</p>
                  <ul className="mx-auto mt-2 max-w-md space-y-1.5 text-ink-soft">
                    {(['cook', 'story', 'share'] as const).map((k) => (
                      <li key={k}>{t(`preview.points.${k}`)}</li>
                    ))}
                  </ul>

                  <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                    <Link href={bookHref} className="btn-gold btn-lg">
                      {t('preview.cta')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link href={featuredHref} className="link-arrow">
                      {t('preview.details')}
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ───────────── YOUR HOST · arched portrait ───────────── */}
      <section className="bg-white pb-20 md:pb-28" aria-labelledby="host-title">
        <div className="container grid items-center gap-10 md:grid-cols-12 lg:gap-16">
          <Reveal className="md:col-span-5 lg:col-span-4 lg:col-start-2">
            {/* 👉 Authentic portrait required — never an illustration (src/config/site.ts → photos.founder) */}
            <Photo
              src={photos.founder.src}
              alt={photos.founder.alt[locale]}
              hint={ta('founder.photo')}
              tone="sand"
              className="mx-auto aspect-[4/5] w-full max-w-sm rounded-b-[2rem] rounded-t-full"
              sizes="(min-width:768px) 35vw, 90vw"
            />
          </Reveal>
          <Reveal delay={0.08} className="md:col-span-7 lg:col-span-6">
            <p className="eyebrow">{t('host.tag')}</p>
            <h2 id="host-title" className="mt-2 text-display-xl">{t('host.title')}</h2>
            <p className="mt-6 max-w-xl text-[1.1rem] leading-relaxed text-ink-soft">{t('host.text')}</p>
            <p className="mt-6 font-hand text-[2.6rem] leading-none text-clay-500">
              <Tbc text={founderName ?? ta('founder.nameTbc')} />
            </p>
            <Link href="/a-propos" className="link-arrow mt-7">
              {t('host.cta')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ───────────── AROUND THE TABLE · snapshots ───────────── */}
      <section className="overflow-hidden bg-white pb-20 md:pb-28" aria-labelledby="gallery-title">
        <div className="container">
          <Reveal>
            <p className="eyebrow">{t('gallery.tag')}</p>
            <h2 id="gallery-title" className="mt-2 text-display-lg">{t('gallery.title')}</h2>
          </Reveal>
        </div>
        <ul className="no-scrollbar mx-auto mt-10 flex w-max max-w-full snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 pt-2 md:gap-7 md:px-10">
          {gallery.map((p, i) => (
            <li
              key={(p.src ?? '') + i}
              className={cn(
                'w-[14rem] shrink-0 snap-center rounded-[1.25rem] bg-white p-2.5 pb-3 shadow-lift ring-1 ring-kola-100 md:w-[15.5rem]',
                i % 2 === 0 ? '-rotate-2' : 'rotate-2 lg:mt-8'
              )}
            >
              <Photo {...P(p)} className="aspect-[4/5] w-full rounded-[0.9rem]" sizes="(min-width:1024px) 16rem, 68vw" />
            </li>
          ))}
        </ul>
      </section>

      {/* ───────────── BOOKING · a ticket ───────────── */}
      <section className="bg-white pb-20 md:pb-28" aria-labelledby="how-title">
        <div className="container">
          <Reveal className="mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-[2rem] bg-clay-500 text-white lg:grid lg:grid-cols-[1fr_17rem]">
              <div className="p-6 md:p-10">
                <p className="font-hand text-[1.7rem] leading-none text-saffron-200">{t('ticket.tag')}</p>
                <h2 id="how-title" className="mt-2 text-display-lg text-white">{t('how.title')}</h2>
                <ol className="mt-8 grid gap-6 sm:grid-cols-3">
                  {how.map(({ key, Icon }) => (
                    <li key={key}>
                      <Icon className="h-6 w-6 text-saffron-200" aria-hidden="true" />
                      <h3 className="mt-3 font-display text-lg font-semibold text-white">{t(`how.steps.${key}.title`)}</h3>
                      <p className="mt-1 text-[0.95rem] leading-relaxed text-white/80">{t(`how.steps.${key}.text`)}</p>
                    </li>
                  ))}
                </ol>
              </div>
              {/* the stub — perforated edge with two notches */}
              <div className="relative flex flex-col justify-center gap-4 border-t-2 border-dashed border-white/35 p-6 md:p-10 lg:border-l-2 lg:border-t-0">
                <span aria-hidden="true" className="absolute -left-4 -top-4 hidden h-8 w-8 rounded-full bg-white lg:block" />
                <span aria-hidden="true" className="absolute -bottom-4 -left-4 hidden h-8 w-8 rounded-full bg-white lg:block" />
                <Link href={bookHref} className="btn btn-lg bg-white text-clay-600 hover:bg-saffron-100">
                  {t('how.cta')}
                </Link>
                <p className="text-sm leading-relaxed text-white/85">{t('how.note')}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────── TESTIMONIALS (verified reviews only) ───────────── */}
      {testimonials.length > 0 && (
        <section className="bg-white pb-20 md:pb-28">
          <div className="container">
            <p className="eyebrow">{t('testimonials.tag')}</p>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {testimonials.map((r, i) => (
                <Reveal as="li" key={r.name + i} delay={i * 0.06} className="rounded-[1.75rem] bg-saffron-100/60 p-6">
                  <blockquote className="text-[1.05rem] leading-relaxed text-ink">“{r.quote[locale]}”</blockquote>
                  <p className="mt-4 font-hand text-2xl text-clay-500">{r.name}</p>
                  <p className="text-sm text-ink-muted">{r.origin[locale]}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ───────────── PARTNERSHIPS ───────────── */}
      <PartnerSection />
    </>
  );
}
