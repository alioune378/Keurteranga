import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/admin/AdminUi';
import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/admin';
import type { Localized } from '@/lib/types';
import { formatDate, formatTime, pick } from '@/lib/utils';
import { cancelBooking, confirmBooking, updateBooking } from '../../../actions';

export default async function BookingDetail({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: b } = await supabase
    .from('bookings')
    .select('*, sessions ( id, date, start_time, end_time, capacity, booked ), experiences ( id, title )')
    .eq('id', id)
    .maybeSingle();
  if (!b) notFound();

  const booking = b as typeof b & {
    sessions: { id: string; date: string; start_time: string; end_time: string | null; capacity: number; booked: number };
    experiences: { id: string; title: Localized };
  };
  const today = new Date().toISOString().slice(0, 10);
  const { data: options } = await supabase
    .from('sessions')
    .select('id, date, start_time, capacity, booked, status')
    .eq('experience_id', booking.experiences.id)
    .gte('date', today < booking.sessions.date ? today : booking.sessions.date)
    .order('date')
    .order('start_time')
    .limit(120);
  const { data: emails } = await supabase.from('email_outbox').select('kind, status, attempts, sent_at, last_error').eq('ref_id', id);
  const here = `/admin/bookings/${id}`;

  return (
    <>
      <Link href="/admin/bookings" className="text-sm font-medium text-forest-700 hover:underline">← Toutes les réservations</Link>
      <PageTitle title={`Réservation ${booking.reference}`}>
        <StatusBadge status={booking.status === 'pending' ? 'request' : booking.status} />
      </PageTitle>
      <Flash ok={sp.ok} err={sp.err} />

      {booking.status === 'pending' && (
        <section className="card mb-6 border-2 border-gold-300 bg-gold-100/40 p-5">
          <h2 className="text-xl">Demande à confirmer</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {booking.first_name} {booking.last_name} · {booking.participants} pers. · <span className="capitalize">{formatDate(booking.sessions.date, 'fr')}</span> à {formatTime(booking.sessions.start_time)}.
            Les places sont mises de côté. En confirmant, le client reçoit son e-mail de confirmation et le créneau apparaît « Réservé » sur le site.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <form action={confirmBooking}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="redirectTo" value={here} />
              <SubmitButton className="btn-lg w-full" pendingLabel="Confirmation…">✓ Confirmer la réservation</SubmitButton>
            </form>
            <form action={cancelBooking}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="redirectTo" value={here} />
              <input type="hidden" name="notify" value="1" />
              <input type="hidden" name="wasPending" value="1" />
              <SubmitButton className="btn-lg w-full bg-terracotta-500 hover:bg-terracotta-700" pendingLabel="Envoi…" confirm="Refuser cette demande ? Les places seront libérées et le client prévenu par e-mail.">
                Refuser la demande
              </SubmitButton>
            </form>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form action={updateBooking} className="card space-y-5 p-5 md:p-6">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="redirectTo" value={here} />
          <h2 className="text-xl">Séance & participants</h2>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <label className="text-sm">Séance
              <select name="sessionId" defaultValue={booking.session_id} className="field-input mt-1">
                {(options ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {formatDate(o.date, 'fr', { weekday: 'short' })} · {formatTime(o.start_time)} — {o.booked}/{o.capacity}
                    {o.status === 'closed' ? ' (fermée)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">Participants
              <input name="participants" type="number" min={1} defaultValue={booking.participants} className="field-input mt-1" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="force" value="1" className="accent-forest-700" /> Autoriser un dépassement de capacité (exception)
          </label>

          <h2 className="pt-2 text-xl">Client</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Prénom<input name="firstName" defaultValue={booking.first_name} required className="field-input mt-1" /></label>
            <label className="text-sm">Nom<input name="lastName" defaultValue={booking.last_name} required className="field-input mt-1" /></label>
            <label className="text-sm">E-mail<input name="email" type="email" defaultValue={booking.email} required className="field-input mt-1" /></label>
            <label className="text-sm">Téléphone<input name="phone" defaultValue={booking.phone} required className="field-input mt-1" /></label>
            <label className="text-sm">Pays de résidence<input name="country" defaultValue={booking.country ?? ''} className="field-input mt-1" /></label>
            <label className="text-sm">Langue de l’atelier
              <select name="language" defaultValue={booking.language} className="field-input mt-1">
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">Demandes particulières
            <textarea name="specialRequests" rows={3} defaultValue={booking.special_requests ?? ''} className="field-input mt-1" />
          </label>
          <label className="block text-sm">Notes internes (non visibles par le client)
            <textarea name="adminNotes" rows={3} defaultValue={booking.admin_notes ?? ''} className="field-input mt-1" />
          </label>
          <SubmitButton>Enregistrer les modifications</SubmitButton>
        </form>

        <div className="space-y-6">
          <section className="card p-5 text-sm">
            <h2 className="text-xl">Résumé</h2>
            <dl className="mt-3 space-y-2">
              <div><dt className="text-ink-muted">Expérience</dt><dd className="font-medium">{pick(booking.experiences.title, 'fr')}</dd></div>
              <div><dt className="text-ink-muted">Séance</dt><dd className="font-medium capitalize">{formatDate(booking.sessions.date, 'fr')} · {formatTime(booking.sessions.start_time)}</dd></div>
              {booking.confirmed_at && <div><dt className="text-ink-muted">Confirmée le</dt><dd>{new Date(booking.confirmed_at).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' })}</dd></div>}
              <div><dt className="text-ink-muted">Demandée le</dt><dd>{new Date(booking.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' })}</dd></div>
              <div><dt className="text-ink-muted">Langue du site</dt><dd className="uppercase">{booking.locale}</dd></div>
              {booking.cancelled_at && <div><dt className="text-ink-muted">Annulée le</dt><dd>{new Date(booking.cancelled_at).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' })}</dd></div>}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`mailto:${booking.email}?subject=${encodeURIComponent(`Kër Téranga — ${booking.reference}`)}`} className="btn-outline px-4 py-2">E-mail</a>
              <a href={`https://wa.me/${booking.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-outline px-4 py-2">WhatsApp</a>
            </div>
          </section>

          <section className="card p-5 text-sm">
            <h2 className="text-xl">E-mails</h2>
            <ul className="mt-3 space-y-2">
              {(emails ?? []).map((e) => (
                <li key={e.kind} className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={e.status} />
                  <span>{{ booking_received: 'Accusé de réception client', booking_client: 'Confirmation client', booking_admin: 'Notification admin', booking_cancelled: 'Annulation / refus client' }[e.kind as string] ?? e.kind}</span>
                  {e.last_error && e.status !== 'sent' && <span className="w-full text-xs text-terracotta-700">{e.last_error}</span>}
                </li>
              ))}
            </ul>
          </section>

          {booking.status === 'confirmed' && (
            <section className="card border-terracotta-300 p-5 text-sm">
              <h2 className="text-xl">Annuler la réservation</h2>
              <p className="mt-2 text-ink-soft">Les places sont immédiatement libérées et la séance se rouvre si elle était complète.</p>
              <form action={cancelBooking} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="redirectTo" value={here} />
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="notify" value="1" defaultChecked className="accent-forest-700" /> Prévenir le client par e-mail
                </label>
                <SubmitButton className="w-full bg-terracotta-500 hover:bg-terracotta-700" confirm="Confirmer l’annulation de cette réservation ?">
                  Annuler la réservation
                </SubmitButton>
              </form>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
