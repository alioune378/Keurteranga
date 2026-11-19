import Link from 'next/link';
import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/admin';
import type { Offer } from '@/lib/studio';
import { formatDate, pick } from '@/lib/utils';

export default async function OffersPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('offers')
    .select('*, experiences ( slug, title, price_xof )')
    .order('status', { ascending: false })
    .order('created_at', { ascending: false });
  const items = (data ?? []) as Offer[];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageTitle title="Offres spéciales">
        <Link href="/admin/offers/new" className="btn-gold">+ Nouvelle offre</Link>
      </PageTitle>
      <Flash ok={sp.ok} err={sp.err ?? error?.message} />
      <p className="mb-6 max-w-3xl text-sm text-ink-soft">
        Promotions, réductions, offres de saison : choisissez un pourcentage ou un prix spécial, une date de début et d’expiration.
        L’offre s’affiche sur l’accueil pendant sa période puis disparaît toute seule. Le paiement se fait à l’avance par Orange Money ou Wave.
        Pour un prix spécial sur une date précise, vous pouvez aussi l’indiquer directement sur la séance (Calendrier → Modifier).
      </p>
      {items.length === 0 ? (
        <p className="card p-6 text-ink-soft">Aucune offre. <Link href="/admin/offers/new" className="font-semibold text-forest-700 underline">Créer une offre</Link></p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((o) => {
            const expired = !!o.ends_on && o.ends_on < today;
            return (
              <li key={o.id}>
                <Link href={`/admin/offers/${o.id}`} className="card block h-full p-4 hover:border-forest-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={o.status} />
                    {expired && <span className="text-xs font-semibold text-terracotta-700">Expirée</span>}
                    {o.discount_percent != null && <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-bold text-gold-600">-{o.discount_percent} %</span>}
                    {o.offer_price_xof != null && <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-bold text-gold-600">{o.offer_price_xof.toLocaleString('fr-FR')} FCFA</span>}
                  </div>
                  <p className="mt-1 font-semibold">{pick(o.title, 'fr') || '—'}</p>
                  <p className="text-xs text-ink-muted">
                    {pick(o.experiences?.title, 'fr') ?? 'Toutes les expériences'}
                    {o.ends_on ? ` · expire le ${formatDate(o.ends_on, 'fr', { weekday: undefined })}` : ''}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
