'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const NAMES: Record<Locale, string> = { fr: 'Français', en: 'English' };

export function LanguageSwitcher({
  light = false,
  full = false,
  className
}: {
  light?: boolean;
  /** Show full language names (mobile menu) */
  full?: boolean;
  className?: string;
}) {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      // params always match the current pathname
      router.replace({ pathname, params } as unknown as Parameters<typeof router.replace>[0], {
        locale: next,
        scroll: false
      });
    });
  }

  // compact (header): plain "FR · EN" text toggle; full (mobile menu): two pill buttons
  if (!full) {
    return (
      <div role="group" aria-label={t('language')} className={cn('inline-flex items-center gap-1 text-[0.8rem] font-semibold', pending && 'opacity-60', className)}>
        {routing.locales.map((l, i) => (
          <span key={l} className="inline-flex items-center gap-1">
            {i > 0 && <span aria-hidden="true" className={light ? 'text-white/40' : 'text-kola-300'}>·</span>}
            <button
              type="button"
              onClick={() => switchTo(l)}
              aria-pressed={l === locale}
              aria-label={NAMES[l]}
              lang={l}
              className={cn(
                'min-h-[2rem] px-1 uppercase tracking-wide transition',
                l === locale
                  ? light
                    ? 'text-white underline decoration-saffron-300 decoration-2 underline-offset-[6px]'
                    : 'text-kola-700 underline decoration-clay-400 decoration-2 underline-offset-[6px]'
                  : light
                    ? 'text-white/70 hover:text-white'
                    : 'text-ink-muted hover:text-kola-700'
              )}
            >
              {l}
            </button>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn('inline-flex rounded-full bg-kola-50 p-0.5 text-sm font-semibold', pending && 'opacity-60', className)}
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          aria-label={NAMES[l]}
          lang={l}
          className={cn('min-h-[2.25rem] rounded-full px-4 transition', l === locale ? 'bg-clay-500 text-white' : 'text-kola-700/70 hover:text-kola-700')}
        >
          {NAMES[l]}
        </button>
      ))}
    </div>
  );
}
