import Link from 'next/link';
import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/admin';
import { queryBookings, type BookingFilters } from '@/lib/admin-bookings';
import { formatDate, formatTime, pick } from '@/lib/utils';

export default async function BookingsPage({
  searchParams
}: {
  searchParams: Promise<BookingFilters & { ok?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { rows, error } = await queryBookings(supabase, sp, 300);
  const qs = new URLSearchParams(
    Object.entries({ q: sp.q, status: sp.status, from: sp.from, to: sp.to, session: sp.session }).filter(([, v]) => v) as [string, string][]
  ).toString();
  const guests = rows.filter((r) => r.status === 'confirmed').reduce((a, r) => a + r.participants, 0);

  return (
    <>
      <PageTitle title="Réservations">
        <a href={`/admin/bookings/export${qs ? `?${qs}` : ''}`} className="btn-outline">Exporter (CSV / Excel)</a>
      </PageTitle>
      <Flash ok={sp.ok} err={sp.err ?? error?.message} />

      <form method="get" className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
        <label className="text-sm">Recherche
          <input name="q" defaultValue={sp.q} placeholder="Nom, e-mail, téléphone, référence…" className="field-input mt-1 py-2" />
        </label>
        <label className="text-sm">Statut
          <select name="status" defaultValue={sp.status ?? ''} className="field-input mt-1 py-2">
            <option value="">Tous</option>
            <option value="confirmed">Confirmées</option>
            <option value="cancelled">Annulées</option>
          </select>
        </label>
        <label className="text-sm">Séance du<input type="date" name="from" defaultValue={sp.from} className="field-input mt-1 py-2" /></label>
        <label className="text-sm">au<input type="date" name="to" defaultValue={sp.to} className="field-input mt-1 py-2" /></label>
        {sp.session && <input type="hidden" name="session" value={sp.session} />}
        <button className="btn-green py-2.5">Filtrer</button>
      </form>

      <p className="mb-3 text-sm text-ink-soft">
        {rows.length} réservation(s) · {guests} participant(s) confirmé(s)
        {sp.session && <> · <Link href="/admin/bookings" className="font-semibold underline">voir toutes les séances</Link></>}
      </p>

      {/* mobile cards / desktop table */}
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="hidden bg-sand-100 text-xs uppercase tracking-wide text-ink-muted md:table-header-group">
            <tr>
              <th className="p-3">Référence</th>
              <th className="p-3">Séance</th>
              <th className="p-3">Client</th>
              <th className="p-3">Pers.</th>
              <th className="p-3">Langue</th>
              <th className="p-3">Statut</th>
              <th className="p-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {rows.map((r) => (
              <tr key={r.id} className="grid grid-cols-2 gap-1 p-3 md:table-row md:p-0">
                <td className="font-mono font-semibold md:p-3">{r.reference}</td>
                <td className="text-right md:p-3 md:text-left">
                  {r.sessions ? <span className="capitalize">{formatDate(r.sessions.date, 'fr', { weekday: 'short', year: undefined })} · {formatTime(r.sessions.start_time)}</span> : '—'}
                  <span className="block text-xs text-ink-muted">{pick(r.experiences?.title, 'fr')}</span>
                </td>
                <td className="col-span-2 md:p-3">
                  {r.first_name} {r.last_name}
                  <span className="block text-xs text-ink-muted">{r.email} · {r.phone}</span>
                </td>
                <td className="md:p-3">{r.participants} pers.</td>
                <td className="text-right uppercase md:p-3 md:text-left">{r.language}</td>
                <td className="md:p-3"><StatusBadge status={r.status} /></td>
                <td className="text-right md:p-3">
                  <Link href={`/admin/bookings/${r.id}`} className="font-semibold text-forest-700 hover:underline">Ouvrir →</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-ink-soft">Aucune réservation ne correspond.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
