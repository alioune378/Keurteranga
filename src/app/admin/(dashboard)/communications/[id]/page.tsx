import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/admin/AdminUi';
import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { PublishBar } from '@/components/admin/PublishBar';
import { BiField, MediaUpload } from '@/components/admin/StudioFields';
import { AnnouncementBanner, AnnouncementCard } from '@/components/studio/StudioCards';
import { requireAdmin } from '@/lib/admin';
import type { Announcement } from '@/lib/studio';
import { deleteAnnouncement, saveAnnouncement } from '../../../studio-actions';

export default async function AnnouncementEditor({
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
  let a: Announcement | null = null;
  if (!isNew) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const { data } = await supabase.from('announcements').select('*').eq('id', id).maybeSingle();
    if (!data) notFound();
    a = data as Announcement;
  }
  const published = a?.status === 'published';

  return (
    <>
      <Link href="/admin/communications" className="text-sm font-medium text-forest-700 hover:underline">← Toutes les annonces</Link>
      <PageTitle title={isNew ? 'Nouvelle annonce' : 'Modifier l’annonce'}>{a && <StatusBadge status={a.status} />}</PageTitle>
      <Flash ok={sp.ok} err={sp.err} />

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <form action={saveAnnouncement} className="space-y-5">
          {a && <input type="hidden" name="id" value={a.id} />}

          <fieldset className="rounded-2xl border border-sand-200 p-4">
            <legend className="px-1 text-sm font-semibold text-forest-800">Où l’afficher ?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-300 p-3 has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50">
                <input type="radio" name="placement" value="home" defaultChecked={a?.placement !== 'banner'} className="mt-1 accent-forest-700" />
                <span><strong className="block">Carte sur l’accueil</strong><span className="text-xs text-ink-muted">Rubrique « Actualités », avec texte et affiche</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand-300 p-3 has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50">
                <input type="radio" name="placement" value="banner" defaultChecked={a?.placement === 'banner'} className="mt-1 accent-forest-700" />
                <span><strong className="block">Bandeau en haut du site</strong><span className="text-xs text-ink-muted">Une phrase courte, sur toutes les pages</span></span>
              </label>
            </div>
          </fieldset>

          <BiField name="title" label="Titre *" value={a?.title} required maxLength={140} help="Ex. « Atelier Thiéboudiène spécial le 12 décembre »" />
          <BiField name="body" label="Texte (carte d’accueil)" value={a?.body} kind="textarea" rows={4} maxLength={1500} />

          <div className="grid gap-4 rounded-2xl border border-sand-200 p-4 sm:grid-cols-2">
            <BiFieldInline a={a} />
            <label className="text-sm sm:col-span-2">Lien du bouton
              <input name="cta_url" defaultValue={a?.cta_url ?? ''} placeholder="/fr/reservation — ou https://…" className="field-input mt-1" />
              <span className="mt-1 block text-xs text-ink-muted">Laisser vide pour ne pas afficher de bouton. Pour la réservation : /fr/reservation</span>
            </label>
          </div>

          <div className="grid gap-4 rounded-2xl border border-sand-200 p-4 sm:grid-cols-3">
            <label className="text-sm">Date de l’événement<input type="date" name="event_date" defaultValue={a?.event_date ?? ''} className="field-input mt-1" /></label>
            <label className="text-sm">Afficher à partir du<input type="date" name="starts_on" defaultValue={a?.starts_on ?? ''} className="field-input mt-1" /></label>
            <label className="text-sm">Jusqu’au (inclus)<input type="date" name="ends_on" defaultValue={a?.ends_on ?? ''} className="field-input mt-1" /></label>
            <p className="text-xs text-ink-muted sm:col-span-3">Sans dates, l’annonce reste visible tant qu’elle est publiée. Après la date de fin, elle disparaît automatiquement.</p>
          </div>

          <MediaUpload folder="announcements" defaultUrl={a?.image_url} defaultPath={a?.image_path} />
          <input type="hidden" name="sort_order" value={a?.sort_order ?? 0} />

          <PublishBar published={published} isNew={isNew} />
        </form>

        <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start">
          <h2 className="text-xl">Aperçu sur le site</h2>
          {a ? (
            <>
              {!published && <p className="text-xs text-ink-muted">Brouillon : seul vous le voyez. Cliquez « Publier sur le site » quand l’aperçu vous convient.</p>}
              {(['fr', 'en'] as const).map((l) => (
                <div key={l}>
                  <p className="mb-1 text-xs font-semibold uppercase text-ink-muted">{l === 'fr' ? 'Version française' : 'Version anglaise'}</p>
                  <div className="pointer-events-none overflow-hidden rounded-2xl border border-dashed border-sand-300">
                    {a.placement === 'banner' ? <AnnouncementBanner a={a} locale={l} /> : <AnnouncementCard a={a} locale={l} />}
                  </div>
                </div>
              ))}
              <form action={deleteAnnouncement}>
                <input type="hidden" name="id" value={a.id} />
                <SubmitButton className="btn-outline w-full border-terracotta-300 text-terracotta-700" confirm="Supprimer définitivement cette annonce ?">Supprimer l’annonce</SubmitButton>
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

function BiFieldInline({ a }: { a: Announcement | null }) {
  return (
    <>
      <label className="text-sm">Texte du bouton (FR)<input name="cta_fr" defaultValue={a?.cta_label?.fr ?? ''} maxLength={40} placeholder="Réserver" className="field-input mt-1" /></label>
      <label className="text-sm">Texte du bouton (EN)<input name="cta_en" defaultValue={a?.cta_label?.en ?? ''} maxLength={40} placeholder="Book now" className="field-input mt-1" /></label>
    </>
  );
}
