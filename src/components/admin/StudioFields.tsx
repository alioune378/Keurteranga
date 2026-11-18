'use client';

import { FileText, ImagePlus, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { Localized } from '@/lib/types';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX = 15 * 1024 * 1024;

/**
 * Uploads a flyer / photo straight from the phone to Supabase Storage
 * ("media" bucket — only signed-in administrators may write, enforced by the
 * database). The resulting URL is put into hidden inputs and saved with the form.
 */
export function MediaUpload({
  name = 'image',
  defaultUrl,
  defaultPath,
  folder,
  label = 'Image ou affiche (JPG, PNG, WebP ou PDF)',
  required = false
}: {
  name?: string;
  defaultUrl?: string | null;
  defaultPath?: string | null;
  folder: string;
  label?: string;
  required?: boolean;
}) {
  const [url, setUrl] = useState(defaultUrl ?? '');
  const [path, setPath] = useState(defaultPath ?? '');
  const [mime, setMime] = useState(defaultUrl?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : defaultUrl ? 'image/*' : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!ACCEPT.includes(file.type)) return setError('Format accepté : JPG, PNG, WebP ou PDF.');
    if (file.size > MAX) return setError('Fichier trop lourd (15 Mo maximum).');
    const supabase = getBrowserClient();
    if (!supabase) return setError('Stockage non configuré.');
    setBusy(true);
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1].replace('jpeg', 'jpg');
    const p = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error: e } = await supabase.storage.from('media').upload(p, file, { contentType: file.type, cacheControl: '31536000' });
    setBusy(false);
    if (e) return setError(`Échec de l’envoi : ${e.message}`);
    setUrl(supabase.storage.from('media').getPublicUrl(p).data.publicUrl);
    setPath(p);
    setMime(file.type);
  }

  const isPdf = mime === 'application/pdf';

  return (
    <div className="rounded-2xl border border-sand-200 p-4">
      <p className="text-sm font-semibold text-forest-800">{label}</p>
      <input type="hidden" name={`${name}_url`} value={url} />
      <input type="hidden" name={`${name}_path`} value={path} />
      <input type="hidden" name={`${name}_mime`} value={mime} />
      {url ? (
        <div className="mt-3 flex items-center gap-3">
          {isPdf ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex h-24 w-20 flex-col items-center justify-center rounded-xl bg-sand-100 text-forest-700">
              <FileText className="h-8 w-8" aria-hidden="true" /><span className="text-xs font-semibold">PDF</span>
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-24 w-24 rounded-xl object-cover" />
          )}
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => input.current?.click()} className="btn-outline px-4 py-2 text-sm">Remplacer</button>
            <button type="button" onClick={() => { setUrl(''); setPath(''); setMime(''); }} className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta-700">
              <X className="h-4 w-4" aria-hidden="true" /> Retirer
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="mt-3 flex min-h-[5.5rem] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-forest-300 text-forest-700 hover:bg-forest-50"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-6 w-6" aria-hidden="true" />}
          <span className="text-sm font-semibold">{busy ? 'Envoi en cours…' : 'Choisir un fichier (ou prendre une photo)'}</span>
        </button>
      )}
      {required && !url && <input tabIndex={-1} aria-hidden="true" required value="" onChange={() => undefined} className="sr-only" />}
      <input ref={input} type="file" accept={ACCEPT.join(',')} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {error && <p role="alert" className="mt-2 text-sm text-terracotta-700">{error}</p>}
    </div>
  );
}

/** French + English inputs side by side (stacked on the phone). */
export function BiField({
  name,
  label,
  value,
  kind = 'input',
  rows = 3,
  help,
  required = false,
  maxLength
}: {
  name: string;
  label: string;
  value?: Localized | null;
  kind?: 'input' | 'textarea';
  rows?: number;
  help?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <fieldset className="rounded-2xl border border-sand-200 p-4">
      <legend className="px-1 text-sm font-semibold text-forest-800">{label}</legend>
      {help && <p className="mb-2 text-xs text-ink-muted">{help}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {(['fr', 'en'] as const).map((l) => (
          <label key={l} className="text-xs font-semibold uppercase text-ink-muted">
            {l === 'fr' ? 'Français' : 'English'}
            {kind === 'input' ? (
              <input name={`${name}_${l}`} defaultValue={value?.[l] ?? ''} required={required && l === 'fr'} maxLength={maxLength} className="field-input mt-1 font-normal normal-case" />
            ) : (
              <textarea name={`${name}_${l}`} rows={rows} defaultValue={value?.[l] ?? ''} maxLength={maxLength} className="field-input mt-1 font-normal normal-case" />
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
