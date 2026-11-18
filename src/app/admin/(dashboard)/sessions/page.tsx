import Link from 'next/link';
import { SubmitButton } from '@/components/admin/AdminUi';
import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/admin';
import type { Localized } from '@/lib/types';
import { formatDate, formatTime, pick } from '@/lib/utils';
import { blockDate, createRecurringSessions, createSession, deleteSession, unblockDate, updateSession } from '../../actions';

const WEEKDAYS = [
  [1, 'Lun'], [2, 'Mar'], [3, 'Mer'], [4, 'Jeu'], [5, 'Ven'], [6, 'Sam'], [0, 'Dim']
] as const;

export default async function SessionsPage({
  searchParams
}: {
  searchParams: Promise<{ ok?: string; err?: string; exp?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : today.slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  const from = `${month}-01`;
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);

  const { data: exps } = await supabase.from('experiences').select('id, title, status').neq('status', 'archived').order('sort_order');
  const experiences = (exps ?? []) as Array<{ id: string; title: Localized; status: string }>;
  const expId = sp.exp && experiences.some((e) => e.id === sp.exp) ? sp.exp : experiences[0]?.id;
  const here = `/admin/sessions?exp=${expId ?? ''}&month=${month}`;

  const [{ data: sessions }, { data: blocked }] = await Promise.all([
    supabase.from('sessions').select('*').eq('experience_id', expId ?? '00000000-0000-0000-0000-000000000000').gte('date', from).lte('date', to).order('date').order('start_time'),
    supabase.from('blocked_dates').select('id, date, reason, experience_id').gte('date', today).order('date')
  ]);
  const blockedSet = new Set((blocked ?? []).filter((b) => !b.experience_id || b.experience_id === expId).map((b) => b.date));
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${from}T00:00:00Z`));

  if (!experiences.length) {
    return (
      <>
        <PageTitle title="Séances" />
        <p className="card p-6">Créez d’abord une expérience. <Link className="font-semibold underline" href="/admin/experiences/new">Nouvelle expérience</Link></p>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Séances & disponibilités" />
      <Flash ok={sp.ok} err={sp.err} />
      <p className="mb-6 text-sm text-ink-soft">Toutes les heures sont à l’heure de Dakar (GMT). Les demandes des clients mettent des places de côté ; quand vous les confirmez, la séance s’affiche « Réservé » sur le site. Une séance passe automatiquement en « Complète » quand toutes les places sont prises, et se rouvre si une demande est refusée ou annulée.</p>

      {/* filters */}
      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4" method="get">
        <div>
          <label className="field-label" htmlFor="exp">Expérience</label>
          <select id="exp" name="exp" defaultValue={expId} className="field-input py-2">
            {experiences.map((e) => <option key={e.id} value={e.id}>{pick(e.title, 'fr')}{e.status === 'draft' ? ' (brouillon)' : ''}</option>)}
          </select>
        </div>
        <input type="hidden" name="month" value={month} />
        <button className="btn-outline py-2.5">Afficher</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* list */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-sand-200 p-4">
            <Link href={`/admin/sessions?exp=${expId}&month=${prev}`} className="rounded-full px-3 py-1 hover:bg-sand-200">← Mois préc.</Link>
            <h2 className="text-xl capitalize">{monthLabel}</h2>
            <Link href={`/admin/sessions?exp=${expId}&month=${next}`} className="rounded-full px-3 py-1 hover:bg-sand-200">Mois suiv. →</Link>
          </div>
          {(sessions ?? []).length === 0 ? (
            <p className="p-6 text-ink-soft">Aucune séance ce mois-ci.</p>
          ) : (
            <ul className="divide-y divide-sand-200">
              {(sessions ?? []).map((s) => (
                <li key={s.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold capitalize">
                        {formatDate(s.date, 'fr')} · {formatTime(s.start_time)}{s.end_time ? `–${formatTime(s.end_time)}` : ''}
                      </p>
                      {(pick(s.label, 'fr') || s.price_xof != null) && (
                        <p className="text-sm font-semibold text-gold-600">
                          {pick(s.label, 'fr')}{pick(s.label, 'fr') && s.price_xof != null ? ' · ' : ''}
                          {s.price_xof != null && `Prix spécial ${s.price_xof.toLocaleString('fr-FR')} FCFA`}
                        </p>
                      )}
                      <p className="text-sm text-ink-soft">
                        {s.confirmed} confirmée(s){s.booked > s.confirmed ? ` + ${s.booked - s.confirmed} en attente` : ''} / {s.capacity} places
                        {blockedSet.has(s.date) && <span className="ml-2 font-semibold text-terracotta-700">· date bloquée</span>}
                        {s.notes && <span className="ml-2 italic">· {s.notes}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s.status} />
                      <Link href={`/admin/bookings?session=${s.id}`} className="text-sm font-semibold text-forest-700 hover:underline">Participants</Link>
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium text-forest-700">Modifier</summary>
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <form action={updateSession} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="booked" value={s.booked} />
                        <input type="hidden" name="redirectTo" value={here} />
                        <label className="text-xs">Début<input name="start" type="time" defaultValue={formatTime(s.start_time)} className="field-input mt-1 w-28 py-2" /></label>
                        <label className="text-xs">Fin<input name="end" type="time" defaultValue={formatTime(s.end_time)} className="field-input mt-1 w-28 py-2" /></label>
                        <label className="text-xs">Capacité<input name="capacity" type="number" min={Math.max(1, s.booked)} defaultValue={s.capacity} className="field-input mt-1 w-24 py-2" /></label>
                        <label className="text-xs">Note<input name="notes" defaultValue={s.notes ?? ''} maxLength={300} className="field-input mt-1 w-40 py-2" /></label>
                        <label className="text-xs">Prix spécial (FCFA)<input name="price" type="number" min={0} step={500} defaultValue={s.price_xof ?? ''} placeholder="prix normal" className="field-input mt-1 w-32 py-2" /></label>
                        <label className="text-xs">Titre public (FR)<input name="label_fr" defaultValue={pick(s.label, 'fr') ?? ''} maxLength={80} className="field-input mt-1 w-48 py-2" /></label>
                        <label className="text-xs">Titre public (EN)<input name="label_en" defaultValue={s.label?.en ?? ''} maxLength={80} className="field-input mt-1 w-48 py-2" /></label>
                        <input type="hidden" name="hasExtras" value="1" />
                        <SubmitButton className="py-2.5">Enregistrer</SubmitButton>
                      </form>
                      <form action={updateSession}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="redirectTo" value={here} />
                        <input type="hidden" name="status" value={s.status === 'closed' ? 'open' : 'closed'} />
                        <SubmitButton className="btn-outline py-2.5">{s.status === 'closed' ? 'Rouvrir' : 'Fermer la séance'}</SubmitButton>
                      </form>
                      {s.booked === 0 && (
                        <form action={deleteSession}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="redirectTo" value={here} />
                          <SubmitButton className="bg-terracotta-500 py-2.5 hover:bg-terracotta-700" confirm="Supprimer définitivement cette séance ?">Supprimer</SubmitButton>
                        </form>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* one-off */}
          <section className="card p-5">
            <h2 className="text-xl">Ajouter une séance</h2>
            <form action={createSession} className="mt-4 space-y-3">
              <input type="hidden" name="experienceId" value={expId} />
              <input type="hidden" name="redirectTo" value={here} />
              <label className="block text-sm">Date<input name="date" type="date" min={today} required className="field-input mt-1" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">Début<input name="start" type="time" required defaultValue="10:00" className="field-input mt-1" /></label>
                <label className="block text-sm">Fin<input name="end" type="time" className="field-input mt-1" /></label>
              </div>
              <label className="block text-sm">Capacité (places)<input name="capacity" type="number" min={1} required className="field-input mt-1" /></label>
              <label className="block text-sm">Note interne<input name="notes" maxLength={300} className="field-input mt-1" /></label>
              <details className="rounded-2xl border border-sand-200 p-3">
                <summary className="cursor-pointer text-sm font-medium text-forest-700">Événement spécial (prix, titre) — facultatif</summary>
                <div className="mt-3 space-y-3">
                  <label className="block text-sm">Prix spécial par personne (FCFA)
                    <input name="price" type="number" min={0} step={500} placeholder="Laisser vide = prix normal" className="field-input mt-1" />
                  </label>
                  <label className="block text-sm">Titre affiché (FR)<input name="label_fr" maxLength={80} placeholder="ex. Thiéboudiène spécial fêtes" className="field-input mt-1" /></label>
                  <label className="block text-sm">Titre affiché (EN)<input name="label_en" maxLength={80} placeholder="e.g. Holiday Thiéboudiène special" className="field-input mt-1" /></label>
                </div>
              </details>
              <SubmitButton className="w-full">Créer la séance</SubmitButton>
            </form>
          </section>

          {/* recurring */}
          <section className="card p-5">
            <h2 className="text-xl">Séances récurrentes</h2>
            <form action={createRecurringSessions} className="mt-4 space-y-3">
              <input type="hidden" name="experienceId" value={expId} />
              <input type="hidden" name="redirectTo" value={here} />
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">Du<input name="from" type="date" min={today} required className="field-input mt-1" /></label>
                <label className="block text-sm">Au<input name="until" type="date" min={today} required className="field-input mt-1" /></label>
              </div>
              <fieldset>
                <legend className="text-sm">Jours d’ouverture</legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {WEEKDAYS.map(([v, l]) => (
                    <label key={v} className="flex items-center gap-1 rounded-full border border-sand-300 px-3 py-1.5 text-sm has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50">
                      <input type="checkbox" name="weekday" value={v} className="accent-forest-700" /> {l}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block text-sm">Horaires (séparés par des virgules)
                <input name="slots" required placeholder="10:00-13:30, 15:00-18:30" className="field-input mt-1" />
              </label>
              <label className="block text-sm">Capacité par séance<input name="capacity" type="number" min={1} required className="field-input mt-1" /></label>
              <SubmitButton className="w-full">Générer les séances</SubmitButton>
            </form>
          </section>

          {/* blocked dates */}
          <section className="card p-5">
            <h2 className="text-xl">Dates bloquées / exceptions</h2>
            <p className="mt-1 text-sm text-ink-soft">Fête, congé, imprévu : la date disparaît du calendrier public.</p>
            <form action={blockDate} className="mt-4 space-y-3">
              <input type="hidden" name="redirectTo" value={here} />
              <label className="block text-sm">Date<input name="date" type="date" min={today} required className="field-input mt-1" /></label>
              <label className="block text-sm">Concerne
                <select name="experienceId" className="field-input mt-1">
                  <option value="">Toutes les expériences</option>
                  {experiences.map((e) => <option key={e.id} value={e.id}>{pick(e.title, 'fr')}</option>)}
                </select>
              </label>
              <label className="block text-sm">Motif (interne)<input name="reason" maxLength={200} className="field-input mt-1" /></label>
              <SubmitButton className="w-full">Bloquer la date</SubmitButton>
            </form>
            {(blocked ?? []).length > 0 && (
              <ul className="mt-4 divide-y divide-sand-200 text-sm">
                {(blocked ?? []).map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="capitalize">{formatDate(b.date, 'fr')}{b.reason ? ` · ${b.reason}` : ''}{b.experience_id ? '' : ' · toutes'}</span>
                    <form action={unblockDate}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="redirectTo" value={here} />
                      <button className="text-xs font-semibold text-terracotta-700 hover:underline">Débloquer</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
