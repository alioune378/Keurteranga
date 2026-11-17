import { FileText } from 'lucide-react';
import { SubmitButton } from '@/components/admin/AdminUi';
import { Flash, PageTitle } from '@/components/admin/Flash';
import { MediaUpload } from '@/components/admin/StudioFields';
import { requireAdmin } from '@/lib/admin';
import type { MediaItem } from '@/lib/studio';
import { addMedia, updateMedia } from '../../studio-actions';

const KINDS = [['flyer', 'Flyer'], ['poster', 'Affiche'], ['photo', 'Photo'], ['other', 'Autre']] as const;

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from('media').select('*').order('created_at', { ascending: false });
  const items = (data ?? []) as MediaItem[];

  return (
    <>
      <PageTitle title="Affiches, flyers & photos" />
      <Flash ok={sp.ok} err={sp.err ?? error?.message} />
      <p className="mb-6 max-w-3xl text-sm text-ink-soft">
        Ajoutez vos flyers et affiches (JPG, PNG, WebP ou PDF, 15 Mo max.). Cochez « Afficher sur l’accueil » pour les montrer dans la rubrique
        « Nos affiches » de la page d’accueil. Les photos des ateliers se gèrent dans Expériences → Photos.
      </p>

      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <section className="card h-fit p-5">
          <h2 className="text-xl">Ajouter un fichier</h2>
          <form action={addMedia} className="mt-4 space-y-3">
            <MediaUpload name="file" folder="library" label="Fichier *" required />
            <label className="block text-sm">Titre (FR)<input name="title_fr" maxLength={120} className="field-input mt-1" /></label>
            <label className="block text-sm">Titre (EN)<input name="title_en" maxLength={120} className="field-input mt-1" /></label>
            <label className="block text-sm">Type
              <select name="kind" className="field-input mt-1">{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">Visible du<input type="date" name="starts_on" className="field-input mt-1" /></label>
              <label className="block text-sm">au<input type="date" name="ends_on" className="field-input mt-1" /></label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="show_on_home" value="1" defaultChecked className="accent-forest-700" /> Afficher sur l’accueil
            </label>
            <SubmitButton className="btn-lg w-full">Ajouter</SubmitButton>
          </form>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Bibliothèque ({items.length})</h2>
          {items.length === 0 ? (
            <p className="card p-6 text-ink-soft">Aucun fichier pour l’instant.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((m) => {
                const pdf = m.mime === 'application/pdf';
                return (
                  <li key={m.id} className="card overflow-hidden">
                    <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="block">
                      {pdf ? (
                        <div className="flex aspect-[4/3] items-center justify-center gap-2 bg-sand-100 text-forest-700"><FileText className="h-10 w-10" aria-hidden="true" /> PDF</div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.file_url} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                      )}
                    </a>
                    <form action={updateMedia} className="space-y-2 p-3 text-sm">
                      <input type="hidden" name="id" value={m.id} />
                      <input name="title_fr" defaultValue={m.title?.fr ?? ''} placeholder="Titre (FR)" maxLength={120} className="field-input py-2" />
                      <input name="title_en" defaultValue={m.title?.en ?? ''} placeholder="Title (EN)" maxLength={120} className="field-input py-2" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" name="starts_on" defaultValue={m.starts_on ?? ''} aria-label="Visible du" className="field-input py-2" />
                        <input type="date" name="ends_on" defaultValue={m.ends_on ?? ''} aria-label="Visible jusqu’au" className="field-input py-2" />
                      </div>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="show_on_home" value="1" defaultChecked={m.show_on_home} className="accent-forest-700" /> Afficher sur l’accueil
                      </label>
                      <input type="hidden" name="sort_order" value={m.sort_order} />
                      <div className="flex gap-2">
                        <SubmitButton name="op" value="save" className="flex-1 py-2">Enregistrer</SubmitButton>
                        <SubmitButton name="op" value="delete" className="btn-outline py-2 text-terracotta-700" confirm="Supprimer définitivement ce fichier ?">Supprimer</SubmitButton>
                      </div>
                      <p className="break-all text-[0.7rem] text-ink-muted">Lien à partager : {m.file_url}</p>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
