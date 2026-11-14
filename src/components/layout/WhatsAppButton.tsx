'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { site } from '@/config/site';
import { WhatsappIcon } from '@/components/ui/SocialIcons';

export function WhatsAppButton() {
  const t = useTranslations('whatsapp');
  // Shown on every page once the WhatsApp number is set in src/config/site.ts
  if (!site.whatsapp) return null;
  const href = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(t('message'))}`;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('label')}
      title={t('label')}
      className="group fixed bottom-24 left-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift transition hover:scale-105 md:bottom-8 md:left-8"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-20 motion-reduce:hidden" aria-hidden="true" />
      <WhatsappIcon className="relative h-7 w-7" />
    </motion.a>
  );
}
