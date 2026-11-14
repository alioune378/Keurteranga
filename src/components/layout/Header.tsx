'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, usePathname } from '@/i18n/navigation';
import { site } from '@/config/site';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './LanguageSwitcher';

type NavHref = '/' | '/a-propos' | '/experiences' | '/contact';

const NAV: Array<{ href: NavHref; key: 'home' | 'about' | 'experiences' | 'contact' }> = [
  { href: '/', key: 'home' },
  { href: '/experiences', key: 'experiences' },
  { href: '/a-propos', key: 'about' },
  { href: '/contact', key: 'contact' }
];

/**
 * iOS-safe scroll lock: `overflow: hidden` alone does not stop Safari from
 * scrolling the page behind a fixed panel, so the body is pinned in place.
 */
function lockScroll() {
  const y = window.scrollY;
  const body = document.body;
  const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
  body.style.position = 'fixed';
  body.style.top = `-${y}px`;
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  return () => {
    body.style.position = prev.position;
    body.style.top = prev.top;
    body.style.width = prev.width;
    body.style.overflow = prev.overflow;
    // restore position without the smooth-scroll animation
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    html.style.scrollBehavior = prevBehavior;
  };
}

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close after navigating
  useEffect(() => setOpen(false), [pathname]);

  // Close if the viewport grows to desktop while open
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus({ preventScroll: true }));
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={cn(
          'pt-safe sticky top-0 z-40 bg-white transition-shadow duration-300',
          scrolled ? 'shadow-[0_1px_0_0_#E8E8E3]' : 'shadow-none'
        )}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-forest-700 focus:px-4 focus:py-2 focus:text-white"
        >
          {t('skip')}
        </a>
        <div className="container flex h-16 items-center justify-between gap-4 md:h-20">
          <Link href="/" aria-label={`Kër Téranga — ${t('home')}`} className="shrink-0">
            <Logo priority className="h-11 w-auto md:h-14" />
          </Link>

          <nav aria-label={t('mainNav')} className="hidden lg:block">
            <ul className="flex items-center gap-8">
              {NAV.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'relative py-2 text-[0.95rem] font-medium transition-colors',
                      isActive(item.href) ? 'text-forest-700' : 'text-ink-soft hover:text-forest-700'
                    )}
                  >
                    {t(item.key)}
                    {isActive(item.href) && (
                      <motion.span layoutId="nav-underline" className="absolute inset-x-0 -bottom-0.5 h-px bg-gold-400" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
            <Link href="/reservation" className="btn-gold min-h-[2.5rem] px-4 py-2 text-[0.7rem] sm:px-5 lg:min-h-[2.75rem] lg:text-[0.75rem]">
              <span className="sm:hidden">{t('bookShort')}</span>
              <span className="hidden sm:inline">{t('book')}</span>
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setOpen(true)}
              className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-forest-700 hover:bg-forest-50 lg:hidden"
              aria-label={t('menu')}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {mounted && createPortal(<MobileMenu open={open} onClose={close} isActive={isActive} />, document.body)}
    </>
  );
}

function MobileMenu({
  open,
  onClose,
  isActive
}: {
  open: boolean;
  onClose: () => void;
  isActive: (href: string) => boolean;
}) {
  const t = useTranslations('nav');
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []
      ).filter((el) => el.offsetParent !== null);
    // Move focus into the dialog
    requestAnimationFrame(() => panel?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true }));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlock();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t('menuTitle')}
          className="fixed inset-0 z-[70] flex h-[100dvh] flex-col overflow-y-auto overscroll-contain bg-white text-forest-700 lg:hidden"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="pt-safe sticky top-0 z-10 shrink-0 border-b border-sand-200 bg-white">
            <div className="container flex h-16 items-center justify-between">
              <Link href="/" onClick={onClose} aria-label={`Kër Téranga — ${t('home')}`} className="shrink-0">
                <Logo className="h-11 w-auto" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                data-autofocus
                className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-forest-700 hover:bg-forest-50"
                aria-label={t('close')}
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          <nav aria-label={t('mainNav')} className="container flex-1 py-6">
            <ul className="divide-y divide-sand-200 border-b border-sand-200">
              {NAV.map((item, i) => (
                <motion.li
                  key={item.key}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 + i * 0.04, duration: 0.25 }}
                >
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className="group flex items-baseline gap-4 py-4"
                  >
                    <span className="w-5 font-sans text-[0.7rem] font-semibold tabular-nums text-gold-500">0{i + 1}</span>
                    <span
                      className={cn(
                        'font-display text-[1.85rem] leading-none',
                        isActive(item.href) ? 'italic text-terracotta-500' : 'text-forest-700 group-hover:text-forest-500'
                      )}
                    >
                      {t(item.key)}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>

            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">{t('language')}</span>
              <LanguageSwitcher full />
            </div>
          </nav>

          <div className="pb-safe container shrink-0 space-y-4 border-t border-sand-200 bg-white pt-5">
            <Link href="/reservation" onClick={onClose} className="btn-gold btn-lg w-full">
              {t('book')}
            </Link>
            {site.whatsapp && (
              <a
                href={`https://wa.me/${site.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-sm text-ink-soft hover:text-forest-700"
              >
                {t('questions')} <span className="font-semibold text-forest-700">WhatsApp</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
