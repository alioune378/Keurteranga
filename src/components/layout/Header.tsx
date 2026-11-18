'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Compass, Home, Info, Mail, Menu, MessageCircle, X, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, usePathname } from '@/i18n/navigation';
import { defaultContact } from '@/lib/site-settings';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './LanguageSwitcher';

type NavHref = '/' | '/a-propos' | '/experiences' | '/contact';

const NAV: Array<{ href: NavHref; key: 'home' | 'about' | 'experiences' | 'contact'; Icon: LucideIcon }> = [
  { href: '/', key: 'home', Icon: Home },
  { href: '/experiences', key: 'experiences', Icon: Compass },
  { href: '/a-propos', key: 'about', Icon: Info },
  { href: '/contact', key: 'contact', Icon: Mail }
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

export function Header({ whatsapp = defaultContact.whatsapp }: { whatsapp?: string | null }) {
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
          'pt-safe sticky top-0 z-40 bg-white/95 backdrop-blur-sm transition-shadow duration-300 supports-[backdrop-filter]:bg-white/85',
          scrolled ? 'shadow-[0_1px_0_0_#E8E8E3]' : 'shadow-none'
        )}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-forest-700 focus:px-4 focus:py-2 focus:text-white"
        >
          {t('skip')}
        </a>
        <div className="container flex h-16 items-center justify-between gap-3 md:h-[4.5rem]">
          <Link href="/" aria-label={`Kër Téranga — ${t('home')}`} className="shrink-0">
            <Logo priority className="h-10 w-auto md:h-12" />
          </Link>

          <nav aria-label={t('mainNav')} className="hidden lg:block">
            <ul className="flex items-center gap-1 rounded-full bg-sand-100 p-1">
              {NAV.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'block rounded-full px-4 py-2 text-[0.92rem] font-semibold transition',
                      isActive(item.href) ? 'bg-white text-forest-700 shadow-soft' : 'text-ink-soft hover:text-forest-700'
                    )}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
            <Link href="/reservation" className="btn-gold min-h-[2.5rem] px-4 py-2 text-sm">
              <span className="sm:hidden">{t('bookShort')}</span>
              <span className="hidden sm:inline">{t('book')}</span>
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sand-300 text-forest-700 transition hover:border-forest-700 lg:hidden"
              aria-label={t('menu')}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {mounted && createPortal(<MobileMenu open={open} onClose={close} isActive={isActive} whatsapp={whatsapp} />, document.body)}
    </>
  );
}

function MobileMenu({
  open,
  onClose,
  isActive,
  whatsapp
}: {
  open: boolean;
  onClose: () => void;
  isActive: (href: string) => boolean;
  whatsapp: string | null;
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
        <div className="fixed inset-0 z-[70] lg:hidden">
          {/* dimmed page — tap to close; the panel itself is fully opaque */}
          <motion.div
            data-menu-backdrop
            className="absolute inset-0 bg-forest-900/45"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t('menuTitle')}
            className="pt-safe absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto overscroll-contain rounded-b-3xl bg-white shadow-lift"
            initial={reduce ? false : { y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: -16, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="container flex h-16 items-center justify-between">
              <Link href="/" onClick={onClose} aria-label={`Kër Téranga — ${t('home')}`} className="shrink-0">
                <Logo className="h-10 w-auto" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                data-autofocus
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sand-100 text-forest-700 hover:bg-sand-200"
                aria-label={t('close')}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label={t('mainNav')} className="container pb-2">
              <ul className="overflow-hidden rounded-2xl border border-sand-200">
                {NAV.map(({ href, key, Icon }) => (
                  <li key={key} className="border-b border-sand-200 last:border-b-0">
                    <Link
                      href={href}
                      onClick={onClose}
                      aria-current={isActive(href) ? 'page' : undefined}
                      className={cn(
                        'flex min-h-[3.25rem] items-center gap-3 px-4 py-2.5 transition',
                        isActive(href) ? 'bg-forest-50' : 'hover:bg-sand-100'
                      )}
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="flex-1 text-[1.02rem] font-semibold text-forest-700">{t(key)}</span>
                      <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="pb-safe container space-y-3 pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink-soft">{t('language')}</span>
                <LanguageSwitcher full />
              </div>
              <Link href="/reservation" onClick={onClose} className="btn-gold w-full">
                {t('book')}
              </Link>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[2.75rem] items-center justify-center gap-2 text-sm text-ink-soft hover:text-forest-700"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {t('questions')} <span className="font-semibold text-forest-700">WhatsApp</span>
                </a>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
