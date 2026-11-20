'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { defaultContact } from '@/lib/site-settings';
import { WhatsappIcon } from '@/components/ui/SocialIcons';
import { cn } from '@/lib/utils';

/**
 * Small, discreet WhatsApp shortcut (bottom-left, clear of the Netlify badge).
 * - Raised above the sticky booking bar on experience pages (mobile).
 * - Hidden on the booking page on mobile so it never covers form buttons.
 * - Home: appears once the visitor has scrolled past the hero, so it never
 *   covers the "next workshop" card on the first screen.
 */
export function WhatsAppButton({ whatsapp = defaultContact.whatsapp }: { whatsapp?: string | null }) {
  const t = useTranslations('whatsapp');
  const pathname = usePathname();
  const onHome = pathname === '/';
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    if (!onHome) return;
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onHome]);
  if (!whatsapp) return null;

  const href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(t('message'))}`;
  const onExperience = pathname.startsWith('/experiences/');
  const onBooking = pathname === '/reservation';

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('label')}
      title={t('label')}
      className={cn(
        'fixed left-4 z-30 h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_6px_18px_-6px_rgba(0,0,0,.35)] transition hover:scale-105 md:left-6 md:h-12 md:w-12',
        onExperience ? 'bottom-[5.5rem] lg:bottom-6' : 'bottom-4 md:bottom-6',
        onBooking ? 'hidden lg:inline-flex' : 'inline-flex',
        onHome && !pastHero && 'pointer-events-none !opacity-0'
      )}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.8, duration: 0.3 }}
    >
      <WhatsappIcon className="h-[22px] w-[22px] md:h-6 md:w-6" />
    </motion.a>
  );
}
