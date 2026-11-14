'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ light = false, className }: { light?: boolean; className?: string }) {
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
        'inline-flex rounded-full border p-0.5 text-xs font-semibold',
        light ? 'border-cream/30' : 'border-forest-700/20',
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
          lang={l}
          className={cn(
            'rounded-full px-2.5 py-1 uppercase transition',
            l === locale
              ? light
                ? 'bg-cream text-forest-900'
                : 'bg-forest-700 text-cream'
              : light
                ? 'text-cream/80 hover:text-cream'
                : 'text-forest-800/70 hover:text-forest-800'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
