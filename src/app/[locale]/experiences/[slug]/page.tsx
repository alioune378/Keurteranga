import { ArrowLeft, CalendarCheck, Check, Clock, Languages, MapPin, MonitorPlay, Users, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { JsonLd } from '@/components/ui/JsonLd';
import { Photo } from '@/components/ui/Photo';
import { Reveal } from '@/components/ui/Reveal';
import { Tbc } from '@/components/ui/Tbc';
import { coverOf, getExperience, getExperiences } from '@/lib/data';
import { localizedPath, pageMetadata } from '@/lib/seo';
import { formatPrice, pick, siteUrl } from '@/lib/utils';

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

export default async function ExperiencePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
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

  const facts = [
    { Icon: Clock, label: t('duration'), value: pick(e.duration, locale) },
    { Icon: Languages, label: t('languages'), value: e.languages.map((l) => languageNames[l] ?? l).join(' · ') },
    { Icon: MapPin, label: t('location'), value: pick(e.location, locale) },
    {
      Icon: Users,
      label: t('group'),
      value: e.max_participants ? t('participants', { min: e.min_participants, max: e.max_participants }) : tp('groupTbc')
    },
    { Icon: Wallet, label: t('price'), value: e.price_xof != null ? `${formatPrice(e.price_xof, locale)} ${t('perPerson')}` : tp('priceTbc') },
    { Icon: CalendarCheck, label: '', value: t('cutoff', { hours: e.booking_cutoff_hours }) }
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

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-forest-900">
        <Photo
          src={cover?.src}
          alt={pick(cover?.alt, locale) ?? title}
          illustration={cover?.illustration}
          hint={title}
          priority
          tone="green"
          className="absolute inset-0 -z-10 h-full w-full"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-900/95 via-forest-900/60 to-forest-900/30" />
        <div className="container pb-14 pt-24 md:pb-20 md:pt-40">
          <Link href="/experiences" className="inline-flex items-center gap-2 text-sm font-medium text-cream/80 hover:text-cream">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t('back')}
          </Link>
          <Reveal className="mt-6 max-w-3xl">
            <h1 className="text-display-xl text-cream">{title}</h1>
            <p className="mt-5 text-lg leading-relaxed text-cream/85 md:text-xl">{pick(e.summary, locale)}</p>
            <Link href={bookHref} className="btn-gold mt-8 px-8 py-4 text-base">
              {t('book')}
            </Link>
          </Reveal>
        </div>
      </section>

      <div className="container grid gap-12 py-16 md:py-20 lg:grid-cols-[1fr_380px] lg:gap-16">
        <div className="min-w-0 space-y-16">
          {/* Description */}
          <section>
            <p className="eyebrow">{t('about')}</p>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft md:text-xl">
              <Tbc text={pick(e.description, locale)} />
            </p>
          </section>

          {/* Gallery */}
          {gallery.length > 0 && (
            <section aria-labelledby="gallery-title">
              <h2 id="gallery-title" className="text-display-md">{t('gallery')}</h2>
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                {gallery.map((img, i) => (
                  <Reveal key={img.id} delay={i * 0.04} className={i === 0 ? 'col-span-2 row-span-2' : ''}>
                    <Photo
                      src={img.src}
                      alt={pick(img.alt, locale) ?? title}
                      illustration={img.illustration}
                      className="aspect-[4/3] h-full w-full rounded-2xl"
                      sizes="(min-width:1024px) 30vw, 50vw"
                    />
                  </Reveal>
                ))}
              </div>
            </section>
          )}

          {/* Workshop flow */}
          {steps.length > 0 && (
            <section aria-labelledby="flow-title">
              <p className="eyebrow">{t('flowEyebrow')}</p>
              <h2 id="flow-title" className="mt-4 text-display-md">{t('flowTitle')}</h2>
              <ol className="relative mt-10 space-y-8 border-l-2 border-gold-200 pl-8">
                {steps.map((s, i) => (
                  <Reveal as="li" key={s.title} delay={i * 0.05} className="relative">
                    <span className="absolute -left-[3.05rem] top-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 font-display text-cream ring-4 ring-cream">
                      {i + 1}
                    </span>
                    <h3 className="text-xl">{s.title}</h3>
                    {s.text && <p className="mt-1.5 leading-relaxed text-ink-soft">{s.text}</p>}
                  </Reveal>
                ))}
              </ol>
            </section>
          )}

          {/* Cultural presentation */}
          <section className="rounded-3xl bg-forest-800 p-8 text-cream md:p-10">
            <MonitorPlay className="h-8 w-8 text-gold-300" aria-hidden="true" />
            <h2 className="mt-4 text-display-md text-cream">{t('presentationTitle')}</h2>
            <p className="mt-3 text-lg leading-relaxed text-cream/85">{t('presentationText')}</p>
          </section>

          {/* Included */}
          {included.length > 0 && (
            <section aria-labelledby="included-title">
              <h2 id="included-title" className="text-display-md">{t('included')}</h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-soft">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-forest-600" aria-hidden="true" />
                    <Tbc text={item} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sticky booking card */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card p-7">
            <dl className="space-y-4">
              {facts.map(({ Icon, label, value }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-terracotta-500" aria-hidden="true" />
                  <div>
                    {label && <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-muted">{label}</dt>}
                    <dd className="font-medium text-ink">
                      <Tbc text={value} />
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
            <Link href={bookHref} className="btn-gold mt-7 w-full py-4 text-base">
              {t('book')}
            </Link>
            <p className="mt-3 text-center text-xs text-ink-muted">{t('noPayment')}</p>
          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-sand-200 bg-cream/95 p-3 pl-24 backdrop-blur lg:hidden">
        <Link href={bookHref} className="btn-gold w-full py-3.5">
          {t('book')}
        </Link>
      </div>
    </>
  );
}
