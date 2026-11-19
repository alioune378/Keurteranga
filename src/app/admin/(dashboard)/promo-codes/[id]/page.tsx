import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/admin/AdminUi';
import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/admin';
import { discountLabel, KIND_LABELS } from '@/lib/promo';
import type { Localized } from '@/lib/types';
import { formatDate, formatTime, pick, siteUrl } from '@/lib/utils';
import { deletePromoPartner, savePromoPartner } from '../../../promo-actions';

interface Partner {
  id: string; name: string; kind: string; contact_name: string | null; email: string | null; phone: string | null;
  code: string; discount_percent: number | null; discount_xof: number | null; notify: boolean;
  notify_on: 'confirmed' | 'request'; locale: 'fr' | 'en'; active: boolean;
  starts_on: string | null; ends_on: string | null; notes: string | null;
}
interface BookingRow {
  id: string; reference: string; status: string; participants: number; first_name: string; last_name: string;
  created_at: string; sessions: { date: string; start_time: string } | null; experiences: { title: Localized } | null;
}

export default async function PromoPartnerEditor({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const isNew = id === 'new';

  let p: Partner | null = null;
  let bookings: BookingRow[] = [];
  if (!isNew) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const { data } = await supabase.from('promo_partners').select('*').eq('id', id).maybeSingle();
    if (!data) notFound();
    p = data as Partner;
    const { data: b } = await supabase
      .from('bookings')
      .select('id, reference, status, participants, first_name, last_name, created_at, sessions ( date, start_time ), experiences ( title )')
      .eq('promo_partner_id', id)
      .order('created_at', { ascending: false })
      .limit(300);
    bookings = (b ?? []) as unknown as BookingRow[];
  }
  const discountKind = p?.discount_xof != null ? 'amount' : p?.discount_percent != null ? 'percent' : 'none';
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const link = p ? siteUrl(`/${p.locale}/${p.locale === 'en' ? 'booking' : 'reservation'}?code=${p.code}`) : null;

  return (
    <>
      <Link href="/admin/promo-codes" className="text-sm font-medium text-forest-700 hover:underline">← Tous les codes partenaires</Link>
      <PageTitle title={isNew ? 'Nouveau partenaire' : p!.name}>
        {p && <span className="rounded-full bg-forest-100 px-3 py-1 font-mono text-sm font-bold text-forest-800">{p.code}</span>}
      </PageTitle>
      <Flash ok={sp.ok} err={sp.err} />

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <form action={savePromoPartner} className="space-y-5">
          {p && <input type="hidden" name="id" value={p.id} />}

          <div className="card grid gap-4 p-5 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Nom du partenaire *
              <input name="name" required maxLength={120} defaultValue={p?.name ?? ''} placeholder="Ex. Awa Cuisine (Instagram)" className="field-input mt-1" />
            </label>
            <label className="text-sm">Type
              <select name="kind" defaultValue={p?.kind ?? 'influencer'} className="field-input mt-1">
                {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="text-sm">Personne de contact
              <input name="contact_name" maxLength={120} defaultValue={p?.contact_name ?? ''} className="field-input mt-1" />
            </label>
            <label className="text-sm">E-mail (pour les notifications)
              <input name="email" type="email" maxLength={200} defaultValue={p?.email ?? ''} className="field-input mt-1" />
            </label>
            <label className="text-sm">Téléphone / WhatsApp
              <input name="phone" maxLength={30} defaultValue={p?.phone ?? ''} className="field-input mt-1" />
            </label>
          </div>

          <fieldset className="card space-y-4 p-5">
            <legend className="px-1 text-sm font-semibold text-forest-800">Code & réduction</legend>
            <label className="block text-sm">Code promo *
              <input name="code" required maxLength={30} defaultValue={p?.code ?? ''} placeholder="AWA10" className="field-input mt-1 font-mono uppercase" />
              <span className="mt-1 block text-xs text-ink-muted">Lettres et chiffres, sans espace. Le client peut le taper en minuscules.</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 rounded-xl border border-sand-300 p-3 text-sm has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50">
                <input type="radio" name="discount_kind" value="percent" defaultChecked={discountKind === 'percent'} className="accent-forest-700" /> Réduction en %
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-sand-300 p-3 text-sm has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50">
                <input type="radio" name="discount_kind" value="amount" defaultChecked={discountKind === 'amount'} className="accent-forest-700" /> Montant (FCFA)
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-sand-300 p-3 text-sm has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50">
                <input type="radio" name="discount_kind" value="none" defaultChecked={discountKind === 'none'} className="accent-forest-700" /> Suivi seulement
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Réduction (%)<input name="discount_percent" type="number" min={1} max={100} defaultValue={p?.discount_percent ?? ''} className="field-input mt-1" /></label>
              <label className="text-sm">Réduction sur le total (FCFA)<input name="discount_xof" type="number" min={500} step={500} defaultValue={p?.discount_xof ?? ''} className="field-input mt-1" /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Valable à partir du<input type="date" name="starts_on" defaultValue={p?.starts_on ?? ''} className="field-input mt-1" /></label>
              <label className="text-sm">Jusqu’au (inclus)<input type="date" name="ends_on" defaultValue={p?.ends_on ?? ''} className="field-input mt-1" /></label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" value="1" defaultChecked={p?.active ?? true} className="accent-forest-700" /> Code actif (accepté sur le site)
            </label>
          </fieldset>

          <fieldset className="card space-y-3 p-5">
            <legend className="px-1 text-sm font-semibold text-forest-800">Notifications au partenaire</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="notify" value="1" defaultChecked={p?.notify ?? true} className="accent-forest-700" /> Envoyer un e-mail au partenaire à chaque réservation avec son code
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Quand ?
                <select name="notify_on" defaultValue={p?.notify_on ?? 'confirmed'} className="field-input mt-1">
                  <option value="confirmed">Quand je confirme la réservation (recommandé)</option>
                  <option value="request">Dès que la demande arrive</option>
                </select>
              </label>
              <label className="text-sm">Langue des e-mails
                <select name="locale" defaultValue={p?.locale ?? 'fr'} className="field-input mt-1">
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                </select>
              </label>
            </div>
            <p className="text-xs text-ink-muted">Le partenaire voit le prénom du client, la date et le nombre de personnes — jamais son nom complet, son e-mail ni son téléphone.</p>
          </fieldset>

          <label className="block text-sm">Notes internes (commission, accord…)
            <textarea name="notes" rows={3} maxLength={1000} defaultValue={p?.notes ?? ''} className="field-input mt-1" />
          </label>

          <SubmitButton className="btn-lg">{isNew ? 'Créer le code' : 'Enregistrer'}</SubmitButton>
        </form>

        <div className="space-y-6">
          {p && link && (
            <section className="card p-5 text-sm">
              <h2 className="text-xl">Lien à partager</h2>
              <p className="mt-2 text-ink-soft">Le code s’applique automatiquement quand le client ouvre ce lien.</p>
              <p className="mt-3 select-all break-all rounded-xl bg-sand-100 p-3 font-mono text-xs">{link}</p>
              <p className="mt-3 text-ink-soft">Ou le client tape <strong className="font-mono">{p.code}</strong> au moment de réserver {discountLabel(p) && <>pour obtenir <strong>{discountLabel(p)}</strong></>}.</p>
            </section>
          )}

          {p && (
            <section className="card p-5 text-sm">
              <h2 className="text-xl">Résultats</h2>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-sand-100 p-3"><dt className="text-xs text-ink-muted">Demandes</dt><dd className="font-display text-2xl">{bookings.length}</dd></div>
                <div className="rounded-xl bg-forest-50 p-3"><dt className="text-xs text-ink-muted">Confirmées</dt><dd className="font-display text-2xl text-forest-700">{confirmed.length}</dd></div>
                <div className="rounded-xl bg-sand-100 p-3"><dt className="text-xs text-ink-muted">Invités</dt><dd className="font-display text-2xl">{confirmed.reduce((a, b) => a + b.participants, 0)}</dd></div>
              </dl>
              <ul className="mt-4 divide-y divide-sand-200">
                {bookings.length === 0 && <li className="py-2 text-ink-soft">Aucune réservation avec ce code pour l’instant.</li>}
                {bookings.map((b) => (
                  <li key={b.id} className="py-2">
                    <Link href={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-2 hover:underline">
                      <span>
                        <span className="font-mono font-semibold">{b.reference}</span> · {b.first_name} {b.last_name} · {b.participants} pers.
                        <span className="block text-xs capitalize text-ink-muted">
                          {pick(b.experiences?.title, 'fr')} · {b.sessions ? `${formatDate(b.sessions.date, 'fr', { weekday: 'short' })} ${formatTime(b.sessions.start_time)}` : ''}
                        </span>
                      </span>
                      <StatusBadge status={b.status === 'pending' ? 'request' : b.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p && (
            <section className="card border-terracotta-300 p-5 text-sm">
              <h2 className="text-xl">Supprimer ce partenaire</h2>
              <p className="mt-2 text-ink-soft">Les réservations sont conservées. Pour arrêter le code temporairement, décochez plutôt « Code actif ».</p>
              <form action={deletePromoPartner} className="mt-3">
                <input type="hidden" name="id" value={p.id} />
                <SubmitButton className="w-full bg-terracotta-500 hover:bg-terracotta-700" confirm="Supprimer définitivement ce partenaire et son code ?">Supprimer</SubmitButton>
              </form>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
