'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './LanguageSwitcher';

type NavHref = '/' | '/a-propos' | '/experiences' | '/contact';

const NAV: Array<{ href: NavHref; key: 'home' | 'about' | 'experiences' | 'contact' }> = [
  { href: '/', key: 'home' },
  { href: '/a-propos', key: 'about' },
  { href: '/experiences', key: 'experiences' },
  { href: '/contact', key: 'contact' }
];

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-500 ease-elegant',
        scrolled
          ? 'border-b border-sand-200/80 bg-cream/90 shadow-[0_8px_30px_-20px_rgba(29,38,33,.35)] backdrop-blur-md'
          : 'bg-cream'
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-forest-700 focus:px-4 focus:py-2 focus:text-cream">
        {t('skip')}
      </a>
      <div className="container flex h-[4.5rem] items-center justify-between gap-6 md:h-20">
        <Link href="/" aria-label="Kër Téranga" className="shrink-0">
          <Logo priority />
        </Link>

        <nav aria-label={t('home')} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'relative rounded-full px-4 py-2 text-[0.95rem] font-medium transition-colors',
                    isActive(item.href) ? 'text-forest-800' : 'text-ink-soft hover:text-forest-800'
                  )}
                >
                  {t(item.key)}
                  {isActive(item.href) && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-gold-400"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <Link href="/reservation" className="btn-gold hidden px-5 py-2.5 sm:inline-flex">
            {t('book')}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-forest-800 hover:bg-forest-50 lg:hidden"
            aria-label={t('menu')}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-forest-900/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="fixed inset-y-0 right-0 z-50 flex w-[86%] max-w-sm flex-col bg-forest-800 text-cream lg:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <div className="flex h-[4.5rem] items-center justify-between px-6">
                <Logo light className="h-12 md:h-12" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-cream/10"
                  aria-label={t('close')}
                  autoFocus
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="pattern-weave flex-1 px-6 pt-6">
                <ul className="space-y-1">
                  {NAV.map((item, i) => (
                    <motion.li
                      key={item.key}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          'block rounded-xl px-3 py-3 font-display text-2xl',
                          isActive(item.href) ? 'text-gold-300' : 'text-cream hover:text-gold-200'
                        )}
                      >
                        {t(item.key)}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </nav>
              <div className="space-y-4 border-t border-cream/10 p-6">
                <LanguageSwitcher light />
                <Link href="/reservation" className="btn-gold w-full py-4 text-base">
                  {t('book')}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
