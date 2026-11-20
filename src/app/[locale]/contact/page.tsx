import { MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getSiteSettings } from '@/lib/studio';
import { ContactForm } from '@/components/contact/ContactForm';
import { Reveal } from '@/components/ui/Reveal';
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon, WhatsappIcon } from '@/components/ui/SocialIcons';
import { Tbc } from '@/components/ui/Tbc';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: 'contact' });
  const m = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, pathname: '/contact', title: m('contactTitle'), description: t('intro') });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const { contact: site } = await getSiteSettings();
  const t = await getTranslations('contact');
  const tp = await getTranslations('placeholder');
  const tbc = tp('tbc');

  const socials = [
    { href: site.social.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: site.social.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: site.social.linkedin, label: 'LinkedIn', Icon: LinkedinIcon },
    { href: site.social.tiktok, label: 'TikTok', Icon: TiktokIcon }
  ].filter((s) => s.href);

  const label = 'font-hand text-[1.45rem] leading-none text-clay-500';

  return (
    <>
      <section className="bg-white pb-12 pt-10 md:pb-16 md:pt-16">
        <div className="container grid items-end gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow">{t('eyebrow')}</p>
            <h1 className="mt-3 text-display-2xl">{t('title')}</h1>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft md:text-lg">{t('intro')}</p>
          </Reveal>
          {/* WhatsApp first: it is how most guests reach Kër Téranga */}
          {site.whatsapp && (
            <Reveal delay={0.08} className="lg:col-span-5">
              <a
                href={`https://wa.me/${site.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-5 rounded-[2rem] bg-[#1F8F4E] p-6 text-white shadow-lift transition hover:brightness-105 md:p-8"
              >
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <WhatsappIcon className="h-7 w-7" />
                </span>
                <span>
                  <span className="block font-display text-xl font-semibold">{t('whatsappCta')}</span>
                  {site.phoneDisplay && <span className="mt-1 block text-white/80">{site.phoneDisplay}</span>}
                </span>
              </a>
            </Reveal>
          )}
        </div>
      </section>

      <section className="bg-white pb-20 md:pb-28">
        <div className="container grid gap-10 lg:grid-cols-[1fr_1.25rem_1.3fr] lg:gap-0">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.5rem] bg-clay-50 p-5">
                <p className={label}>{t('email')}</p>
                {site.email ? <a href={`mailto:${site.email}`} className="mt-2 block break-words font-semibold text-kola-700 hover:text-clay-600">{site.email}</a> : <Tbc text={tbc} />}
              </div>
              <div className="rounded-[1.5rem] bg-clay-50 p-5">
                <p className={label}>{t('phone')}</p>
                {site.phoneDisplay && site.phoneHref ? <a href={`tel:${site.phoneHref}`} className="mt-2 block font-semibold text-kola-700 hover:text-clay-600">{site.phoneDisplay}</a> : <Tbc text={tbc} />}
              </div>
            </div>
            <div className="overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-kola-100">
              <div className="flex items-start gap-3 p-5">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-clay-500" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-kola-700">
                    {site.street ? `${site.street}, ` : ''}
                    {site.city}, {locale === 'en' ? 'Senegal' : site.country}
                  </p>
                  {!site.street && <Tbc text={tbc} className="mt-1 inline-block text-sm" />}
                </div>
              </div>
              <iframe
                title={t('mapTitle')}
                src={`https://www.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&output=embed`}
                className="h-64 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            {socials.length > 0 && (
              <div className="flex items-center gap-4 pt-2">
                <p className={label}>{t('follow')}</p>
                <div className="flex gap-2.5">
                  {socials.map(({ href, label: name, Icon }) => (
                    <a key={name} href={href!} target="_blank" rel="noopener noreferrer" aria-label={name} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-kola-50 text-kola-700 transition hover:bg-clay-500 hover:text-white">
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span aria-hidden="true" className="hidden lg:block" />

          <Reveal>
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
