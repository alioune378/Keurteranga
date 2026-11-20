import { CalendarDays, FileText, Megaphone, Tag } from 'lucide-react';
import type { Locale } from '@/i18n/routing';
import type { Announcement, MediaItem, Offer } from '@/lib/studio';
import { cn, formatDate, formatPrice, pick } from '@/lib/utils';

/**
 * Cards for owner-managed content. The SAME components render on the public
 * website and in the dashboard preview, so "Aperçu" is exactly what visitors see.
 * No hooks / no next-intl: usable in any server component.
 */

const L = {
  fr: { until: "Jusqu'au", from: 'À partir du', book: 'Réserver', code: 'Code', pdf: "Voir l'affiche (PDF)", open: "Voir l'affiche", off: 'de réduction', special: 'Prix spécial', event: 'Le' },
  en: { until: 'Until', from: 'From', book: 'Book now', code: 'Code', pdf: 'View flyer (PDF)', open: 'View flyer', off: 'off', special: 'Special price', event: 'On' }
} as const;

export const bookingPath = (locale: Locale, slug?: string | null) =>
  `/${locale}/${locale === 'fr' ? 'reservation' : 'booking'}${slug ? `?experience=${encodeURIComponent(slug)}` : ''}`;

const isPdf = (url: string | null | undefined, mime?: string) => mime === 'application/pdf' || !!url?.toLowerCase().endsWith('.pdf');

function short(iso: string, locale: Locale) {
  return formatDate(iso, locale, { weekday: undefined, year: undefined });
}

export function AnnouncementBanner({ a, locale }: { a: Announcement; locale: Locale }) {
  const title = pick(a.title, locale);
  const cta = pick(a.cta_label, locale);
  if (!title) return null;
  return (
    <div className="bg-kola-700 text-cream">
      <div className="container flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-sm">
        <Megaphone className="h-4 w-4 shrink-0 text-saffron-300" aria-hidden="true" />
        <span className="font-medium">{title}</span>
        {a.cta_url && (
          <a href={a.cta_url} className="font-semibold text-saffron-300 underline underline-offset-2 hover:text-saffron-200">
            {cta || L[locale].book} →
          </a>
        )}
      </div>
    </div>
  );
}

export function AnnouncementCard({ a, locale }: { a: Announcement; locale: Locale }) {
  const t = L[locale];
  const title = pick(a.title, locale);
  const body = pick(a.body, locale);
  const cta = pick(a.cta_label, locale);
  return (
    <article className="card flex h-full flex-col overflow-hidden">
      {a.image_url && !isPdf(a.image_url) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.image_url} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
      )}
      <div className="flex flex-1 flex-col p-5">
        {a.event_date && (
          <p className="eyebrow flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{t.event} {short(a.event_date, locale)}</p>
        )}
        <h3 className="mt-2 font-display text-xl text-kola-800">{title || '—'}</h3>
        {body && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{body}</p>}
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {a.cta_url && <a href={a.cta_url} className="btn-green px-5 py-2 text-sm">{cta || t.book}</a>}
          {a.image_url && isPdf(a.image_url) && (
            <a href={a.image_url} target="_blank" rel="noopener noreferrer" className="btn-outline px-5 py-2 text-sm">
              <FileText className="h-4 w-4" aria-hidden="true" /> {t.pdf}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function OfferCard({ o, locale }: { o: Offer; locale: Locale }) {
  const t = L[locale];
  const title = pick(o.title, locale);
  const desc = pick(o.description, locale);
  const base = o.experiences?.price_xof ?? null;
  const badge =
    o.offer_price_xof != null
      ? `${t.special} : ${formatPrice(o.offer_price_xof, locale)}`
      : o.discount_percent != null
        ? `-${o.discount_percent} % ${t.off}`
        : null;
  return (
    <article className="card relative flex h-full flex-col overflow-hidden ring-1 ring-saffron-300">
      {o.image_url && !isPdf(o.image_url) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={o.image_url} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
      )}
      <div className="flex flex-1 flex-col p-5">
        {badge && (
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-saffron-100 px-3 py-1 text-xs font-bold text-saffron-600">
            <Tag className="h-3.5 w-3.5" aria-hidden="true" /> {badge}
          </p>
        )}
        <h3 className="mt-3 font-display text-xl text-kola-800">{title || '—'}</h3>
        {desc && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{desc}</p>}
        {o.offer_price_xof != null && base != null && base > o.offer_price_xof && (
          <p className="mt-2 text-sm text-ink-muted"><s>{formatPrice(base, locale)}</s></p>
        )}
        <p className="mt-3 text-xs text-ink-muted">
          {o.starts_on && <>{t.from} {short(o.starts_on, locale)} </>}
          {o.ends_on && <>{o.starts_on ? t.until.toLowerCase() : t.until} {short(o.ends_on, locale)}</>}
          {o.code && <> · {t.code} <strong className="font-mono text-ink">{o.code}</strong></>}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <a href={bookingPath(locale, o.experiences?.slug)} className="btn-gold px-5 py-2 text-sm">{t.book}</a>
          {o.image_url && isPdf(o.image_url) && (
            <a href={o.image_url} target="_blank" rel="noopener noreferrer" className="btn-outline px-5 py-2 text-sm">
              <FileText className="h-4 w-4" aria-hidden="true" /> {t.pdf}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function FlyerCard({ m, locale, className }: { m: MediaItem; locale: Locale; className?: string }) {
  const t = L[locale];
  const title = pick(m.title, locale) ?? '';
  const pdf = isPdf(m.file_url, m.mime);
  return (
    <a
      href={m.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('card group block overflow-hidden', className)}
      aria-label={`${pdf ? t.pdf : t.open}${title ? ` — ${title}` : ''}`}
    >
      {pdf ? (
        <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 bg-sand-100 text-kola-700">
          <FileText className="h-12 w-12" aria-hidden="true" />
          <span className="text-sm font-semibold">PDF</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.file_url} alt={title} className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" />
      )}
      {title && <p className="p-3 text-sm font-semibold text-kola-800">{title}</p>}
    </a>
  );
}
