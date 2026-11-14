import Image from 'next/image';
import Link from 'next/link';
import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/admin';
import type { Experience } from '@/lib/types';
import { formatPrice, pick } from '@/lib/utils';

export default async function AdminExperiences({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('experiences')
    .select('id, slug, status, title, price_xof, featured, sort_order, experience_images ( src, is_cover, sort_order )')
    .order('sort_order');
  const list = (data ?? []) as unknown as Array<Experience & { experience_images: Array<{ src: string; is_cover: boolean; sort_order: number }> }>;

  return (
    <>
      <PageTitle title="Expériences">
        <Link href="/admin/experiences/new" className="btn-gold">+ Nouvelle expérience</Link>
      </PageTitle>
      <Flash ok={sp.ok} err={sp.err} />
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((e) => {
          const cover = e.experience_images.find((i) => i.is_cover) ?? e.experience_images.sort((a, b) => a.sort_order - b.sort_order)[0];
          return (
            <li key={e.id} className="card overflow-hidden">
              <div className="relative aspect-[16/9] bg-sand-200">
                {cover && <Image src={cover.src} alt="" fill sizes="400px" className="object-cover" />}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-xl">{pick(e.title, 'fr')}</p>
                  <StatusBadge status={e.status} />
                </div>
                <p className="text-sm text-ink-soft">
                  {e.price_xof != null ? formatPrice(e.price_xof, 'fr') : 'Prix à confirmer'} · {e.experience_images.length} photo(s)
                  {e.featured && ' · en avant'}
                </p>
                <div className="flex gap-3 pt-1 text-sm font-semibold">
                  <Link href={`/admin/experiences/${e.id}`} className="text-forest-700 hover:underline">Modifier</Link>
                  <Link href={`/admin/sessions?exp=${e.id}`} className="text-forest-700 hover:underline">Séances</Link>
                  {e.status === 'published' && <a href={`/fr/experiences/${e.slug}`} target="_blank" className="text-forest-700 hover:underline">Voir ↗</a>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
