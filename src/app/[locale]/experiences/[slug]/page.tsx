import { ArrowLeft, ArrowUpRight, CalendarCheck, Check, Clock, Languages, MapPin, MessageCircle, MonitorPlay, Users, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { photos, type SitePhoto } from '@/config/site';
import { getSiteSettings } from '@/lib/studio';
import { JsonLd } from '@/components/ui/JsonLd';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';
import { Tbc } from '@/components/ui/Tbc';
import { coverOf, getExperience, getExperiences } from '@/lib/data';
import { localizedPath, pageMetadata } from '@/lib/seo';
import { cn, formatPrice, pick, siteUrl } from '@/lib/utils';

export const revalidate = 300;

export async function generateStaticParams() {
  const experiences = await getExperiences();
  return experiences.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  const e = await getExperience(slug);
  if (!e) return {};
  const cover = coverOf(e);
  return pageMetadata({
    locale,
    pathname: '/experiences/[slug]',
    params: { slug },
    title: `${pick(e.title, locale)} — Dakar`,
    description: pick(e.summary, locale) ?? '',
    image: cover?.src
  });
}

/**
 * Visuals paired with the workshop steps (by position). Temporary
 * illustrations — replace in src/config/site.ts with authentic photos.
 */
const STEP_VISUALS: Array<SitePhoto | null> = [
  null,
  null,
  photos.aboutMarket,
  photos.storyHands,
  photos.marinade,
  photos.tasting,
  null
];

const UNESCO_URL = {
  fr: 'https://ich.unesco.org/fr/RL/le-ceebu-jn-art-culinaire-du-senegal-01748',
  en: 'https://ich.unesco.org/en/RL/ceebu-jen-a-culinary-art-of-senegal-01748'
} as const;

export default async function ExperiencePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const { contact: site } = await getSiteSettings();
  const e = await getExperience(slug);
  if (!e) notFound();

  const t = await getTranslations('experiences');
  const tp = await getTranslations('placeholder');
  const title = pick(e.title, locale) ?? '';
  const images = e.experience_images ?? [];
  const cover = coverOf(e);
  const gallery = images.filter((i) => i.id !== cover?.id);
  const steps = pick(e.steps, locale) ?? [];
  const included = pick(e.included, locale) ?? [];
  const bookHref = { pathname: '/reservation' as const, query: { experience: e.slug } };
  const languageNames = t.raw('languageNames') as Record<string, string>;
  const languages = e.languages.map((l) => languageNames[l] ?? l).join(' · ');
  const price = e.price_xof != null ? `${formatPrice(e.price_xof, locale)} ${t('perPerson')}` : null;
  const group = e.max_participants ? t('participants', { min: e.min_participants, max: e.max_participants }) : null;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapQuery)}`;

  const facts = [
    { Icon: Clock, label: t('duration'), value: pick(e.duration, locale) },
    { Icon: Languages, label: t('languages'), value: languages },
    { Icon: MapPin, label: t('location'), value: pick(e.location, locale) },
    { Icon: Users, label: t('group'), value: group, tbc: tp('groupTbc') },
    { Icon: Wallet, label: t('price'), value: price, tbc: tp('priceTbc') }
  ];

  // Structured data — only verified values are included (no invented price)
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: title,
    description: pick(e.description, locale),
    url: siteUrl(localizedPath(locale, '/experiences/[slug]', { slug: e.slug })),
    image: images.map((i) => (i.src.startsWith('http') ? i.src : siteUrl(i.src))),
    touristType: ['Cultural tourism', 'Culinary tourism'],
    inLanguage: e.languages,
    provider: { '@id': siteUrl('/#business') },
    itinerary: {
      '@type': 'ItemList',
      itemListElement: steps.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.title }))
    }
  };
  if (e.price_xof != null) {
    jsonLd.offers = {
      '@type': 'Offer',
      price: e.price_xof,
      priceCurrency: 'XOF',
      availability: 'https://schema.org/InStock',
      url: siteUrl(localizedPath(locale, '/reservation'))
    };
  }

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* ───────── Hero ───────── */}
      <section className="bg-white">
        <div className="container pb-6 pt-4 md:pb-10 md:pt-8">
          <Link href="/experiences" className="inline-flex min-h-[2.75rem] items-center gap-2 text-sm font-medium text-ink-soft hover:text-forest-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t('back')}
          </Link>
          <div className="mt-4 grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
            <Reveal className="lg:col-span-5">
              <p className="eyebrow">{t('heroEyebrow')}</p>
              <h1 className="mt-4 text-display-2xl">{title}</h1>
              <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-ink-soft md:text-lg">{pick(e.summary, locale)}</p>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href={bookHref} className="btn-gold btn-lg">
                  {t('book')}
                </Link>
                <span className="text-sm text-ink-muted">{t('noPayment')}</span>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="order-first lg:order-last lg:col-span-7">
              <Photo
                src={cover?.src}
                alt={pick(cover?.alt, locale) ?? title}
                illustration={cover?.illustration}
                hint={title}
                priority
                tone="green"
                className="aspect-[3/2] w-full rounded-3xl"
                sizes="(min-width:1024px) 58vw, 100vw"
              />
            </Reveal>
          </div>
        </div>

        {/* Key facts */}
        <div className="container pb-10 md:pb-14">
          <dl className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {facts.map(({ Icon, label, value, tbc }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-2xl bg-sand-100 px-3.5 py-2.5 sm:rounded-full sm:pr-5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-terracotta-500">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 leading-tight">
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="text-sm font-semibold text-ink">
                    {value ? <Tbc text={value} /> : <span className="font-medium italic text-ink-muted">{tbc}</span>}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───────── What you'll experience ───────── */}
      <section className="bg-white pb-6 md:pb-10">
        <div className="container grid gap-8 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow">{t('about')}</p>
            <h2 className="mt-4 text-display-lg">{t('overviewTitle')}</h2>
            <p className="mt-6 text-[1.05rem] leading-relaxed text-ink-soft md:text-lg">
              <Tbc text={pick(e.description, locale)} />
            </p>
          </Reveal>
          {included.length > 0 && (
            <Reveal delay={0.1} className="lg:col-span-5">
              <div className="rounded-3xl bg-forest-50 p-6 md:p-8">
                <h3 className="text-xl">{t('included')}</h3>
                <ul className="mt-5 space-y-3.5">
                  {included.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[0.95rem] leading-relaxed">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
                      <Tbc text={item} />
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ───────── Step-by-step ───────── */}
      {steps.length > 0 && (
        <section className="bg-white py-14 md:py-20" aria-labelledby="flow-title">
          <div className="container">
            <Reveal className="max-w-2xl">
              <p className="eyebrow">{t('flowEyebrow')}</p>
              <h2 id="flow-title" className="mt-4 text-display-lg">{t('flowTitle')}</h2>
            </Reveal>

            <ol className="mt-8 space-y-6 md:mt-12 md:space-y-10">
              {steps.map((s, i) => {
                const visual = STEP_VISUALS[i];
                const num = String(i + 1).padStart(2, '0');
                if (!visual?.src) {
                  return (
                    <Reveal as="li" key={s.title} className="grid gap-3 rounded-3xl bg-sand-100 p-5 md:grid-cols-12 md:items-center md:gap-6 md:p-6">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-forest-50 text-sm font-bold text-forest-700 md:col-span-1">{num}</span>
                      <div className="md:col-span-11">
                        <h3 className="text-xl">{s.title}</h3>
                        {s.text && <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-soft">{s.text}</p>}
                      </div>
                    </Reveal>
                  );
                }
                const flip = i % 2 === 1;
                return (
                  <Reveal as="li" key={s.title} className="grid items-center gap-6 md:grid-cols-12 md:gap-10">
                    <div className={cn('md:col-span-7', flip && 'md:order-2')}>
                      <Photo
                        src={visual.src}
                        alt={visual.alt[locale]}
                        illustration={visual.illustration}
                        className="aspect-[3/2] w-full rounded-3xl"
                        sizes="(min-width:768px) 55vw, 100vw"
                      />
                    </div>
                    <div className={cn('md:col-span-5', flip && 'md:order-1')}>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-sm font-bold text-gold-600">{num}</span>
                      <h3 className="mt-3 text-2xl">{s.title}</h3>
                      {s.text && <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-soft">{s.text}</p>}
                    </div>
                  </Reveal>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* ───────── Cultural background & UNESCO ───────── */}
      <section className="bg-white pb-14 md:pb-20" aria-labelledby="heritage-title">
        <div className="container">
        <div className="grid gap-8 overflow-hidden rounded-4xl bg-forest-700 p-6 text-white md:p-10 lg:grid-cols-12 lg:items-center lg:gap-14 lg:p-14">
          <Reveal className="lg:col-span-6">
            <p className="eyebrow eyebrow-light">{t('heritage.eyebrow')}</p>
            <h2 id="heritage-title" className="mt-4 text-display-lg text-white">{t('heritage.title')}</h2>
            <p className="mt-6 text-[1.05rem] leading-relaxed text-white/80">{t('heritage.text1')}</p>
            <p className="mt-4 text-[1.05rem] leading-relaxed text-white/80">{t('heritage.text2')}</p>
            <a href={UNESCO_URL[locale]} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-300 hover:text-gold-200">
              {t('heritage.link')} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <div className="mt-8 flex gap-4 border-t border-white/15 pt-6">
              <MonitorPlay className="mt-1 h-5 w-5 shrink-0 text-gold-300" aria-hidden="true" />
              <div>
                <h3 className="text-lg text-white">{t('presentationTitle')}</h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-white/70">{t('presentationText')}</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-6">
            <Photo {...{ src: photos.aboutHeritage.src, alt: photos.aboutHeritage.alt[locale], illustration: photos.aboutHeritage.illustration }} tone="green" className="aspect-[3/2] w-full rounded-3xl rounded-tr-[4rem]" sizes="(min-width:1024px) 48vw, 100vw" />
          </Reveal>
        </div>
        </div>
      </section>

      {/* ───────── Gallery ───────── */}
      {gallery.length > 0 && (
        <section className="section bg-white" aria-labelledby="gallery-title">
          <div className="container">
            <h2 id="gallery-title" className="text-display-md">{t('gallery')}</h2>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {gallery.map((img, i) => (
                <Reveal key={img.id} delay={i * 0.03} className={i === 0 ? 'col-span-2' : ''}>
                  <Photo
                    src={img.src}
                    alt={pick(img.alt, locale) ?? title}
                    illustration={img.illustration}
                    className="aspect-[3/2] w-full rounded-3xl"
                    sizes={i === 0 ? '(min-width:768px) 66vw, 100vw' : '(min-width:768px) 33vw, 50vw'}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────── Practical information ───────── */}
      <section className="bg-white pb-14 md:pb-20" aria-labelledby="practical-title">
        <div className="container grid gap-6 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">{t('practical.eyebrow')}</p>
            <h2 id="practical-title" className="mt-4 text-display-lg">{t('practical.title')}</h2>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
            <div className="rounded-3xl bg-sand-100 p-5">
              <dt className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
                <MapPin className="h-4 w-4 text-terracotta-500" aria-hidden="true" /> {t('practical.meeting')}
              </dt>
              <dd className="mt-2">
                <Tbc text={pick(e.location, locale)} />
                <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-sm font-semibold text-forest-600 hover:text-forest-700">
                  {t('practical.map')} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </dd>
            </div>
            <div className="rounded-3xl bg-sand-100 p-5">
              <dt className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
                <Languages className="h-4 w-4 text-terracotta-500" aria-hidden="true" /> {t('languages')}
              </dt>
              <dd className="mt-2">{t('practical.languagesText', { languages })}</dd>
            </div>
            <div className="rounded-3xl bg-sand-100 p-5">
              <dt className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
                <CalendarCheck className="h-4 w-4 text-terracotta-500" aria-hidden="true" /> {t('practical.booking')}
              </dt>
              <dd className="mt-2">{t('cutoff', { hours: e.booking_cutoff_hours })}</dd>
            </div>
            <div className="rounded-3xl bg-sand-100 p-5">
              <dt className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
                <Wallet className="h-4 w-4 text-terracotta-500" aria-hidden="true" /> {t('practical.payment')}
              </dt>
              <dd className="mt-2">{t('noPayment')}</dd>
            </div>
            {(site.whatsapp || site.phoneDisplay) && (
              <div className="rounded-3xl bg-sand-100 p-5 sm:col-span-2">
                <dt className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
                  <MessageCircle className="h-4 w-4 text-terracotta-500" aria-hidden="true" /> {t('practical.questions')}
                </dt>
                <dd className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                  {site.whatsapp && (
                    <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer" className="font-medium text-forest-600 hover:text-forest-700">WhatsApp</a>
                  )}
                  {site.phoneDisplay && site.phoneHref && (
                    <a href={`tel:${site.phoneHref}`} className="font-medium text-forest-600 hover:text-forest-700">{site.phoneDisplay}</a>
                  )}
                  {site.email && (
                    <a href={`mailto:${site.email}`} className="break-all font-medium text-forest-600 hover:text-forest-700">{site.email}</a>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section className="bg-white pb-14 md:pb-20">
        <div className="container">
        <div className="flex flex-col items-start gap-5 rounded-4xl bg-forest-50 p-6 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="max-w-2xl">
            <h2 className="text-display-lg">{t('finalTitle')}</h2>
            <p className="mt-3 text-[1.05rem] text-ink-soft">{t('finalText')}</p>
          </div>
          <Link href={bookHref} className="btn-gold btn-lg shrink-0">
            {t('book')}
          </Link>
        </div>
        </div>
      </section>

      {/* ───────── Mobile sticky CTA ───────── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-sand-200 bg-white/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="container flex items-center justify-between gap-4 py-3">
          <div className="min-w-0 text-sm leading-tight">
            <span className="block truncate font-display font-semibold text-forest-700">{title}</span>
            <span className="block truncate text-ink-muted">{price ?? tp('priceTbc')}</span>
          </div>
          <Link href={bookHref} className="btn-gold shrink-0 px-5">
            {t('bookShort')}
          </Link>
        </div>
      </div>
    </>
  );
}
