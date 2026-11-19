import Link from 'next/link';
import { SubmitButton } from '@/components/admin/AdminUi';
import { Flash, PageTitle } from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/admin';
import { discountLabel, KIND_LABELS } from '@/lib/promo';
import { siteUrl } from '@/lib/utils';
import { togglePromoPartner } from '../../promo-actions';

interface Row {
  id: string; name: string; kind: string; code: string; email: string | null; active: boolean;
  discount_percent: number | null; discount_xof: number | null; ends_on: string | null;
}
interface Stat { id: string; requests: number; confirmed: number; guests: number; cancelled: number; last_booking_at: string | null }

export default async function PromoCodesPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data, error }, { data: statsData }] = await Promise.all([
    supabase.from('promo_partners').select('id, name, kind, code, email, active, discount_percent, discount_xof, ends_on')
      .order('active', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('promo_partner_stats').select('*')
  ]);
  const rows = (data ?? []) as Row[];
  const stats = new Map(((statsData ?? []) as Stat[]).map((s) => [s.id, s]));
  const today = new Date().toISOString().slice(0, 10);
  const totals = [...stats.values()].reduce((a, s) => ({ confirmed: a.confirmed + Number(s.confirmed), guests: a.guests + Number(s.guests) }), { confirmed: 0, guests: 0 });

  return (
    <>
      <PageTitle title="Codes partenaires">
        <Link href="/admin/promo-codes/new" className="btn-gold">+ Nouveau partenaire</Link>
      </PageTitle>
      <Flash ok={sp.ok} err={sp.err ?? (error ? 'La table des codes n’existe pas encore : exécutez supabase/migrations/005_partner_codes.sql dans Supabase.' : undefined)} />
      <p className="mb-6 max-w-3xl text-sm text-ink-soft">
        Créez un code par partenaire (influenceur, hôtel, agence…). Le client le saisit en réservant, ou arrive directement avec le lien du partenaire :
        chaque réservation est rattachée au bon partenaire, et celui-ci reçoit un e-mail à chaque réservation faite avec son code.
      </p>

      {rows.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="card p-4"><p className="text-xs text-ink-muted">Partenaires actifs</p><p className="font-display text-3xl text-forest-700">{rows.filter((r) => r.active).length}</p></div>
          <div className="card p-4"><p className="text-xs text-ink-muted">Réservations confirmées via un code</p><p className="font-display text-3xl text-forest-700">{totals.confirmed}</p></div>
          <div className="card p-4"><p className="text-xs text-ink-muted">Invités venus via un partenaire</p><p className="font-display text-3xl text-forest-700">{totals.guests}</p></div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="card p-6 text-ink-soft">Aucun code pour le moment. <Link href="/admin/promo-codes/new" className="font-semibold text-forest-700 underline">Créer le premier</Link></p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const s = stats.get(r.id);
            const expired = !!r.ends_on && r.ends_on < today;
            return (
              <li key={r.id} className={`card p-4 ${r.active && !expired ? '' : 'opacity-70'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link href={`/admin/promo-codes/${r.id}`} className="min-w-0 hover:underline">
                    <p className="font-display text-xl">{r.name}</p>
                    <p className="text-sm text-ink-soft">
                      {KIND_LABELS[r.kind] ?? r.kind} · <span className="font-mono font-semibold text-forest-800">{r.code}</span>
                      {discountLabel(r) && <> · <span className="font-semibold text-gold-600">{discountLabel(r)}</span></>}
                      {!r.active && <> · <span className="font-semibold text-terracotta-700">En pause</span></>}
                      {expired && <> · <span className="font-semibold text-terracotta-700">Expiré</span></>}
                    </p>
                  </Link>
                  <form action={togglePromoPartner}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="active" value={r.active ? '0' : '1'} />
                    <SubmitButton className="btn-outline px-4 py-1.5 text-sm" pendingLabel="…">{r.active ? 'Mettre en pause' : 'Réactiver'}</SubmitButton>
                  </form>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div><dt className="text-xs text-ink-muted">Demandes</dt><dd className="font-semibold">{s?.requests ?? 0}</dd></div>
                  <div><dt className="text-xs text-ink-muted">Confirmées</dt><dd className="font-semibold text-forest-700">{s?.confirmed ?? 0}</dd></div>
                  <div><dt className="text-xs text-ink-muted">Invités</dt><dd className="font-semibold">{s?.guests ?? 0}</dd></div>
                  <div><dt className="text-xs text-ink-muted">Dernière réservation</dt><dd>{s?.last_booking_at ? new Date(s.last_booking_at).toLocaleDateString('fr-FR', { timeZone: 'Africa/Dakar' }) : '—'}</dd></div>
                </dl>
                <p className="mt-3 break-all rounded-xl bg-sand-100 px-3 py-2 font-mono text-xs text-ink-soft">{siteUrl(`/fr/reservation?code=${r.code}`)}</p>
                {!r.email && <p className="mt-2 text-xs text-terracotta-700">Pas d’e-mail : ce partenaire ne reçoit pas de notifications.</p>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
