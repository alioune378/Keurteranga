'use client';

import { useEffect, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { AvailabilitySlot } from '@/lib/types';

function iso(d: Date) {
  return d.toISOString().slice(0, 10); // Dakar = UTC+0
}

/**
 * Next bookable sessions of an experience (seats left > 0), soonest first.
 * Reads the same public `get_availability` function as the booking calendar.
 * `undefined` while loading, `[]` when nothing is open.
 */
export function useUpcomingSessions(experienceId: string | null | undefined, limit = 6, days = 120) {
  const [slots, setSlots] = useState<AvailabilitySlot[] | undefined>(undefined);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase || !experienceId) {
      setSlots([]);
      return;
    }
    let alive = true;
    const today = new Date();
    const until = new Date(today.getTime() + days * 86_400_000);
    supabase
      .rpc('get_availability', { p_experience_id: experienceId, p_from: iso(today), p_to: iso(until) })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error(error);
          setSlots([]);
          return;
        }
        const now = iso(new Date());
        const open = ((data ?? []) as AvailabilitySlot[])
          .filter((s) => s.remaining > 0 && s.date >= now)
          .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))
          .slice(0, limit);
        setSlots(open);
      });
    return () => {
      alive = false;
    };
  }, [experienceId, limit, days]);

  return slots;
}
