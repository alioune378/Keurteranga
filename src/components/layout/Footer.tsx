import { ArrowUpRight, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { defaultContact, type ResolvedContact } from '@/lib/site-settings';
import { Logo } from '@/components/ui/Logo';
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon, WhatsappIcon } from '@/components/ui/SocialIcons';

export function Footer({ contact: site = defaultContact }: { contact?: ResolvedContact }) {
  const t = useTranslations();
  const year = new Date().getFullYear();
  const country = useLocale() === 'en' ? 'Senegal' : site.country;
  // Only verified links are shown (null = hidden)
  const socials = [
    { href: site.social.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: site.social.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: site.social.linkedin, label: 'LinkedIn', Icon: LinkedinIcon },
    { href: site.social.tiktok, label: 'TikTok', Icon: TiktokIcon }
  ].filter((s) => s.href);

  const heading = 'font-hand text-[1.6rem] font-semibold leading-none text-saffron-300';
  const link = 'text-white/75 transition-colors hover:text-white';

  return (
    <footer className="rounded-t-[2.5rem] bg-kola-800 text-white">
      {/* Closing statement */}
      <div className="border-b border-white/10">
        <div className="container flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-16">
          <p className="max-w-2xl font-hand text-[2.4rem] font-semibold leading-[1.05] text-saffron-200 md:text-[3.2rem]">
            {t('footer.statement')}
          </p>
          <Link href="/reservation" className="btn-gold btn-lg shrink-0 self-start md:self-auto">
            {t('nav.book')}
          </Link>
        </div>
      </div>

      <div className="container grid gap-8 py-10 sm:grid-cols-2 md:py-12 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr] lg:gap-12">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo light className="h-16 md:h-20" />
          <p className="mt-5 max-w-xs text-[0.95rem] leading-relaxed text-white/70">{t('footer.tagline')}</p>
          {socials.length > 0 && (
            <div className="mt-6 flex gap-2.5">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-saffron-300 hover:text-saffron-300"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          )}
        </div>

        <nav aria-label={t('footer.quickLinks')}>
          <h2 className={heading}>{t('footer.quickLinks')}</h2>
          <ul className="mt-5 space-y-2.5 text-[0.95rem]">
            <li><Link href="/" className={link}>{t('nav.home')}</Link></li>
            <li><Link href="/experiences" className={link}>{t('nav.experiences')}</Link></li>
            <li><Link href="/a-propos" className={link}>{t('nav.about')}</Link></li>
            <li><Link href="/contact" className={link}>{t('nav.contact')}</Link></li>
            <li><Link href="/reservation" className={link}>{t('nav.book')}</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className={heading}>{t('footer.contact')}</h2>
          <ul className="mt-5 space-y-2.5 text-[0.95rem]">
            {site.email && (
              <li className="flex items-start gap-3">
                <Mail className="mt-1 h-4 w-4 shrink-0 text-saffron-300" aria-hidden="true" />
                <a href={`mailto:${site.email}`} className={`${link} break-all`}>{site.email}</a>
              </li>
            )}
            {site.phoneDisplay && site.phoneHref && (
              <li className="flex items-start gap-3">
                <Phone className="mt-1 h-4 w-4 shrink-0 text-saffron-300" aria-hidden="true" />
                <a href={`tel:${site.phoneHref}`} className={link}>{site.phoneDisplay}</a>
              </li>
            )}
            {site.whatsapp && (
              <li className="flex items-start gap-3">
                <WhatsappIcon className="mt-1 h-4 w-4 shrink-0 text-saffron-300" />
                <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer" className={link}>WhatsApp</a>
              </li>
            )}
            <li className="flex items-start gap-3 text-white/75">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-saffron-300" aria-hidden="true" />
              <span>
                {site.street && <>{site.street}<br /></>}
                {site.city}, {country}
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className={heading}>{t('footer.professionals')}</h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-white/70">{t('footer.partnersText')}</p>
          <Link href={{ pathname: '/', hash: 'partenaires' }} className="mt-4 inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-saffron-300 hover:text-saffron-200">
            {t('footer.partnersLink')} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Privacy */}
      <div className="container">
        <p className="flex items-start gap-3 border-t border-white/10 py-6 text-sm leading-relaxed text-white/60">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-saffron-300" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-white/80">{t('footer.privacyTitle')}</strong> {t('footer.privacyText')}
          </span>
        </p>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-2 pb-20 pt-6 text-[0.8rem] text-white/50 sm:flex-row sm:items-center sm:justify-between md:pb-24">
          <p>© {year} Kër Téranga. {t('footer.rights')}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              {t('footer.credit')}{' '}
              <a href="https://dalaltechnologies.com" target="_blank" rel="noopener" className="font-semibold text-saffron-300 hover:text-saffron-200">
                Dalal Technologies
              </a>
            </span>
            <a href="/admin" className="hover:text-white/80">{t('footer.admin')}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
