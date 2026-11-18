import Link from 'next/link';
import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/admin';
import type { Announcement } from '@/lib/studio';
import { formatDate, pick } from '@/lib/utils';

export default async function CommunicationsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from('announcements').select('*').order('status', { ascending: false }).order('created_at', { ascending: false });
  const items = (data ?? []) as Announcement[];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageTitle title="Annonces & communications">
        <Link href="/admin/communications/new" className="btn-gold">+ Nouvelle annonce</Link>
      </PageTitle>
      <Flash ok={sp.ok} err={sp.err ?? error?.message} />
      <p className="mb-6 max-w-3xl text-sm text-ink-soft">
        Publiez un message en haut de toutes les pages (bandeau) ou une carte dans la rubrique « Actualités » de l’accueil :
        nouvel atelier, événement, fermeture exceptionnelle… Vous pouvez y joindre une affiche (image ou PDF) et choisir les dates d’affichage.
      </p>

      {items.length === 0 ? (
        <p className="card p-6 text-ink-soft">Aucune annonce pour l’instant. <Link href="/admin/communications/new" className="font-semibold text-forest-700 underline">Créer la première</Link></p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((a) => {
            const expired = !!a.ends_on && a.ends_on < today;
            const scheduled = !!a.starts_on && a.starts_on > today;
            return (
              <li key={a.id}>
                <Link href={`/admin/communications/${a.id}`} className="card flex h-full items-start gap-4 p-4 hover:border-forest-400">
                  {a.image_url && !a.image_url.toLowerCase().endsWith('.pdf') && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={a.status} />
                      <span className="rounded-full bg-sand-200 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{a.placement === 'banner' ? 'Bandeau' : 'Accueil'}</span>
                      {expired && <span className="text-xs font-semibold text-terracotta-700">Expirée</span>}
                      {scheduled && <span className="text-xs font-semibold text-gold-600">Programmée</span>}
                    </div>
                    <p className="mt-1 truncate font-semibold">{pick(a.title, 'fr') || '—'}</p>
                    <p className="text-xs text-ink-muted">
                      {a.starts_on ? `Du ${formatDate(a.starts_on, 'fr', { weekday: undefined })} ` : ''}
                      {a.ends_on ? `au ${formatDate(a.ends_on, 'fr', { weekday: undefined })}` : a.starts_on ? '' : 'Sans date de fin'}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
