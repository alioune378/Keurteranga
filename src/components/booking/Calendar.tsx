'use client';

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import type { Locale } from '@/i18n/routing';
import type { AvailabilitySlot } from '@/lib/types';
import { cn, toISODate } from '@/lib/utils';

/** full = seats held by requests awaiting confirmation · booked = seats confirmed by Kër Téranga */
type DayState = 'available' | 'full' | 'booked' | 'unavailable';

interface CalendarProps {
  locale: Locale;
  month: string; // YYYY-MM
  minMonth: string; // YYYY-MM
  slots: AvailabilitySlot[];
  selectedDate: string | null;
  loading: boolean;
  onSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
  labels: { prev: string; next: string; available: string; full: string; booked: string; unavailable: string; selected: string };
}

function addMonths(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Accessible month calendar: a grid of buttons, arrow-key navigation,
 * unavailable / full dates disabled and announced to screen readers.
 */
export function Calendar({ locale, month, minMonth, slots, selectedDate, loading, onSelect, onMonthChange, labels }: CalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const intlLocale = locale === 'fr' ? 'fr-FR' : 'en-GB';

  const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intlLocale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + i)))
  );
  const longFmt = new Intl.DateTimeFormat(intlLocale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  const byDate = new Map<string, AvailabilitySlot[]>();
  for (const s of slots) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);

  const stateOf = (iso: string): DayState => {
    const list = byDate.get(iso);
    if (!list?.length) return 'unavailable';
    if (list.some((s) => s.remaining > 0)) return 'available';
    return list.every((s) => s.confirmed >= s.capacity) ? 'booked' : 'full';
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(Date.UTC(y, m - 1, i + 1))));

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const iso = target.dataset.date;
    if (!iso) return;
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const delta = moves[e.key];
    if (!delta) return;
    e.preventDefault();
    const [yy, mm, dd] = iso.split('-').map(Number);
    const next = toISODate(new Date(Date.UTC(yy, mm - 1, dd + delta)));
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus();
  }

  const canPrev = month > minMonth;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, -1))}
          disabled={!canPrev}
          aria-label={labels.prev}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sand-300 text-kola-700 transition hover:bg-kola-50 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="flex items-center gap-2 font-display text-xl font-semibold capitalize" aria-live="polite">
          {monthLabel}
          {loading && <Loader2 className="h-4 w-4 animate-spin text-ink-muted" aria-hidden="true" />}
        </h3>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          aria-label={labels.next}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sand-300 text-kola-800 transition hover:bg-kola-50"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div ref={gridRef} role="grid" aria-label={monthLabel} onKeyDown={onKeyDown} className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {weekdays.map((w) => (
          <div key={w} role="columnheader" className="pb-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted sm:text-xs">
            {w.replace('.', '')}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`pad-${i}`} aria-hidden="true" />
        ))}
        {days.map((iso) => {
          const state = stateOf(iso);
          const selected = iso === selectedDate;
          const disabled = state !== 'available';
          const day = Number(iso.slice(8));
          const stateLabel =
            state === 'available' ? labels.available : state === 'full' ? labels.full : state === 'booked' ? labels.booked : labels.unavailable;
          return (
            <div role="gridcell" key={iso}>
              <button
                type="button"
                data-date={iso}
                disabled={disabled}
                aria-disabled={disabled}
                aria-pressed={selected}
                aria-label={`${longFmt.format(new Date(`${iso}T00:00:00Z`))} — ${stateLabel}`}
                onClick={() => onSelect(iso)}
                className={cn(
                  'relative flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-full text-sm font-semibold tabular-nums transition duration-200',
                  selected && 'bg-clay-500 text-white shadow-soft',
                  !selected && state === 'available' && 'bg-white text-kola-700 ring-1 ring-inset ring-clay-400/60 hover:bg-clay-50 hover:ring-clay-500',
                  state === 'full' && 'cursor-not-allowed bg-saffron-100 font-medium text-saffron-600',
                  state === 'booked' && 'cursor-not-allowed bg-terracotta-100 font-medium text-terracotta-700/70 line-through',
                  state === 'unavailable' && 'cursor-not-allowed bg-sand-100 font-normal text-ink-muted/50'
                )}
              >
                {day}
                {state === 'available' && !selected && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-saffron-400 sm:bottom-1.5" aria-hidden="true" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-4 text-xs text-ink-soft" aria-hidden="true">
        <li className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-white ring-1 ring-inset ring-clay-400/60" /> {labels.available}</li>
        <li className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-clay-500" /> {labels.selected}</li>
        <li className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-saffron-100" /> {labels.full}</li>
        <li className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-terracotta-100" /> {labels.booked}</li>
        <li className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-sand-100" /> {labels.unavailable}</li>
      </ul>
    </div>
  );
}
