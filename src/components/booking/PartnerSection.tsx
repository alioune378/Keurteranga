'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Handshake, Loader2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState } from 'react';
import { sendPartnerInquiry } from '@/app/actions';
import { AntiSpamFields, Consent, Field } from '@/components/ui/FormBits';
import type { FormState } from '@/lib/types';

const TYPES = ['hotel', 'agency', 'tour_operator', 'corporate', 'association', 'other'] as const;

export function PartnerSection() {
  const t = useTranslations('booking.partner');
  const tf = useTranslations('contact.form');
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-forest-800 px-6 py-14 text-cream md:px-14 md:py-16">
      <div className="pattern-weave absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr_auto]">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-400 text-forest-900">
          <Handshake className="h-8 w-8" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-display-md text-cream">{t('title')}</h2>
          <p className="mt-3 max-w-2xl text-cream/80">{t('text')}</p>
        </div>
        <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="btn-gold px-7 py-4 text-base" aria-haspopup="dialog">
          {t('cta')}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-forest-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="partner-title"
              className="max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-cream text-ink shadow-lift sm:rounded-3xl"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-sand-200 bg-cream px-6 py-4">
                <h2 id="partner-title" className="text-2xl">{t('formTitle')}</h2>
                <button type="button" onClick={() => setOpen(false)} aria-label={t('close')} className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-sand-200" autoFocus>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <PartnerForm onClose={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
          <p className="rounded-xl bg-terracotta-100 p-4 text-sm text-terracotta-700" role="alert">
            {tf(`errors.${state.error === 'RATE_LIMITED' || state.error === 'NOT_CONFIGURED' ? state.error : 'generic'}`)}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-gold w-full py-4 text-base">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {pending ? t('sending') : t('send')}
        </button>
      </form>
    );
  }
