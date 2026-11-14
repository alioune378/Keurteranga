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

  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn(
        'inline-flex rounded-full border p-0.5 font-semibold',
        full ? 'text-sm' : 'text-xs',
        light ? 'border-white/30' : 'border-forest-700/20',
        pending && 'opacity-60',
        className
      )}
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          aria-label={NAMES[l]}
          lang={l}
          className={cn(
            'rounded-full transition',
            full ? 'min-h-[2.25rem] px-4' : 'min-h-[2rem] px-3 uppercase',
            l === locale
              ? light
                ? 'bg-white text-forest-900'
                : 'bg-forest-700 text-white'
              : light
                ? 'text-white/80 hover:text-white'
                : 'text-forest-700/70 hover:text-forest-700'
          )}
        >
          {full ? NAMES[l] : l}
        </button>
      ))}
    </div>
  );
}
