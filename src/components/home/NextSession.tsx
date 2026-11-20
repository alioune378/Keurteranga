'use client';

import { ArrowRight, Clock, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { useUpcomingSessions } from '@/lib/useUpcoming';
import { cn, formatDate, formatPrice, formatTime } from '@/lib/utils';

/**
 * The booking strip at the bottom of the home hero: the next open workshop,
 * with live seats left, and a one-tap link straight to that date.
 */
export function NextSession({
  experienceId,
  slug,
  price,
  whatsapp,
  className
}: {
  experienceId: string | null;
  slug: string | null;
  price: number | null;
  whatsapp: string | null;
  className?: string;
}) {
  const t = useTranslations('home.next');
  const tb = useTranslations('booking');
  const te = useTranslations('experiences');
  const locale = useLocale() as Locale;
  const slots = useUpcomingSessions(experienceId, 3);
  const next = slots?.[0];

  const day = next ? formatDate(next.date, locale, { year: undefined, month: 'long' }) : null;

  return (
    <div className={cn('rounded-[1.75rem] bg-white p-4 text-ink shadow-lift sm:p-5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-hand text-[1.4rem] leading-none text-clay-500">{t('label')}</p>
        {price != null && (
          <p className="whitespace-nowrap text-sm text-ink-muted">
            <span className="font-display text-base font-semibold text-kola-700">{formatPrice(price, locale)}</span> {te('perPerson')}
          </p>
        )}
      </div>

      {slots === undefined ? (
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="h-6 w-3/4 animate-pulse rounded-full bg-kola-100" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-kola-100" />
        </div>
      ) : next && slug ? (
        <>
          <p className="mt-2 font-display text-xl font-semibold capitalize leading-tight text-kola-700 sm:text-[1.35rem]">{day}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-clay-500" aria-hidden="true" />
              {formatTime(next.start_time)}
              {next.end_time && <> – {formatTime(next.end_time)}</>}
            </span>
            <span className={cn('inline-flex items-center gap-1.5', next.remaining <= 2 && 'font-semibold text-bissap-500')}>
              <Users className="h-4 w-4 text-clay-500" aria-hidden="true" />
              {tb('spotsLeft', { count: next.remaining })}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href={{ pathname: '/reservation', query: { experience: slug, date: next.date } }} className="btn-gold flex-1 sm:flex-none">
              {t('book')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {slots.length > 1 && (
              <Link href={{ pathname: '/reservation', query: { experience: slug } }} className="text-sm font-semibold text-kola-700 underline decoration-clay-300 decoration-2 underline-offset-4 hover:text-clay-600">
                {t('more')}
              </Link>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-xl font-semibold leading-tight text-kola-700">{t('none')}</p>
          <p className="mt-1 text-sm text-ink-soft">{t('noneText')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn-gold">
                WhatsApp
              </a>
            )}
            {slug && (
              <Link href={{ pathname: '/reservation', query: { experience: slug } }} className="btn-outline">
                {t('calendar')}
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
