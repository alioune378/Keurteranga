import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/admin/AdminUi';
import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { PublishBar } from '@/components/admin/PublishBar';
import { BiField, MediaUpload } from '@/components/admin/StudioFields';
import { OfferCard } from '@/components/studio/StudioCards';
import { requireAdmin } from '@/lib/admin';
import type { Offer } from '@/lib/studio';
import type { Localized } from '@/lib/types';
import { pick } from '@/lib/utils';
import { deleteOffer, saveOffer } from '../../../studio-actions';

export default async function OfferEditor({
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
  let o: Offer | null = null;
  if (!isNew) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const { data } = await supabase.from('offers').select('*, experiences ( slug, title, price_xof )').eq('id', id).maybeSingle();
    if (!data) notFound();
    o = data as Offer;
  }
  const { data: exps } = await supabase.from('experiences').select('id, title').neq('status', 'archived').order('sort_order');
  const experiences = (exps ?? []) as Array<{ id: string; title: Localized }>;
  const published = o?.status === 'published';
  const kind = o?.offer_price_xof != null ? 'price' : o?.discount_percent != null ? 'percent' : 'none';

  return (
    <>
      <Link href="/admin/offers" className="text-sm font-medium text-forest-700 hover:underline">← Toutes les offres</Link>
      <PageTitle title={isNew ? 'Nouvelle offre spéciale' : 'Modifier l’offre'}>{o && <StatusBadge status={o.status} />}</PageTitle>
      <Flash ok={sp.ok} err={sp.err} />

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <form action={saveOffer} className="space-y-5">
          {o && <input type="hidden" name="id" value={o.id} />}
          <BiField name="title" label="Nom de l’offre *" value={o?.title} required maxLength={140} help="Ex. « Week-end Thiéboudiène »" />
          <BiField name="description" label="Description" value={o?.description} kind="textarea" rows={3} maxLength={1500} />

          <label className="block text-sm">Expérience concernée
            <select name="experience_id" defaultValue={o?.experience_id ?? ''} className="field-input mt-1">
              <option value="">Toutes les expériences</option>
              {experiences.map((e) => <option key={e.id} value={e.id}>{pick(e.title, 'fr')}</option>)}
            </select>
          </label>

          <fieldset className="rounded-2xl border border-sand-200 p-4">
            <legend className="px-1 text-sm font-semibold text-forest-800">Type d’avantage</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 rounded-xl border border-sand-300 p-3 has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50">
                <input type="radio" name="kind" value="percent" defaultChecked={kind === 'percent'} className="accent-forest-700" /> Réduction en %
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-sand-300 p-3 has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50">
                <input type="radio" name="kind" value="price" defaultChecked={kind === 'price'} className="accent-forest-700" /> Prix spécial
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-sand-300 p-3 has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50">
                <input type="radio" name="kind" value="none" defaultChecked={kind === 'none'} className="accent-forest-700" /> Sans prix (cadeau, bonus…)
              </label>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-sm">Réduction (%)<input name="discount_percent" type="number" min={1} max={100} defaultValue={o?.discount_percent ?? ''} className="field-input mt-1" /></label>
              <label className="text-sm">Prix spécial / pers. (FCFA)<input name="offer_price" type="number" min={0} step={500} defaultValue={o?.offer_price_xof ?? ''} className="field-input mt-1" /></label>
              <label className="text-sm">Code promo (facultatif)<input name="code" defaultValue={o?.code ?? ''} maxLength={40} placeholder="TERANGA10" className="field-input mt-1 uppercase" /></label>
            </div>
          </fieldset>

          <div className="grid gap-4 rounded-2xl border border-sand-200 p-4 sm:grid-cols-2">
            <label className="text-sm">Début de l’offre<input type="date" name="starts_on" defaultValue={o?.starts_on ?? ''} className="field-input mt-1" /></label>
            <label className="text-sm">Expire le (inclus)<input type="date" name="ends_on" defaultValue={o?.ends_on ?? ''} className="field-input mt-1" /></label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="show_on_home" value="1" defaultChecked={o?.show_on_home ?? true} className="accent-forest-700" /> Afficher sur la page d’accueil
            </label>
          </div>

          <MediaUpload folder="offers" defaultUrl={o?.image_url} defaultPath={o?.image_path} label="Visuel ou affiche de l’offre (JPG, PNG, WebP ou PDF)" />
          <input type="hidden" name="sort_order" value={o?.sort_order ?? 0} />

          <PublishBar published={published} isNew={isNew} />
        </form>

        <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start">
          <h2 className="text-xl">Aperçu sur le site</h2>
          {o ? (
            <>
              {!published && <p className="text-xs text-ink-muted">Brouillon : invisible pour les visiteurs tant que vous ne publiez pas.</p>}
              {(['fr', 'en'] as const).map((l) => (
                <div key={l}>
                  <p className="mb-1 text-xs font-semibold uppercase text-ink-muted">{l === 'fr' ? 'Version française' : 'Version anglaise'}</p>
                  <div className="pointer-events-none"><OfferCard o={o} locale={l} /></div>
                </div>
              ))}
              <form action={deleteOffer}>
                <input type="hidden" name="id" value={o.id} />
                <SubmitButton className="btn-outline w-full border-terracotta-300 text-terracotta-700" confirm="Supprimer définitivement cette offre ?">Supprimer l’offre</SubmitButton>
              </form>
            </>
          ) : (
            <p className="card p-5 text-sm text-ink-soft">L’aperçu apparaît ici dès que vous avez enregistré le brouillon.</p>
          )}
        </aside>
      </div>
    </>
  );
}
