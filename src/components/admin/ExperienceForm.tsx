import { SubmitButton } from '@/components/admin/AdminUi';
import type { Experience } from '@/lib/types';
import { saveExperience } from '@/app/admin/actions';

const stepsToText = (s?: Array<{ title: string; text: string }>) => (s ?? []).map((x) => (x.text ? `${x.title} | ${x.text}` : x.title)).join('\n');

function Bi({ name, label, e, kind = 'input', rows = 3, help }: {
  name: 'title' | 'summary' | 'description' | 'location' | 'duration';
  label: string;
  e?: Experience;
  kind?: 'input' | 'textarea';
  rows?: number;
  help?: string;
}) {
  const v = e?.[name] ?? {};
  return (
    <fieldset className="rounded-2xl border border-sand-200 p-4">
      <legend className="px-1 text-sm font-semibold text-forest-800">{label}</legend>
      {help && <p className="mb-2 text-xs text-ink-muted">{help}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {(['fr', 'en'] as const).map((l) => (
          <label key={l} className="text-xs font-semibold uppercase text-ink-muted">
            {l === 'fr' ? 'Français' : 'English'}
            {kind === 'input' ? (
              <input name={`${name}_${l}`} defaultValue={v[l] ?? ''} className="field-input mt-1 normal-case" />
            ) : (
              <textarea name={`${name}_${l}`} rows={rows} defaultValue={v[l] ?? ''} className="field-input mt-1 font-normal normal-case" />
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Bilingual experience editor (FR / EN side by side). */
export function ExperienceForm({ experience: e }: { experience?: Experience }) {
  return (
    <form action={saveExperience} className="space-y-5">
      {e && <input type="hidden" name="id" value={e.id} />}

      <section className="card grid gap-4 p-5 md:grid-cols-3">
        <label className="text-sm md:col-span-2">Adresse de la page (slug)
          <input name="slug" defaultValue={e?.slug ?? ''} required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="atelier-thieboudiene" className="field-input mt-1" />
          <span className="mt-1 block text-xs text-ink-muted">Ex. /fr/experiences/<strong>atelier-thieboudiene</strong> — minuscules, chiffres, tirets.</span>
        </label>
        <label className="text-sm">Statut
          <select name="status" defaultValue={e?.status ?? 'draft'} className="field-input mt-1">
            <option value="draft">Brouillon (non visible)</option>
            <option value="published">Publiée</option>
            <option value="archived">Archivée</option>
          </select>
        </label>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-xl">Contenu (français / anglais)</h2>
        <p className="text-sm text-ink-muted">Astuce : écrivez « [À compléter] » pour une information pas encore confirmée — elle s’affichera clairement comme provisoire sur le site.</p>
        <Bi name="title" label="Titre" e={e} />
        <Bi name="summary" label="Résumé (cartes et référencement)" e={e} kind="textarea" rows={3} />
        <Bi name="description" label="Description détaillée" e={e} kind="textarea" rows={7} />
        <Bi name="location" label="Lieu" e={e} />
        <Bi name="duration" label="Durée (texte affiché)" e={e} help="Ex. « 2h30 – 4h » / « 2.5 – 4 hours »" />
        <fieldset className="rounded-2xl border border-sand-200 p-4">
          <legend className="px-1 text-sm font-semibold text-forest-800">Ce qui est inclus — une ligne par élément</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <textarea name="included_fr" rows={5} defaultValue={(e?.included?.fr ?? []).join('\n')} className="field-input" aria-label="Inclus (français)" />
            <textarea name="included_en" rows={5} defaultValue={(e?.included?.en ?? []).join('\n')} className="field-input" aria-label="Included (English)" />
          </div>
        </fieldset>
        <fieldset className="rounded-2xl border border-sand-200 p-4">
          <legend className="px-1 text-sm font-semibold text-forest-800">Déroulé — une étape par ligne : « Titre | description »</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <textarea name="steps_fr" rows={8} defaultValue={stepsToText(e?.steps?.fr)} className="field-input" aria-label="Déroulé (français)" />
            <textarea name="steps_en" rows={8} defaultValue={stepsToText(e?.steps?.en)} className="field-input" aria-label="Programme (English)" />
          </div>
        </fieldset>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <h2 className="text-xl sm:col-span-2 lg:col-span-4">Prix, groupe & réservation</h2>
        <label className="text-sm">Prix par personne (FCFA)
          <input name="price" type="number" min={0} step={500} defaultValue={e?.price_xof ?? ''} placeholder="vide = à confirmer" className="field-input mt-1" />
        </label>
        <label className="text-sm">Participants minimum
          <input name="min" type="number" min={1} defaultValue={e?.min_participants ?? 1} className="field-input mt-1" />
        </label>
        <label className="text-sm">Participants maximum par réservation
          <input name="max" type="number" min={1} defaultValue={e?.max_participants ?? ''} placeholder="vide = capacité de la séance" className="field-input mt-1" />
        </label>
        <label className="text-sm">Clôture des réservations (heures avant)
          <input name="cutoff" type="number" min={0} max={720} defaultValue={e?.booking_cutoff_hours ?? 24} className="field-input mt-1" />
        </label>
        <fieldset className="text-sm">
          <legend>Langues de l’atelier</legend>
          <div className="mt-2 flex gap-4">
            {(['fr', 'en'] as const).map((l) => (
              <label key={l} className="flex items-center gap-2">
                <input type="checkbox" name="languages" value={l} defaultChecked={e ? e.languages.includes(l) : true} className="accent-forest-700" />
                {l === 'fr' ? 'Français' : 'Anglais'}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="featured" value="1" defaultChecked={e?.featured ?? false} className="accent-forest-700" /> Mise en avant sur l’accueil
        </label>
        <label className="text-sm">Ordre d’affichage
          <input name="sortOrder" type="number" defaultValue={e?.sort_order ?? 0} className="field-input mt-1" />
        </label>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-sand-200 bg-cream-200/95 px-4 py-3 backdrop-blur">
        <SubmitButton className="w-full sm:w-auto">{e ? 'Enregistrer l’expérience' : 'Créer l’expérience'}</SubmitButton>
      </div>
    </form>
  );
}
