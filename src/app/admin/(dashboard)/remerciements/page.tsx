import Link from 'next/link';
import { SubmitButton } from '@/components/admin/AdminUi';
import { Flash, PageTitle } from '@/components/admin/Flash';
import { site } from '@/config/site';
import { requireAdmin } from '@/lib/admin';
import type { SiteSettingsRow } from '@/lib/site-settings';
import type { Localized } from '@/lib/types';
import { formatDate, formatTime, pick } from '@/lib/utils';
import { THANKS_MARK } from '@/lib/review';
import { sendReviewThanks } from '../../review-actions';

type SessionRow = { id: string; date: string; start_time: string; end_time: string | null; experiences: { title: Localized } | null };
type BookingRow = { id: string; first_name: string; last_name: string; email: string; locale: string; status: string; participants: number; admin_notes: string | null };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; session?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Dakar' });
  const since = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);

  const [{ data: settings }, { data: sess }] = await Promise.all([
    supabase.from('site_settings').select('contact').eq('id', 1).maybeSingle(),
    supabase
      .from('sessions')
      .select('id, date, start_time, end_time, experiences ( title )')
      .gte('date', since)
      .lte('date', today)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
  ]);
  const reviewUrl = ((settings as SiteSettingsRow | null)?.contact?.google_review || site.googleReview || '').trim();
  const sessions = (sess ?? []) as unknown as SessionRow[];
  const current = sessions.find((s) => s.id === sp.session) ?? null;

  let bookings: BookingRow[] = [];
  if (current) {
    const { data } = await supabase
      .from('bookings')
      .select('id, first_name, last_name, email, locale, status, participants, admin_notes')
      .eq('session_id', current.id)
      .neq('status', 'cancelled')
      .order('created_at');
    bookings = (data ?? []) as BookingRow[];
  }
  const label = (s: SessionRow) =>
    `${formatDate(s.date, 'fr')} · ${formatTime(s.start_time)}${s.end_time ? `–${formatTime(s.end_time)}` : ''}${s.experiences ? ` · ${pick(s.experiences.title, 'fr')}` : ''}`;

  return (
    <>
      <PageTitle title="Remerciements & avis Google" />
      <Flash ok={sp.ok} err={sp.err} />
      <p className="mb-6 max-w-3xl text-sm text-ink-soft">
        Après un atelier, envoyez en un clic un e-mail de remerciement à vos participants, avec un bouton pour laisser un avis sur votre fiche Google.
        Les participants qui ont réservé sur le site sont déjà listés ; ajoutez à la main ceux qui ont réservé autrement (WhatsApp, téléphone, sur place).
        Chacun reçoit son propre e-mail, dans sa langue : personne ne voit les adresses des autres.
      </p>

      {reviewUrl && (
        <p className="mb-6 text-sm text-ink-soft">
          Lien utilisé pour le bouton : <a href={reviewUrl} target="_blank" rel="noreferrer" className="font-semibold text-forest-700 underline">{reviewUrl}</a> (modifiable dans Site & coordonnées).
        </p>
      )}
      {!reviewUrl && (
        <p className="card mb-6 border-gold-400 bg-gold-100 p-4 text-sm">
          ⚠️ Ajoutez d’abord le lien « Laisser un avis » de votre fiche Google dans{' '}
          <Link href="/admin/settings" className="font-semibold text-forest-700 underline">Site & coordonnées</Link> (rubrique « Avis Google »).
        </p>
      )}

      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4" method="get">
        <div className="min-w-[16rem] flex-1">
          <label className="field-label" htmlFor="session">Atelier passé</label>
          <select id="session" name="session" defaultValue={current?.id ?? ''} className="field-input py-2">
            <option value="">— Choisir une séance (ou seulement des e-mails ajoutés à la main) —</option>
            {sessions.map((s) => <option key={s.id} value={s.id} className="capitalize">{label(s)}</option>)}
          </select>
        </div>
        <button className="btn-outline py-2.5">Afficher les participants</button>
      </form>

      <form action={sendReviewThanks} className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <input type="hidden" name="sessionId" value={current?.id ?? ''} />
        <section className="card space-y-5 p-5">
          {current && (
            <div>
              <h2 className="text-xl capitalize">{label(current)}</h2>
              {bookings.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">Aucune réservation en ligne pour cette séance — ajoutez les e-mails ci-dessous.</p>
              ) : (
                <ul className="mt-3 divide-y divide-sand-200 rounded-2xl border border-sand-200">
                  {bookings.map((b) => {
                    const thanked = (b.admin_notes ?? '').includes(THANKS_MARK);
                    return (
                      <li key={b.id}>
                        <label className="flex cursor-pointer items-start gap-3 p-3">
                          <input type="checkbox" name="booking" value={b.id} defaultChecked={b.status === 'confirmed' && !thanked} className="mt-1 h-4 w-4" />
                          <span className="min-w-0">
                            <span className="block font-semibold">{b.first_name} {b.last_name} <span className="text-xs font-normal text-ink-muted">· {b.participants} pers. · {b.locale === 'en' ? 'anglais' : 'français'}</span></span>
                            <span className="block truncate text-sm text-ink-soft">{b.email}</span>
                            {thanked && <span className="text-xs font-semibold text-forest-700">✓ Déjà remercié(e)</span>}
                            {b.status === 'pending' && <span className="text-xs font-semibold text-gold-600">Demande non confirmée</span>}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <div>
            <label className="field-label" htmlFor="extras">Autres participants (e-mails)</label>
            <textarea id="extras" name="extras" rows={4} className="field-input" placeholder={'aminata@example.com\njohn@example.com'} />
            <p className="mt-1 text-xs text-ink-muted">Une adresse par ligne (ou séparées par des virgules). Les doublons sont ignorés.</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span className="font-medium">Langue pour ces adresses :</span>
              <label className="flex items-center gap-2"><input type="radio" name="extra_locale" value="fr" defaultChecked /> Français</label>
              <label className="flex items-center gap-2"><input type="radio" name="extra_locale" value="en" /> English</label>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="card space-y-3 p-5">
            <h2 className="text-lg">Petit mot personnel (facultatif)</h2>
            <label className="block text-sm">En français<textarea name="note_fr" rows={3} maxLength={800} className="field-input mt-1" placeholder="Ex. : Merci pour votre bonne humeur, on a adoré cuisiner avec vous !" /></label>
            <label className="block text-sm">In English<textarea name="note_en" rows={3} maxLength={800} className="field-input mt-1" placeholder="E.g. Thank you for your energy, we loved cooking with you!" /></label>
          </section>
          <section className="card space-y-3 p-5 text-sm text-ink-soft">
            <p className="font-semibold text-ink">Ce que reçoivent vos invités</p>
            <p>« Jërëjëf ! Merci d’avoir partagé ce moment avec nous autour du thiéboudiène… Si vous avez apprécié l’atelier, un petit avis sur Google nous aiderait énormément. »</p>
            <p>+ votre mot personnel, puis un bouton doré <b>Laisser un avis sur Google</b>.</p>
          </section>
          <SubmitButton className="w-full py-3" confirm="Envoyer l’e-mail de remerciement à toutes les personnes sélectionnées ?" pendingLabel="Envoi en cours…">
            Envoyer les remerciements
          </SubmitButton>
        </aside>
      </form>
    </>
  );
}
