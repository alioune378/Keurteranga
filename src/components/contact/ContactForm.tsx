'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { sendContact } from '@/app/actions';
import { AntiSpamFields, Consent, Field } from '@/components/ui/FormBits';
import type { FormState } from '@/lib/types';

export function ContactForm() {
  const t = useTranslations('contact.form');
  const locale = useLocale();
  const [state, action, pending] = useActionState<FormState, FormData>(sendContact, { status: 'idle' });
  const err = (f: string) => (state.fields?.[f] ? t(`errors.${state.fields[f]}`) : undefined);

  if (state.status === 'success') {
    return (
      <div className="card flex flex-col items-center p-10 text-center" role="status">
        <CheckCircle2 className="h-12 w-12 text-kola-600" aria-hidden="true" />
        <p className="mt-4 text-lg">{t('success')}</p>
      </div>
    );
  }

  return (
    <form action={action} className="card relative space-y-5 p-6 md:p-8" noValidate>
      <h2 className="text-display-md">{t('title')}</h2>
      <AntiSpamFields />
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="c-name" label={t('name')} error={err('name')}>
          <input id="c-name" name="name" required maxLength={120} autoComplete="name" className="field-input" aria-invalid={!!err('name')} />
        </Field>
        <Field id="c-email" label={t('email')} error={err('email')}>
          <input id="c-email" name="email" type="email" required maxLength={200} autoComplete="email" className="field-input" aria-invalid={!!err('email')} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="c-phone" label={t('phone')}>
          <input id="c-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" className="field-input" />
        </Field>
        <Field id="c-subject" label={t('subject')}>
          <input id="c-subject" name="subject" maxLength={200} className="field-input" />
        </Field>
      </div>
      <Field id="c-message" label={t('message')} error={err('message')}>
        <textarea id="c-message" name="message" required rows={5} maxLength={5000} className="field-input resize-y" aria-invalid={!!err('message')} />
      </Field>
      <Consent label={t('consent')} error={err('consent')} />
      {state.status === 'error' && state.error !== 'INVALID_INPUT' && (
        <p className="rounded-xl bg-terracotta-100 p-4 text-sm text-terracotta-700" role="alert">
          {t(`errors.${state.error === 'RATE_LIMITED' || state.error === 'NOT_CONFIGURED' ? state.error : 'generic'}`)}
        </p>
      )}
      <button type="submit" className="btn-green w-full py-4 sm:w-auto" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {pending ? t('sending') : t('send')}
      </button>
    </form>
  );
}
