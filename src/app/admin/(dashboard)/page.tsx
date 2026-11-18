import Link from 'next/link';
import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { SubmitButton } from '@/components/admin/AdminUi';
import { requireAdmin } from '@/lib/admin';
import type { Localized } from '@/lib/types';
import { formatDate, formatTime, pick } from '@/lib/utils';
import { cancelBooking, confirmBooking, retryEmails } from '../actions';

const TILES = [
  { href: '/admin/bookings?status=pending', icon: '📥', label: 'Demandes', hint: 'Confirmer ou refuser' },
  { href: '/admin/sessions', icon: '📅', label: 'Calendrier', hint: 'Dates, horaires, places' },
  { href: '/admin/experiences', icon: '🍲', label: 'Expériences', hint: 'Textes, prix, photos' },
  { href: '/admin/communications', icon: '📣', label: 'Annonces', hint: 'Messages sur le site' },
  { href: '/admin/offers', icon: '🏷️', label: 'Offres spéciales', hint: 'Promotions, réductions' },
  { href: '/admin/media', icon: '🖼️', label: 'Affiches & photos', hint: 'Flyers JPG, PNG, PDF' },
  { href: '/admin/settings', icon: '⚙️', label: 'Site & coordonnées', hint: 'Textes, téléphone, adresse' },
  { href: '/admin/bookings', icon: '📋', label: 'Toutes les réservations', hint: 'Historique, export' }
] as const;

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const { supabase } = await requireAdmin();
  const today = new Date().toISOString().slice(0, 10); // Africa/Dakar = UTC
  const in30 = addDays(today, 30);
  const ago30 = new Date(Date.now() - 30 * 864e5).toISOString();

  const [upcoming, recent, cancelled, partners, outbox, requests] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, date, start_time, end_time, capacity, booked, confirmed, status, experiences ( title )')
      .gte('date', today)
      .lte('date', in30)
      .order('date')
      .order('start_time'),
    supabase.from('bookings').select('participants, created_at').eq('status', 'confirmed').gte('created_at', ago30),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'cancelled').gte('cancelled_at', ago30),
    supabase.from('partner_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('email_outbox').select('id, kind, status, attempts, last_error, created_at').in('status', ['pending', 'failed']).order('created_at', { ascending: false }).limit(20),
    supabase
      .from('bookings')
      .select('id, reference, participants, first_name, last_name, phone, language, special_requests, created_at, sessions ( date, start_time ), experiences ( title )')
      .eq('status', 'pending')
      .order('created_at')
      .limit(30)
  ]);
  const pendingRequests = (requests.data ?? []) as unknown as Array<{
    id: string; reference: string; participants: number; first_name: string; last_name: string; phone: string;
    language: string; special_requests: string | null; created_at: string;
    sessions: { date: string; start_time: string } | null; experiences: { title: Localized } | null;
  }>;

  const sessions = (upcoming.data ?? []) as unknown as Array<{
    id: string; date: string; start_time: string; end_time: string | null; capacity: number; booked: number; confirmed: number; status: string;
    experiences: { title: Localized } | null;
  }>;
  const openSessions = sessions.filter((s) => s.status !== 'closed');
  const capacity = openSessions.reduce((a, s) => a + s.capacity, 0);
  const booked = openSessions.reduce((a, s) => a + s.booked, 0);
  const occupancy = capacity ? Math.round((booked / capacity) * 100) : 0;
  const recentBookings = recent.data ?? [];
  const guests30 = recentBookings.reduce((a, b) => a + (b.participants as number), 0);
  const pendingEmails = outbox.data ?? [];

  const kpis = [
    { label: 'Demandes à confirmer', value: pendingRequests.length, href: '/admin/bookings?status=pending' },
    { label: 'Séances à venir (30 j)', value: openSessions.length },
    { label: 'Taux de remplissage (30 j)', value: `${occupancy} %`, hint: `${booked} / ${capacity} places` },
    { label: 'Réservations (30 derniers j)', value: recentBookings.length, hint: `${guests30} participant(s)` },
    { label: 'Annulations (30 derniers j)', value: cancelled.count ?? 0 },
    { label: 'Demandes de partenariat', value: partners.count ?? 0, hint: 'nouvelles', href: '/admin/partners' },
    { label: 'E-mails en attente', value: pendingEmails.length, hint: pendingEmails.some((e) => e.status === 'failed') ? 'dont échecs' : undefined }
  ];

  return (
    <>
      <PageTitle title="Kër Téranga Studio">
        <Link href="/admin/sessions" className="btn-gold">+ Ajouter une date</Link>
      </PageTitle>
      <Flash ok={ok} err={err} />

      {/* big, simple shortcuts — designed for the phone */}
      <ul className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {TILES.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="card flex h-full min-h-[6.5rem] flex-col justify-between gap-2 p-4 transition hover:border-forest-400 hover:bg-forest-50">
              <span className="text-2xl" aria-hidden="true">{t.icon}</span>
              <span>
                <span className="block font-semibold text-forest-800">{t.label}</span>
                <span className="block text-xs text-ink-muted">{t.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* booking requests waiting for the owner */}
      <section className="mb-8">
        <h2 className="mb-3 text-2xl">Demandes à confirmer {pendingRequests.length > 0 && <span className="ml-1 rounded-full bg-gold-100 px-2.5 py-0.5 align-middle text-base text-gold-600">{pendingRequests.length}</span>}</h2>
        {pendingRequests.length === 0 ? (
          <p className="card p-5 text-ink-soft">Aucune demande en attente. Les nouvelles demandes de réservation apparaîtront ici.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {pendingRequests.map((r) => (
              <li key={r.id} className="card border-gold-300 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.first_name} {r.last_name} · {r.participants} pers.</p>
                    <p className="text-sm capitalize text-ink-soft">
                      {r.sessions ? `${formatDate(r.sessions.date, 'fr')} · ${formatTime(r.sessions.start_time)}` : '—'}
                    </p>
                    <p className="text-xs text-ink-muted">{pick(r.experiences?.title, 'fr')} · atelier en {r.language === 'en' ? 'anglais' : 'français'} · {r.reference}</p>
                    {r.special_requests && <p className="mt-1 text-xs italic text-ink-soft">« {r.special_requests} »</p>}
                  </div>
                  <Link href={`/admin/bookings/${r.id}`} className="text-sm font-semibold text-forest-700 hover:underline">Détails</Link>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <form action={confirmBooking}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="redirectTo" value="/admin" />
                    <SubmitButton className="w-full" pendingLabel="…">✓ Confirmer</SubmitButton>
                  </form>
                  <form action={cancelBooking}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="redirectTo" value="/admin" />
                    <input type="hidden" name="notify" value="1" />
                    <input type="hidden" name="wasPending" value="1" />
                    <SubmitButton className="btn-outline w-full" pendingLabel="…" confirm="Refuser cette demande ? Le client sera prévenu par e-mail.">Refuser</SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <li key={k.label} className="card p-4">
            <p className="text-xs font-medium text-ink-muted">{k.label}</p>
            <p className="mt-1 font-display text-3xl text-forest-800">
              {k.href ? <Link href={k.href} className="hover:underline">{k.value}</Link> : k.value}
            </p>
            {k.hint && <p className="text-xs text-ink-muted">{k.hint}</p>}
          </li>
        ))}
      </ul>

      {pendingEmails.length > 0 && (
        <section className="card mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl">E-mails en attente d’envoi</h2>
              <p className="text-sm text-ink-soft">Les réservations sont bien enregistrées. Les e-mails sont renvoyés automatiquement ; vous pouvez aussi relancer maintenant.</p>
            </div>
            <form action={retryEmails}>
              <input type="hidden" name="redirectTo" value="/admin" />
              <SubmitButton pendingLabel="Envoi…">Renvoyer maintenant</SubmitButton>
            </form>
          </div>
          <ul className="mt-4 divide-y divide-sand-200 text-sm">
            {pendingEmails.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-2">
                <StatusBadge status={e.status} />
                <span className="font-medium">{e.kind}</span>
                <span className="text-ink-muted">{e.attempts} tentative(s)</span>
                {e.last_error && <span className="truncate text-terracotta-700">{e.last_error}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-2xl">Prochaines séances</h2>
        {sessions.length === 0 ? (
          <p className="card p-6 text-ink-soft">Aucune séance dans les 30 prochains jours. <Link href="/admin/sessions" className="font-semibold text-forest-700 underline">Créer des séances</Link></p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {sessions.slice(0, 12).map((s) => {
              const pct = Math.min(100, Math.round((s.booked / s.capacity) * 100));
              return (
                <li key={s.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold capitalize">{formatDate(s.date, 'fr')}</p>
                      <p className="text-sm text-ink-soft">
                        {formatTime(s.start_time)}{s.end_time ? `–${formatTime(s.end_time)}` : ''} · {pick(s.experiences?.title, 'fr')}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Remplissage">
                    <div className={`h-full rounded-full ${pct >= 100 ? 'bg-gold-500' : 'bg-forest-600'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-ink-soft">
                    <span>{s.confirmed} confirmée(s){s.booked > s.confirmed ? ` · ${s.booked - s.confirmed} en attente` : ''} / {s.capacity} places</span>
                    <Link href={`/admin/bookings?session=${s.id}`} className="font-semibold text-forest-700 hover:underline">Voir les participants →</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
