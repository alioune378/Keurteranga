import { Mail, MapPin, Phone } from 'lucide-react';
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

  return (
    <>
      <section className="border-b border-sand-200 bg-white pb-10 pt-10 md:pb-16 md:pt-16">
        <div className="container">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{t('eyebrow')}</p>
            <h1 className="mt-5 text-display-2xl">{t('title')}</h1>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft md:text-lg">{t('intro')}</p>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <div className="space-y-6">
            <ul className="border-t border-sand-200">
              <li className="flex items-start gap-4 border-b border-sand-200 py-5">
                <Mail className="mt-0.5 h-5 w-5 text-terracotta-500" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-muted">{t('email')}</p>
                  {site.email ? <a href={`mailto:${site.email}`} className="font-medium hover:text-forest-600">{site.email}</a> : <Tbc text={tbc} />}
                </div>
              </li>
              <li className="flex items-start gap-4 border-b border-sand-200 py-5">
                <Phone className="mt-0.5 h-5 w-5 text-terracotta-500" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-muted">{t('phone')}</p>
                  {site.phoneDisplay && site.phoneHref ? <a href={`tel:${site.phoneHref}`} className="font-medium hover:text-forest-600">{site.phoneDisplay}</a> : <Tbc text={tbc} />}
                </div>
              </li>
              <li className="flex items-start gap-4 border-b border-sand-200 py-5">
                <WhatsappIcon className="mt-0.5 h-5 w-5 text-terracotta-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-muted">{t('whatsapp')}</p>
                  {site.whatsapp ? (
                    <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn mt-2 bg-[#25D366] px-5 text-white hover:brightness-95">
                      {t('whatsappCta')}
                    </a>
                  ) : (
                    <Tbc text={tbc} />
                  )}
                </div>
              </li>
              <li className="flex items-start gap-4 border-b border-sand-200 py-5">
                <MapPin className="mt-0.5 h-5 w-5 text-terracotta-500" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-muted">{t('address')}</p>
                  <p className="font-medium">
                    {site.street ? `${site.street}, ` : ''}
                    {site.city}, {locale === 'en' ? 'Senegal' : site.country}
                  </p>
                  {!site.street && <Tbc text={tbc} className="mt-1 inline-block text-sm" />}
                </div>
              </li>
            </ul>

            {socials.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-muted">{t('follow')}</p>
                <div className="mt-3 flex gap-3">
                  {socials.map(({ href, label, Icon }) => (
                    <a key={label} href={href!} target="_blank" rel="noopener noreferrer" aria-label={label} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-forest-700/20 text-forest-700 transition hover:bg-forest-700 hover:text-white">
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-sand-200">
              <iframe
                title={t('mapTitle')}
                src={`https://www.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&output=embed`}
                className="h-72 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <Reveal>
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
