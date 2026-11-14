import { Mail, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { site } from '@/config/site';
import { Logo } from '@/components/ui/Logo';
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon, WhatsappIcon } from '@/components/ui/SocialIcons';

export function Footer() {
  const t = useTranslations();
  const year = new Date().getFullYear();
  const socials = [
    { href: site.social.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: site.social.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: site.social.linkedin, label: 'LinkedIn', Icon: LinkedinIcon },
    { href: site.social.tiktok, label: 'TikTok', Icon: TiktokIcon }
  ].filter((s) => s.href);

  return (
    <footer className="relative overflow-hidden bg-forest-900 text-cream">
      <div className="pattern-weave absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="container relative grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo light className="h-24 md:h-28" />
          <p className="mt-5 max-w-sm leading-relaxed text-cream/70">{t('footer.tagline')}</p>
          <Link href="/reservation" className="btn-gold mt-7">
            {t('nav.book')}
          </Link>
        </div>

        <div>
          <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
            {t('footer.quickLinks')}
          </h2>
          <ul className="mt-5 space-y-3 text-cream/80">
            <li><Link href="/" className="hover:text-gold-200">{t('nav.home')}</Link></li>
            <li><Link href="/a-propos" className="hover:text-gold-200">{t('nav.about')}</Link></li>
            <li><Link href="/experiences" className="hover:text-gold-200">{t('nav.experiences')}</Link></li>
            <li><Link href="/contact" className="hover:text-gold-200">{t('nav.contact')}</Link></li>
            <li><Link href="/reservation" className="hover:text-gold-200">{t('nav.book')}</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
            {t('footer.contact')}
          </h2>
          <ul className="mt-5 space-y-3 text-cream/80">
            {site.email && (
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
                <a href={`mailto:${site.email}`} className="hover:text-gold-200">{site.email}</a>
              </li>
            )}
            {site.phoneDisplay && site.phoneHref && (
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
                <a href={`tel:${site.phoneHref}`} className="hover:text-gold-200">{site.phoneDisplay}</a>
              </li>
            )}
            {site.whatsapp && (
              <li className="flex items-start gap-3">
                <WhatsappIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-gold-200">WhatsApp</a>
              </li>
            )}
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
              <span>{site.address.city}, {site.address.country}</span>
            </li>
            <li>
              <Link href="/contact" className="text-gold-300 underline-offset-4 hover:underline">{t('nav.contact')} →</Link>
            </li>
          </ul>

          {socials.length > 0 && (
          <h2 className="mt-8 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
            {t('footer.follow')}
          </h2>
          )}
          <div className="mt-4 flex gap-3">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href!}
              
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream/20 text-cream/80 transition hover:border-gold-300 hover:text-gold-300"
              >
                <Icon className="h-[18px] w-[18px]" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="relative border-t border-cream/10">
        <div className="container flex flex-col gap-2 py-6 text-sm text-cream/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Kër Téranga. {t('footer.rights')}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              {t('footer.credit')}{' '}
              <a href="https://dalaltechnologies.com" target="_blank" rel="noopener" className="font-semibold text-gold-300 hover:text-gold-200">
                Dalal Technologies
              </a>
            </span>
            <a href="/admin" className="hover:text-cream/80">{t('footer.admin')}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
