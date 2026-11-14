import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/admin/AdminUi';
import { ExperienceForm } from '@/components/admin/ExperienceForm';
import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/admin';
import type { Experience } from '@/lib/types';
import { pick } from '@/lib/utils';
import { replaceImage, updateImage, uploadImages } from '../../../actions';

export default async function EditExperience({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('experiences')
    .select('*, experience_images ( id, src, storage_path, alt, is_cover, illustration, sort_order )')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const e = data as Experience;
  const images = [...(e.experience_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <Link href="/admin/experiences" className="text-sm font-medium text-forest-700 hover:underline">← Expériences</Link>
      <PageTitle title={pick(e.title, 'fr') ?? 'Expérience'}>
        <StatusBadge status={e.status} />
      </PageTitle>
      <Flash ok={sp.ok} err={sp.err} />

      <ExperienceForm experience={e} />

      {/* Photos */}
      <section id="photos" className="card mt-8 scroll-mt-32 p-5">
        <h2 className="text-xl">Photos</h2>
        <p className="mt-1 text-sm text-ink-soft">
          La photo « couverture » apparaît en premier. Les visuels marqués « Illustration » portent une étiquette sur le site :
          remplacez-les par de vraies photos des ateliers dès que possible.
        </p>

        <form action={uploadImages} className="mt-4 grid gap-3 rounded-2xl border border-dashed border-sand-300 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <input type="hidden" name="experienceId" value={e.id} />
          <label className="text-sm">Ajouter des photos (JPG, PNG, WebP · 8 Mo max)
            <input name="files" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple required className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-forest-700 file:px-4 file:py-2 file:text-cream" />
          </label>
          <label className="text-sm">Description FR (accessibilité)<input name="alt_fr" maxLength={200} className="field-input mt-1 py-2" /></label>
          <label className="text-sm">Description EN<input name="alt_en" maxLength={200} className="field-input mt-1 py-2" /></label>
          <SubmitButton pendingLabel="Envoi…" className="py-2.5">Envoyer</SubmitButton>
        </form>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
              <div className="relative aspect-[4/3] bg-sand-200">
                <Image src={img.src} alt={pick(img.alt, 'fr') ?? ''} fill sizes="400px" className="object-cover" />
                <div className="absolute left-2 top-2 flex gap-1">
                  {img.is_cover && <span className="rounded-full bg-gold-400 px-2 py-0.5 text-xs font-bold text-forest-900">Couverture</span>}
                  {img.illustration && <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">Illustration</span>}
                </div>
              </div>
              <div className="space-y-3 p-3 text-sm">
                <form action={updateImage} className="space-y-2">
                  <input type="hidden" name="id" value={img.id} />
                  <input type="hidden" name="experienceId" value={e.id} />
                  <input type="hidden" name="op" value="meta" />
                  <input name="alt_fr" defaultValue={img.alt?.fr ?? ''} placeholder="Description FR" className="field-input py-1.5 text-sm" aria-label="Description FR" />
                  <input name="alt_en" defaultValue={img.alt?.en ?? ''} placeholder="Description EN" className="field-input py-1.5 text-sm" aria-label="Description EN" />
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="illustration" value="1" defaultChecked={img.illustration} className="accent-forest-700" /> Illustration (pas une vraie photo)
                  </label>
                  <SubmitButton className="w-full py-1.5 text-xs">Enregistrer</SubmitButton>
                </form>
                <div className="flex flex-wrap gap-1">
                  {[
                    { op: 'up', label: '↑', show: i > 0, title: 'Monter' },
                    { op: 'down', label: '↓', show: i < images.length - 1, title: 'Descendre' },
                    { op: 'cover', label: 'Couverture', show: !img.is_cover, title: 'Définir comme couverture' }
                  ]
                    .filter((b) => b.show)
                    .map((b) => (
                      <form key={b.op} action={updateImage}>
                        <input type="hidden" name="id" value={img.id} />
                        <input type="hidden" name="experienceId" value={e.id} />
                        <input type="hidden" name="op" value={b.op} />
                        <button title={b.title} className="rounded-full border border-sand-300 px-3 py-1 text-xs font-semibold hover:bg-sand-100">{b.label}</button>
                      </form>
                    ))}
                  <form action={updateImage}>
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="experienceId" value={e.id} />
                    <input type="hidden" name="op" value="delete" />
                    <SubmitButton className="bg-transparent px-3 py-1 text-xs text-terracotta-700 hover:bg-terracotta-100 hover:shadow-none" confirm="Supprimer cette photo ?">Supprimer</SubmitButton>
                  </form>
                </div>
                <form action={replaceImage} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={img.id} />
                  <input type="hidden" name="experienceId" value={e.id} />
                  <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="w-full text-xs" aria-label="Nouvelle photo" />
                  <SubmitButton className="btn-outline shrink-0 px-3 py-1 text-xs" pendingLabel="…">Remplacer</SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
