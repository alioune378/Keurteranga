'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, CheckCircle2, Clock, Loader2, Minus, Plus, Radio, Tag, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { checkPromoCode, createBooking } from '@/app/actions';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { Photo } from '@/components/ui/Photo';
import { countries } from '@/data/countries';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { AvailabilitySlot, BookingErrorCode, ExperienceSummary } from '@/lib/types';
import { cn, formatDate, formatPrice, formatTime, pick } from '@/lib/utils';
import { discountedTotal, discountLabel, normalizeCode, type PromoDiscount } from '@/lib/promo';
import { EMAIL_RE } from '@/lib/validation';
import { useUpcomingSessions } from '@/lib/useUpcoming';
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
  initialSlug,
  initialCode,
  initialDate
}: {
  experiences: ExperienceSummary[];
  initialSlug?: string;
  /** a date chosen from the home page ("Book this date", YYYY-MM-DD) */
  initialDate?: string;
  /** partner / influencer code from the link (?code=AWA10) */
  initialCode?: string;
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
  const startDate = initial && initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) && initialDate >= today ? initialDate : null;
  const [month, setMonth] = useState(monthOf(startDate ?? today));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<string | null>(startDate);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [participants, setParticipants] = useState(1);
  const [language, setLanguage] = useState<'fr' | 'en'>(locale);
  // partner / influencer promo code
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<PromoDiscount | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [details, setDetails] = useState<Details>({
    firstName: '', lastName: '', email: '', dialCode: '+221', phone: '', country: '', specialRequests: '', consent: false
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<BookingErrorCode | null>(null);
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [policyError, setPolicyError] = useState(false);

  // one idempotency key per booking attempt: retries/double-clicks never duplicate
  const idemKey = useRef<string>('');
  const startedAt = useRef<number>(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    idemKey.current = crypto.randomUUID();
    startedAt.current = Date.now();
  }, []);

  // a partner link (?code=AWA10) applies the code automatically; it is kept for
  // this visit so the guest can browse the site and book later
  useEffect(() => {
    let code = initialCode ? normalizeCode(initialCode) : '';
    try {
      if (code) sessionStorage.setItem('kt-promo', code);
      else code = sessionStorage.getItem('kt-promo') ?? '';
    } catch {
      /* storage unavailable: the code from the link still works */
    }
    if (code) {
      setPromoInput(code);
      void applyPromo(code, true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function applyPromo(raw = promoInput, silent = false) {
    const code = normalizeCode(raw);
    setPromoError(null);
    if (!code) return;
    setPromoChecking(true);
    try {
      const res = await checkPromoCode(code);
      if (res.ok) {
        setPromo(res.promo);
        setPromoInput(res.promo.code);
        try {
          sessionStorage.setItem('kt-promo', res.promo.code);
        } catch {
          /* ignore */
        }
      } else {
        setPromo(null);
        if (!silent) setPromoError(t(res.error === 'RATE_LIMITED' ? 'errors.RATE_LIMITED' : 'promo.invalid'));
        if (res.error === 'INVALID_PROMO') {
          try {
            sessionStorage.removeItem('kt-promo');
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      if (!silent) setPromoError(t('errors.generic'));
    } finally {
      setPromoChecking(false);
    }
  }

  function removePromo() {
    setPromo(null);
    setPromoInput('');
    setPromoError(null);
    try {
      sessionStorage.removeItem('kt-promo');
    } catch {
      /* ignore */
    }
  }

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

  // a date chosen beforehand (home page): pick its time slot automatically when there is only one
  useEffect(() => {
    if (!date || slotId) return;
    const open = slots.filter((s) => s.date === date && s.remaining > 0);
    if (open.length === 1) setSlotId(open[0].id);
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  // next open dates, shown as cards above the calendar
  const upcoming = useUpcomingSessions(experienceId, 6);

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
    if (!policyAccepted) {
      setPolicyError(true);
      return;
    }
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
        promoCode: promo?.code ?? '',
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
      if (res.error === 'INVALID_PROMO') {
        // the code expired or was paused meanwhile: remove it, the guest can book without it
        removePromo();
        setPromoError(t('promo.invalid'));
        setStep(3);
      }
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
    setPolicyAccepted(false);
    setPolicyError(false);
    setStep(initial ? 1 : 0);
    fetchAvailability();
  }

  const set = <K extends keyof Details>(k: K, v: Details[K]) => setDetails((d) => ({ ...d, [k]: v }));
  const countryName = (code: string) => countries.find((c) => c.code === code)?.[locale] ?? code;
  // a special price set on the chosen session wins over the experience price
  const unitPrice = slot?.price_xof ?? experience?.price_xof ?? null;
  const subtotal = unitPrice != null ? unitPrice * participants : null;
  const total = subtotal != null ? formatPrice(discountedTotal(subtotal, promo), locale) : null;

  // ------------------------------------------------------------------ success
  if (done) {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-xl overflow-hidden rounded-4xl border border-sand-200 bg-white text-center shadow-soft"
        role="status"
      >
        <div className="bg-clay-50 px-6 py-10">
          <p className="font-hand text-[1.8rem] leading-none text-clay-500" lang="wo">Jërëjëf !</p>
          <span className="mx-auto mt-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-clay-500 text-white">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-display-md outline-none">
            {t('success.title')}
          </h2>
        </div>
        <div className="space-y-5 p-6 md:p-8">
          <p className="text-lg">{t('success.text', { email: details.email })}</p>
          <div className="rounded-3xl border-2 border-dashed border-saffron-300 bg-saffron-100/40 p-5">
            <p className="text-sm font-semibold text-ink-muted">{t('success.reference')}</p>
            <p className="mt-1 select-all font-display text-3xl font-bold tracking-wider text-kola-700">{done.reference}</p>
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
      <div className="rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-kola-100 md:p-8">
        {/* progress */}
        <nav aria-label={t('stepOf', { current: step + 1, total: STEPS.length })} className="mb-6">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-kola-700">{t(`steps.${STEPS[step]}`)}</span>
            <span className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
              {step + 1}/{STEPS.length}
            </span>
          </div>
          <ol className="mt-3 grid grid-cols-5 gap-1.5">
            {STEPS.map((s, i) => (
              <li key={s} aria-current={i === step ? 'step' : undefined}>
                <span className={cn('block h-1.5 rounded-full transition-colors', i < step ? 'bg-clay-500' : i === step ? 'bg-saffron-400' : 'bg-kola-100')} />
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
                        'flex cursor-pointer items-center gap-4 rounded-3xl border p-3 transition focus-within:ring-2 focus-within:ring-saffron-400',
                        experienceId === e.id ? 'border-clay-500 bg-clay-50 ring-1 ring-clay-500' : 'border-sand-300 hover:border-kola-400'
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
                        <span className="block font-display text-lg font-semibold leading-tight text-kola-700">{e.title}</span>
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
                  <Radio className="h-4 w-4 text-kola-500" aria-hidden="true" /> {t('realtime')} · {t('timeZoneNote')}
                </p>
                {upcoming && upcoming.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-hand text-[1.6rem] leading-none text-clay-500">{t('upcoming.title')}</h3>
                    <ul className="no-scrollbar -mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2">
                      {upcoming.map((s) => {
                        const selected = slotId === s.id;
                        return (
                          <li key={s.id} className="shrink-0">
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={() => {
                                setMonth(monthOf(s.date));
                                setDate(s.date);
                                setSlotId(s.id);
                              }}
                              className={cn(
                                'flex w-[7.5rem] flex-col items-center rounded-[1.25rem] border px-3 py-3 text-center transition',
                                selected ? 'border-clay-500 bg-clay-500 text-white' : 'border-kola-200 bg-white hover:border-clay-400'
                              )}
                            >
                              <span className={cn('text-xs font-semibold uppercase tracking-wide', selected ? 'text-white/80' : 'text-ink-muted')}>
                                {formatDate(s.date, locale, { weekday: 'short', day: undefined, month: undefined, year: undefined })}
                              </span>
                              <span className={cn('font-display text-3xl font-semibold leading-tight', selected ? 'text-white' : 'text-kola-700')}>
                                {Number(s.date.slice(8, 10))}
                              </span>
                              <span className={cn('text-xs font-semibold capitalize', selected ? 'text-white' : 'text-kola-700')}>
                                {formatDate(s.date, locale, { weekday: undefined, day: undefined, month: 'short', year: undefined })} · {formatTime(s.start_time)}
                              </span>
                              <span className={cn('mt-1 text-[0.7rem]', selected ? 'text-white/85' : s.remaining <= 2 ? 'font-semibold text-bissap-500' : 'text-ink-muted')}>
                                {t('spotsLeft', { count: s.remaining })}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-4 text-sm font-semibold text-ink-soft">{t('upcoming.calendar')}</p>
                  </div>
                )}
                <div className="mt-4 grid gap-8 md:grid-cols-[1fr_220px]">
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
                      booked: t('legendBooked'),
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
                        <p className="text-sm font-medium capitalize text-kola-800">{formatDate(date, locale, { year: undefined })}</p>
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
                              slotId === s.id ? 'border-clay-500 bg-clay-50 ring-1 ring-clay-500' : 'border-sand-300 hover:border-kola-400',
                              s.remaining <= 0 && 'cursor-not-allowed border-dashed bg-sand-100 opacity-70'
                            )}
                          >
                            <span className="flex items-center gap-2 font-semibold">
                              <Clock className="h-4 w-4 text-saffron-500" aria-hidden="true" />
                              {formatTime(s.start_time)}
                              {s.end_time && <span className="font-normal text-ink-muted">– {formatTime(s.end_time)}</span>}
                            </span>
                            <span className="flex flex-col items-end gap-0.5 text-right">
                              <span className={cn('text-xs', s.remaining <= 2 ? 'font-semibold text-terracotta-700' : 'text-ink-muted')}>
                                {s.remaining > 0
                                  ? t('spotsLeft', { count: s.remaining })
                                  : s.confirmed >= s.capacity
                                    ? t('booked')
                                    : t('full')}
                              </span>
                              {pick(s.label ?? undefined, locale) && (
                                <span className="text-[0.7rem] font-semibold text-saffron-600">{pick(s.label ?? undefined, locale)}</span>
                              )}
                              {s.price_xof != null && s.remaining > 0 && (
                                <span className="text-[0.7rem] text-ink-muted">{formatPrice(s.price_xof, locale)}</span>
                              )}
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
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-kola-700/30 text-kola-800 transition hover:bg-kola-50 disabled:opacity-30"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <output aria-live="polite" className="w-14 text-center font-display text-4xl font-bold text-kola-700">{participants}</output>
                    <button
                      type="button"
                      onClick={() => setParticipants((p) => Math.min(maxParticipants, p + 1))}
                      disabled={participants >= maxParticipants}
                      aria-label={t('increase')}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-kola-700/30 text-kola-800 transition hover:bg-kola-50 disabled:opacity-30"
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
                          'inline-flex min-h-[2.75rem] cursor-pointer items-center rounded-full border px-5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-saffron-400',
                          language === l ? 'border-kola-700 bg-kola-700 text-white' : 'border-sand-300 hover:border-kola-400'
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
                <div>
                  <label htmlFor="b-promo" className="field-label">
                    {t('promo.label')} <span className="font-normal text-ink-muted">({t('optional')})</span>
                  </label>
                  {promo ? (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-kola-300 bg-kola-50 px-4 py-3" role="status">
                      <span className="flex items-center gap-2 text-sm font-semibold text-kola-800">
                        <Tag className="h-4 w-4" aria-hidden="true" />
                        {t('promo.applied', { code: promo.code, discount: discountLabel(promo, locale) })}
                      </span>
                      <button type="button" onClick={removePromo} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-terracotta-700">
                        <X className="h-3.5 w-3.5" aria-hidden="true" /> {t('promo.remove')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        id="b-promo"
                        type="text"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void applyPromo();
                          }
                        }}
                        placeholder={t('promo.placeholder')}
                        autoComplete="off"
                        autoCapitalize="characters"
                        maxLength={30}
                        className="field-input uppercase"
                        aria-invalid={!!promoError}
                        aria-describedby={promoError ? 'b-promo-error' : undefined}
                      />
                      <button type="button" onClick={() => applyPromo()} disabled={!promoInput.trim() || promoChecking} className="btn-outline shrink-0 px-5">
                        {promoChecking && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {t('promo.apply')}
                      </button>
                    </div>
                  )}
                  {promoError && <p id="b-promo-error" className="field-error" role="alert">{promoError}</p>}
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-soft">
                  <input
                    type="checkbox"
                    checked={details.consent}
                    onChange={(e) => set('consent', e.target.checked)}
                    aria-invalid={!!fieldErrors.consent}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-kola-700"
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
                    ...(details.specialRequests ? [[t('summary.requests'), details.specialRequests, 3]] : []),
                    ...(promo ? [[t('promo.summary'), `${promo.code} (${discountLabel(promo, locale)})`, 3]] : [])
                  ] as Array<[string, string, number]>).map(([k, v, s]) => (
                    <div key={String(k)} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <dt className="text-sm text-ink-muted">{k}</dt>
                      <dd className="flex items-start gap-3 text-right font-medium sm:max-w-[70%]">
                        <span className="break-words text-left sm:text-right">{v}</span>
                        <button type="button" onClick={() => setStep(Number(s))} className="shrink-0 text-xs font-semibold text-kola-600 underline-offset-2 hover:underline">
                          {t('summary.edit')}
                        </button>
                      </dd>
                    </div>
                  ))}
                  {promo && subtotal != null && (
                    <div className="flex items-center justify-between py-3.5 text-sm">
                      <dt className="text-ink-muted">{t('promo.before')}</dt>
                      <dd className="text-ink-muted line-through">{formatPrice(subtotal, locale)}</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-4">
                    <dt className="font-semibold">{t('summary.total')}</dt>
                    <dd className="font-display text-2xl font-bold text-kola-700">{total ?? <span className="text-base italic text-ink-soft">{t('summary.priceTbc')}</span>}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-ink-muted">{t('summary.totalNote')}</p>
                <div className="mt-6 rounded-3xl border border-terracotta-300 bg-white p-5">
                  <h3 className="font-semibold text-ink">{t('policy.title')}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t('policy.text')}</p>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-soft">
                    <input
                      type="checkbox"
                      checked={policyAccepted}
                      onChange={(e) => {
                        setPolicyAccepted(e.target.checked);
                        if (e.target.checked) setPolicyError(false);
                      }}
                      aria-invalid={policyError}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-kola-700"
                    />
                    <span>{t('policy.accept')}</span>
                  </label>
                  {policyError && <p className="field-error mt-2" role="alert">{t('errors.policy')}</p>}
                </div>
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
        <div className="rounded-[2rem] bg-clay-500 p-2 shadow-soft">
          <div className="overflow-hidden rounded-[1.6rem] border-2 border-dashed border-clay-200 bg-white">
          {experience && (
            <Photo src={experience.cover?.src} alt={experience.cover?.alt ?? experience.title} illustration={experience.cover?.illustration} className="aspect-[3/2]" sizes="340px" />
          )}
          <div className="space-y-3 p-6 text-sm">
            <p className="font-hand text-[1.6rem] leading-none text-clay-500">{t('invitation')}</p>
            <p className="font-display text-lg font-semibold leading-tight text-kola-700">{experience?.title ?? '—'}</p>
            {experience && <p className="text-ink-soft">{experience.duration} · {experience.location}</p>}
            {slot && (
              <p className="font-medium">
                {formatDate(slot.date, locale)} · {formatTime(slot.start_time)}
              </p>
            )}
            {step >= 2 && <p>{t('summary.participants')}: <strong>{participants}</strong></p>}
            {experience && (
              <p className="border-t border-sand-200 pt-3 text-ink-soft">
                {unitPrice != null ? (
                  <>
                    {formatPrice(unitPrice, locale)} × {participants}
                    {promo && <> {discountLabel(promo, locale)}</>} = <strong className="text-ink">{total}</strong>
                  </>
                ) : (
                  tp('priceTbc')
                )}
              </p>
            )}
            {promo && (
              <p className="flex items-center gap-1.5 font-semibold text-kola-700">
                <Tag className="h-4 w-4" aria-hidden="true" /> {promo.code} · {discountLabel(promo, locale)}
              </p>
            )}
          </div>
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
