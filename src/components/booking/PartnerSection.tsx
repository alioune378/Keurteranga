'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BedDouble, Building2, CheckCircle2, Compass, Landmark, Loader2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sendPartnerInquiry } from '@/app/actions';
import { AntiSpamFields, Consent, Field } from '@/components/ui/FormBits';
import type { FormState } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPES = ['hotel', 'agency', 'tour_operator', 'corporate', 'association', 'other'] as const;

const AUDIENCES = [
  { key: 'hotels', Icon: BedDouble },
  { key: 'agencies', Icon: Compass },
  { key: 'companies', Icon: Building2 },
  { key: 'institutions', Icon: Landmark }
] as const;

/** Professional partnerships: editorial section + inquiry form in a dialog. */
export function PartnerSection({ className }: { className?: string }) {
  const t = useTranslations('booking.partner');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.width = '100%';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      // restore position without the smooth-scroll animation
      const html = document.documentElement;
      const prevBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      window.scrollTo(0, y);
      html.style.scrollBehavior = prevBehavior;
      window.removeEventListener('keydown', onKey);
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <section id="partenaires" aria-labelledby="partners-title" className={cn('scroll-mt-20 border-t border-sand-200 bg-white', className)}>
      <div className="container grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h2 id="partners-title" className="mt-4 text-display-lg">{t('heading')}</h2>
          <p className="mt-5 text-[1.05rem] leading-relaxed text-ink-soft">{t('title')}</p>
          <p className="mt-3 text-[1.05rem] leading-relaxed text-ink-soft">{t('text')}</p>
          <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="btn-green btn-lg mt-8" aria-haspopup="dialog">
            {t('cta')}
          </button>
        </div>
        <ul className="grid self-center border-t border-sand-200 sm:grid-cols-2 lg:col-span-7">
          {AUDIENCES.map(({ key, Icon }, i) => (
            <li
              key={key}
              className={cn(
                'flex gap-4 border-b border-sand-200 py-6 sm:px-6',
                i % 2 === 0 ? 'sm:border-r sm:pl-0' : 'sm:pr-0'
              )}
            >
              <Icon className="mt-1 h-5 w-5 shrink-0 text-terracotta-500" aria-hidden="true" />
              <div>
                <h3 className="text-[1.45rem] leading-tight">{t(`audiences.${key}.title`)}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">{t(`audiences.${key}.text`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="fixed inset-0 z-[80] flex items-end justify-center bg-forest-900/60 p-0 sm:items-center sm:p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="partner-title"
                  className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] text-ink shadow-lift sm:rounded-2xl"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-sand-200 bg-white px-6 py-4">
                    <h2 id="partner-title" className="text-2xl">{t('formTitle')}</h2>
                    <button type="button" onClick={() => setOpen(false)} aria-label={t('close')} className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-sand-100" autoFocus>
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <PartnerForm onClose={() => setOpen(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </section>
  );
}

function PartnerForm({ onClose }: { onClose: () => void }) {
    const t = useTranslations('booking.partner');
    const tf = useTranslations('contact.form');
    const locale = useLocale();
    const [state, action, pending] = useActionState<FormState, FormData>(sendPartnerInquiry, { status: 'idle' });
    const err = (f: string) => (state.fields?.[f] ? tf(`errors.${state.fields[f]}`) : undefined);

    if (state.status === 'success') {
      return (
        <div className="flex flex-col items-center p-10 text-center" role="status">
          <CheckCircle2 className="h-12 w-12 text-forest-600" aria-hidden="true" />
          <p className="mt-4 text-lg">{t('success')}</p>
          <button type="button" onClick={onClose} className="btn-green mt-6">{t('close')}</button>
        </div>
      );
    }

    return (
      <form action={action} className="relative space-y-5 p-6" noValidate>
        <AntiSpamFields />
        <input type="hidden" name="locale" value={locale} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="p-org" label={t('organization')} error={err('organization')}>
            <input id="p-org" name="organization" required maxLength={160} autoComplete="organization" className="field-input" aria-invalid={!!err('organization')} />
          </Field>
          <Field id="p-type" label={t('type')} error={err('orgType')}>
            <select id="p-type" name="orgType" required defaultValue="" className="field-input" aria-invalid={!!err('orgType')}>
              <option value="" disabled>{t('typePlaceholder')}</option>
              {TYPES.map((k) => (
                <option key={k} value={k}>{t(`types.${k}`)}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="p-name" label={t('contactName')} error={err('contactName')}>
            <input id="p-name" name="contactName" required maxLength={120} autoComplete="name" className="field-input" aria-invalid={!!err('contactName')} />
          </Field>
          <Field id="p-email" label={t('email')} error={err('email')}>
            <input id="p-email" name="email" type="email" required maxLength={200} autoComplete="email" className="field-input" aria-invalid={!!err('email')} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="p-phone" label={t('phone')}>
            <input id="p-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" className="field-input" />
          </Field>
          <Field id="p-country" label={t('country')}>
            <input id="p-country" name="country" maxLength={80} autoComplete="country-name" className="field-input" />
          </Field>
          <Field id="p-size" label={t('groupSize')}>
            <input id="p-size" name="groupSize" maxLength={60} className="field-input" />
          </Field>
        </div>
        <Field id="p-msg" label={t('message')}>
          <textarea id="p-msg" name="message" rows={4} maxLength={3000} className="field-input resize-y" />
        </Field>
        <Consent label={t('consent')} error={err('consent')} />
        {state.status === 'error' && state.error !== 'INVALID_INPUT' && (
          <p className="rounded-lg bg-terracotta-100 p-4 text-sm text-terracotta-700" role="alert">
            {tf(`errors.${state.error === 'RATE_LIMITED' || state.error === 'NOT_CONFIGURED' ? state.error : 'generic'}`)}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-gold btn-lg w-full">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {pending ? t('sending') : t('send')}
        </button>
      </form>
    );
  }
