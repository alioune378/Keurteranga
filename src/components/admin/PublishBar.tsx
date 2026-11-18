import type { ReactNode } from 'react';
import { SubmitButton } from './AdminUi';

/**
 * Big, phone-friendly action bar at the bottom of every content form:
 * save as draft → check the preview → publish (or take offline).
 */
export function PublishBar({ published, isNew, extra }: { published: boolean; isNew: boolean; extra?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-2 grid gap-2 border-t border-sand-200 bg-white/95 p-4 backdrop-blur sm:mx-0 sm:flex sm:flex-wrap sm:rounded-2xl sm:border">
      <SubmitButton name="intent" value="draft" className="btn-outline btn-lg" pendingLabel="Enregistrement…">
        {isNew ? 'Enregistrer le brouillon et voir l’aperçu' : published ? 'Enregistrer les modifications' : 'Enregistrer le brouillon'}
      </SubmitButton>
      {published ? (
        <SubmitButton name="intent" value="unpublish" className="btn-outline btn-lg" pendingLabel="…" confirm="Retirer cet élément du site ?">
          Retirer du site
        </SubmitButton>
      ) : (
        <SubmitButton name="intent" value="publish" className="btn-gold btn-lg" pendingLabel="Publication…">
          Publier sur le site
        </SubmitButton>
      )}
      {extra}
    </div>
  );
}
