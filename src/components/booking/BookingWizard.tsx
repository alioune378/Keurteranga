'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, CheckCircle2, Clock, Loader2, Minus, Plus, Radio } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBooking } from '@/app/actions';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { Photo } from '@/components/ui/Photo';
import { countries } from '@/data/countries';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { AvailabilitySlot, BookingErrorCode, ExperienceSummary } from '@/lib/types';
import { cn, formatDate, formatPrice, formatTime } from '@/lib/utils';
import { EMAIL_RE } from '@/lib/validation';
import { Calendar } from './Calendar';

const STEPS = ['experience', 'date', 'participants', 'details', 'review'] as const;

function monthOf(iso: string) {
  return iso.slice(0, 7);
}
function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}
function dakarToday() {
  return new Date().toISOString().slice(0, 10); // Dakar = UTC+0
}

interface Details {
  firstName: string;
  lastName: string;
  email: string;
  dialCode: string;
  phone: string;
  country: string;
  specialRequests: string;
  consent: boolean;
}

export function BookingWizard({
  experiences,
  initialSlug
}: {
  experiences: ExperienceSummary[];
  initialSlug?: string;
}) {
  const t = useTranslations('booking');
  const tp = useTranslations('placeholder');
  const locale = useLocale() as Locale;
  const reduce = useReducedMotion();

  const initial = experiences.find((e) => e.slug === initialSlug) ?? (experiences.length === 1 ? experiences[0] : undefined);
  const [step, setStep] = useState(initial ? 1 : 0);
  const [experienceId, setExperienceId] = useState<string | null>(initial?.id ?? null);
  const experience = experiences.find((e) => e.id === experienceId) ?? null;

  const today = dakarToday();
  const [month, setMonth] = useState(monthOf(today));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [participants, setParticipants] = useState(1);
  const [language, setLanguage] = useState<'fr' | 'en'>(locale);
  const [details, setDetails] = useState<Details>({
    firstName: '', lastName: '', email: '', dialCode: '+221', phone: '', country: '', specialRequests: '', consent: false
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<BookingErrorCode | null>(null);
  const [done, setDone] = useState<{ reference: string } | null>(null);

  // one idempotency key per booking attempt: retries/double-clicks never duplicate
  const idemKey = useRef<string>('');
  const startedAt = useRef<number>(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    idemKey.current = crypto.randomUUID();
    startedAt.current = Date.now();
  }, []);

  const slot = slots.find((s) => s.id === slotId) ?? null;
  const daySlots = useMemo(() => slots.filter((s) => s.date === date), [slots, date]);
  const maxParticipants = Math.max(
    0,
    Math.min(experience?.max_participants ?? Number.POSITIVE_INFINITY, slot?.remaining ?? 0)
  );
  const minParticipants = experience?.min_participants ?? 1;

  // ------------------------------------------------------------------ availability
  const fetchAvailability = useCallback(async () => {
    const supabase = getBrowserClient();
    if (!supabase || !experienceId) return;
    setLoading(true);
    const { from, to } = monthRange(month);
    const { data, error: err } = await supabase.rpc('get_availability', {
      p_experience_id: experienceId,
      p_from: from,
      p_to: to
    });
    setLoading(false);
    if (err) {
      console.error(err);
      return;
    }
    setSlots((data ?? []) as AvailabilitySlot[]);
  }, [experienceId, month]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // realtime: any change to sessions / blocked dates refreshes the calendar
  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase || !experienceId) return;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(fetchAvailability, 300);
    };
    const channel = supabase
      .channel(`availability-${experienceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `experience_id=eq.${experienceId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_dates' }, refresh)
      .subscribe();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, [experienceId, fetchAvailability]);

  // keep selections valid when availability changes in real time
  useEffect(() => {
    if (slotId && !slots.find((s) => s.id === slotId && s.remaining > 0)) {
      if (slots.length || !loading) setSlotId(null);
    }
    if (slot && participants > slot.remaining) setParticipants(Math.max(minParticipants, slot.remaining));
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the participant count within [min, available]
  useEffect(() => {
    if (!slot) return;
    setParticipants((p) => Math.max(minParticipants, Math.min(p, maxParticipants || minParticipants)));
  }, [slotId, minParticipants, maxParticipants]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, done]);

  // ------------------------------------------------------------------ navigation
  function goNext() {
    setError(null);
    if (step === 3) {
      const errs: Record<string, string> = {};
      if (!details.firstName.trim()) errs.firstName = t('errors.required');
      if (!details.lastName.trim()) errs.lastName = t('errors.required');
      if (!EMAIL_RE.test(details.email.trim())) errs.email = t('errors.email');
      if (details.phone.replace(/\D/g, '').length < 6) errs.phone = t('errors.phone');
      if (!details.consent) errs.consent = t('errors.consent');
      setFieldErrors(errs);
      if (Object.keys(errs).length) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, experiences.length > 1 || !initial ? 0 : 1));
  }
  const canContinue =
    (step === 0 && !!experience) ||
    (step === 1 && !!slot && slot.remaining > 0) ||
    (step === 2 && participants >= minParticipants && participants <= maxParticipants) ||
    step === 3;

  async function confirm() {
    if (!slot || !experience) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await createBooking({
        idempotencyKey: idemKey.current,
        sessionId: slot.id,
        participants,
        language,
        firstName: details.firstName,
        lastName: details.lastName,
        email: details.email,
        dialCode: details.dialCode,
        phone: details.phone,
        country: details.country,
        specialRequests: details.specialRequests,
        consent: details.consent,
        website: honeypot.current?.value ?? '',
        startedAt: startedAt.current,
        locale
      });
      if (res.ok) {
        setDone({ reference: res.reference });
        return;
      }
      setError(res.error);
      if (res.fields) {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.fields)) map[k] = t(`errors.${v === 'required' && k === 'consent' ? 'consent' : v}`);
        setFieldErrors(map);
        setStep(3);
      }
      if (['NOT_ENOUGH_SPOTS', 'SESSION_CLOSED', 'SESSION_PAST', 'DATE_BLOCKED', 'SESSION_NOT_FOUND'].includes(res.error)) {
        await fetchAvailability();
        setStep(1);
      }
    } catch {
      setError('generic');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    idemKey.current = crypto.randomUUID();
    startedAt.current = Date.now();
    setDone(null);
    setDate(null);
    setSlotId(null);
    setParticipants(1);
    setStep(initial ? 1 : 0);
    fetchAvailability();
  }

  const set = <K extends keyof Details>(k: K, v: Details[K]) => setDetails((d) => ({ ...d, [k]: v }));
  const countryName = (code: string) => countries.find((c) => c.code === code)?.[locale] ?? code;
  const total = experience?.price_xof != null ? formatPrice(experience.price_xof * participants, locale) : null;

  // ------------------------------------------------------------------ success
  if (done) {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-xl overflow-hidden rounded-4xl border border-sand-200 bg-white text-center shadow-soft"
        role="status"
      >
        <div className="bg-forest-50 px-6 py-10">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold-400 text-forest-900">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-display-md outline-none">
            {t('success.title')}
          </h2>
        </div>
        <div className="space-y-5 p-6 md:p-8">
          <p className="text-lg">{t('success.text', { email: details.email })}</p>
          <div className="rounded-3xl border-2 border-dashed border-gold-300 bg-gold-100/40 p-5">
            <p className="text-sm font-semibold text-ink-muted">{t('success.reference')}</p>
            <p className="mt-1 select-all font-display text-3xl font-bold tracking-wider text-forest-700">{done.reference}</p>
          </div>
          {slot && experience && (
            <p className="text-ink-soft">
              {experience.title} · {formatDate(slot.date, locale)} · {formatTime(slot.start_time)} · {participants} {t('summary.participants').toLowerCase()}
            </p>
          )}
          <p className="text-sm text-ink-soft">{t('success.next')}</p>
          <p className="text-xs text-ink-muted">{t('success.emailDelay')}</p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
            <Link href="/" className="btn-green">{t('success.home')}</Link>
            <button type="button" onClick={reset} className="btn-outline">{t('success.another')}</button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ------------------------------------------------------------------ wizard
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="rounded-4xl border border-sand-200 bg-white p-5 shadow-soft md:p-8">
        {/* progress */}
        <nav aria-label={t('stepOf', { current: step + 1, total: STEPS.length })} className="mb-6">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-forest-700">{t(`steps.${STEPS[step]}`)}</span>
            <span className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
              {step + 1}/{STEPS.length}
            </span>
          </div>
          <ol className="mt-3 grid grid-cols-5 gap-1.5">
            {STEPS.map((s, i) => (
              <li key={s} aria-current={i === step ? 'step' : undefined}>
                <span className={cn('block h-1.5 rounded-full transition-colors', i < step ? 'bg-forest-700' : i === step ? 'bg-gold-400' : 'bg-sand-200')} />
                <span className="sr-only">{t(`steps.${s}`)}</span>
              </li>
            ))}
          </ol>
        </nav>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl border border-terracotta-300 bg-terracotta-100 p-4 text-sm text-terracotta-700">
            {t(`errors.${error}`)}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            {/* STEP 1 — experience */}
            {step === 0 && (
              <fieldset>
                <legend>
                  <h2 ref={headingRef} tabIndex={-1} className="text-display-md outline-none">{t('chooseExperience')}</h2>
                </legend>
                <div className="mt-6 grid gap-4">
                  {experiences.map((e) => (
                    <label
                      key={e.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-4 rounded-3xl border p-3 transition focus-within:ring-2 focus-within:ring-gold-400',
                        experienceId === e.id ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700' : 'border-sand-300 hover:border-forest-400'
                      )}
                    >
                      <input
                        type="radio"
                        name="experience"
                        className="sr-only"
                        checked={experienceId === e.id}
                        onChange={() => {
                          setExperienceId(e.id);
                          setDate(null);
                          setSlotId(null);
                        }}
                      />
                      <Photo src={e.cover?.src} alt={e.cover?.alt ?? e.title} illustration={e.cover?.illustration} className="aspect-[3/2] w-24 shrink-0 rounded-2xl sm:w-32" sizes="128px" />
                      <span className="min-w-0">
                        <span className="block font-display text-lg font-semibold leading-tight text-forest-700">{e.title}</span>
                        <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{e.summary}</span>
                        <span className="mt-1 block text-sm font-medium text-ink">
                          {e.duration} · {e.price_xof != null ? formatPrice(e.price_xof, locale) : tp('priceTbc')}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {/* STEP 2 — date & time */}
            {step === 1 && experience && (
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-display-md outline-none">{t('chooseDate')}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                  <Radio className="h-4 w-4 text-forest-500" aria-hidden="true" /> {t('realtime')} · {t('timeZoneNote')}
                </p>
                <div className="mt-6 grid gap-8 md:grid-cols-[1fr_220px]">
                  <Calendar
                    locale={locale}
                    month={month}
                    minMonth={monthOf(today)}
                    slots={slots}
                    selectedDate={date}
                    loading={loading}
                    onSelect={(d) => {
                      setDate(d);
                      const open = slots.filter((s) => s.date === d && s.remaining > 0);
                      setSlotId(open.length === 1 ? open[0].id : null);
                    }}
                    onMonthChange={(mo) => {
                      setMonth(mo);
                    }}
                    labels={{
                      prev: t('prevMonth'),
                      next: t('nextMonth'),
                      available: t('legendAvailable'),
                      full: t('legendFull'),
                      unavailable: t('legendUnavailable'),
                      selected: t('legendSelected')
                    }}
                  />
                  <div>
                    <h3 className="font-sans text-sm font-semibold text-ink-soft">{t('chooseSlot')}</h3>
                    {!date && <p className="mt-3 text-sm text-ink-soft">{t('selectDateFirst')}</p>}
                    {!loading && slots.length === 0 && <p className="mt-3 text-sm text-ink-soft">{t('noSlots')}</p>}
                    {date && (
                      <div role="radiogroup" aria-label={t('chooseSlot')} className="mt-3 space-y-2">
                        <p className="text-sm font-medium capitalize text-forest-800">{formatDate(date, locale, { year: undefined })}</p>
                        {daySlots.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            role="radio"
                            aria-checked={slotId === s.id}
                            disabled={s.remaining <= 0}
                            onClick={() => setSlotId(s.id)}
                            className={cn(
                              'flex min-h-[3.25rem] w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition',
                              slotId === s.id ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700' : 'border-sand-300 hover:border-forest-400',
                              s.remaining <= 0 && 'cursor-not-allowed border-dashed bg-sand-100 opacity-70'
                            )}
                          >
                            <span className="flex items-center gap-2 font-semibold">
                              <Clock className="h-4 w-4 text-gold-500" aria-hidden="true" />
                              {formatTime(s.start_time)}
                              {s.end_time && <span className="font-normal text-ink-muted">– {formatTime(s.end_time)}</span>}
                            </span>
                            <span className={cn('text-xs', s.remaining <= 2 ? 'font-semibold text-terracotta-700' : 'text-ink-muted')}>
                              {s.remaining <= 0 ? t('full') : t('spotsLeft', { count: s.remaining })}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 — participants & language */}
            {step === 2 && slot && (
              <div className="space-y-8">
                <h2 ref={headingRef} tabIndex={-1} className="text-display-md outline-none">{t('steps.participants')}</h2>
                <div>
                  <p id="participants-label" className="field-label">{t('participants')}</p>
                  <div className="flex items-center gap-4" role="group" aria-labelledby="participants-label">
                    <button
                      type="button"
                      onClick={() => setParticipants((p) => Math.max(minParticipants, p - 1))}
                      disabled={participants <= minParticipants}
                      aria-label={t('decrease')}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-forest-700/30 text-forest-800 transition hover:bg-forest-50 disabled:opacity-30"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <output aria-live="polite" className="w-14 text-center font-display text-4xl font-bold text-forest-700">{participants}</output>
                    <button
                      type="button"
                      onClick={() => setParticipants((p) => Math.min(maxParticipants, p + 1))}
                      disabled={participants >= maxParticipants}
                      aria-label={t('increase')}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-forest-700/30 text-forest-800 transition hover:bg-forest-50 disabled:opacity-30"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">{t('participantsHint', { count: slot.remaining })}</p>
                </div>

                <fieldset>
                  <legend className="field-label">{t('language')}</legend>
                  <div className="flex flex-wrap gap-3">
                    {(experience?.languages ?? ['fr', 'en']).map((l) => (
                      <label
                        key={l}
                        className={cn(
                          'inline-flex min-h-[2.75rem] cursor-pointer items-center rounded-full border px-5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-gold-400',
                          language === l ? 'border-forest-700 bg-forest-700 text-white' : 'border-sand-300 hover:border-forest-400'
                        )}
                      >
                        <input type="radio" name="language" value={l} className="sr-only" checked={language === l} onChange={() => setLanguage(l as 'fr' | 'en')} />
                        {l === 'fr' ? t('languageFr') : t('languageEn')}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {/* STEP 4 — details */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 ref={headingRef} tabIndex={-1} className="text-display-md outline-none">{t('steps.details')}</h2>
                <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                  <label>Website<input ref={honeypot} type="text" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField id="b-first" label={t('firstName')} value={details.firstName} onChange={(v) => set('firstName', v)} error={fieldErrors.firstName} autoComplete="given-name" maxLength={80} />
                  <TextField id="b-last" label={t('lastName')} value={details.lastName} onChange={(v) => set('lastName', v)} error={fieldErrors.lastName} autoComplete="family-name" maxLength={80} />
                </div>
                <TextField id="b-email" type="email" label={t('email')} value={details.email} onChange={(v) => set('email', v)} error={fieldErrors.email} autoComplete="email" maxLength={200} />
                <div>
                  <label htmlFor="b-phone" className="field-label">{t('phone')}</label>
                  <div className="flex gap-2">
                    <label htmlFor="b-dial" className="sr-only">{t('dialCode')}</label>
                    <select
                      id="b-dial"
                      value={details.dialCode}
                      onChange={(e) => set('dialCode', e.target.value)}
                      className="field-input w-32 shrink-0 px-3"
                      autoComplete="tel-country-code"
                    >
                      {countries.map((c) => (
                        <option key={c.code} value={c.dial}>
                          {c.code} {c.dial}
                        </option>
                      ))}
                    </select>
                    <input
                      id="b-phone"
                      type="tel"
                      inputMode="tel"
                      value={details.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      autoComplete="tel-national"
                      maxLength={24}
                      className="field-input"
                      aria-invalid={!!fieldErrors.phone}
                      aria-describedby={fieldErrors.phone ? 'b-phone-error' : undefined}
                    />
                  </div>
                  {fieldErrors.phone && <p id="b-phone-error" className="field-error" role="alert">{fieldErrors.phone}</p>}
                </div>
                <div>
                  <label htmlFor="b-country" className="field-label">
                    {t('country')} <span className="font-normal text-ink-muted">({t('optional')})</span>
                  </label>
                  <select id="b-country" value={details.country} onChange={(e) => set('country', e.target.value)} className="field-input" autoComplete="country">
                    <option value="">{t('countryPlaceholder')}</option>
                    {[...countries]
                      .sort((a, b) => a[locale].localeCompare(b[locale], locale))
                      .map((c) => (
                        <option key={c.code} value={c[locale]}>{c[locale]}</option>
                      ))}
                    <option value={t('otherCountry')}>{t('otherCountry')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="b-req" className="field-label">
                    {t('requests')} <span className="font-normal text-ink-muted">({t('optional')})</span>
                  </label>
                  <textarea id="b-req" rows={3} maxLength={1000} value={details.specialRequests} onChange={(e) => set('specialRequests', e.target.value)} placeholder={t('requestsPlaceholder')} className="field-input resize-y" />
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-soft">
                  <input
                    type="checkbox"
                    checked={details.consent}
                    onChange={(e) => set('consent', e.target.checked)}
                    aria-invalid={!!fieldErrors.consent}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-forest-700"
                  />
                  <span>{t('consent')}</span>
                </label>
                {fieldErrors.consent && <p className="field-error" role="alert">{fieldErrors.consent}</p>}
              </div>
            )}

            {/* STEP 5 — review */}
            {step === 4 && slot && experience && (
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-display-md outline-none">{t('summary.title')}</h2>
                <dl className="mt-6 divide-y divide-sand-200 rounded-3xl bg-sand-100 px-5">
                  {([
                    [t('summary.experience'), experience.title, 0],
                    [t('summary.date'), formatDate(slot.date, locale), 1],
                    [t('summary.time'), `${formatTime(slot.start_time)}${slot.end_time ? ` – ${formatTime(slot.end_time)}` : ''} (Dakar)`, 1],
                    [t('summary.participants'), String(participants), 2],
                    [t('summary.language'), language === 'fr' ? t('languageFr') : t('languageEn'), 2],
                    [t('summary.contact'), `${details.firstName} ${details.lastName} · ${details.email} · ${details.dialCode} ${details.phone}${details.country ? ` · ${details.country}` : ''}`, 3],
                    ...(details.specialRequests ? [[t('summary.requests'), details.specialRequests, 3]] : [])
                  ] as Array<[string, string, number]>).map(([k, v, s]) => (
                    <div key={String(k)} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <dt className="text-sm text-ink-muted">{k}</dt>
                      <dd className="flex items-start gap-3 text-right font-medium sm:max-w-[70%]">
                        <span className="break-words text-left sm:text-right">{v}</span>
                        <button type="button" onClick={() => setStep(Number(s))} className="shrink-0 text-xs font-semibold text-forest-600 underline-offset-2 hover:underline">
                          {t('summary.edit')}
                        </button>
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-4">
                    <dt className="font-semibold">{t('summary.total')}</dt>
                    <dd className="font-display text-2xl font-bold text-forest-700">{total ?? <span className="text-base italic text-ink-soft">{t('summary.priceTbc')}</span>}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-ink-muted">{t('summary.totalNote')}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* actions */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-sand-200 pt-6 sm:flex-row sm:justify-between">
          {step > 0 && !(step === 1 && initial && experiences.length === 1) ? (
            <button type="button" onClick={goBack} className="btn-outline btn-lg" disabled={submitting}>
              {t('back')}
            </button>
          ) : (
            <span />
          )}
          {step < 4 ? (
            <button type="button" onClick={goNext} disabled={!canContinue} className="btn-green btn-lg">
              {t('next')}
            </button>
          ) : (
            <button type="button" onClick={confirm} disabled={submitting} className="btn-gold btn-lg">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? t('confirming') : t('confirm')}
            </button>
          )}
        </div>
      </div>

      {/* live summary */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="overflow-hidden rounded-4xl border border-sand-200 bg-white shadow-soft">
          {experience && (
            <Photo src={experience.cover?.src} alt={experience.cover?.alt ?? experience.title} illustration={experience.cover?.illustration} className="aspect-[3/2]" sizes="340px" />
          )}
          <div className="space-y-3 p-6 text-sm">
            <p className="font-display text-lg font-semibold leading-tight text-forest-700">{experience?.title ?? '—'}</p>
            {experience && <p className="text-ink-soft">{experience.duration} · {experience.location}</p>}
            {slot && (
              <p className="font-medium">
                {formatDate(slot.date, locale)} · {formatTime(slot.start_time)}
              </p>
            )}
            {step >= 2 && <p>{t('summary.participants')}: <strong>{participants}</strong></p>}
            {experience && (
              <p className="border-t border-sand-200 pt-3 text-ink-soft">
                {experience.price_xof != null ? (
                  <>
                    {formatPrice(experience.price_xof, locale)} × {participants} = <strong className="text-ink">{total}</strong>
                  </>
                ) : (
                  tp('priceTbc')
                )}
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function TextField({
  id, label, value, onChange, error, type = 'text', autoComplete, maxLength
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; error?: string;
  type?: string; autoComplete?: string; maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="field-input"
      />
      {error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}
