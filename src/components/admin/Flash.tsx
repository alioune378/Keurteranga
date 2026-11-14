import { AlertCircle, CheckCircle2 } from 'lucide-react';

/** Success / error banner driven by ?ok= / ?err= query parameters. */
export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <div
      role={err ? 'alert' : 'status'}
      className={
        err
          ? 'mb-6 flex items-start gap-3 rounded-xl border border-terracotta-300 bg-terracotta-100 p-4 text-sm text-terracotta-700'
          : 'mb-6 flex items-start gap-3 rounded-xl border border-forest-200 bg-forest-50 p-4 text-sm text-forest-800'
      }
    >
      {err ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{err ?? ok}</span>
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-display-md">{title}</h1>
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    open: ['Ouverte', 'bg-forest-100 text-forest-800'],
    full: ['Complète', 'bg-gold-100 text-gold-600'],
    closed: ['Fermée', 'bg-sand-200 text-ink-soft'],
    confirmed: ['Confirmée', 'bg-forest-100 text-forest-800'],
    cancelled: ['Annulée', 'bg-terracotta-100 text-terracotta-700'],
    draft: ['Brouillon', 'bg-sand-200 text-ink-soft'],
    published: ['Publiée', 'bg-forest-100 text-forest-800'],
    archived: ['Archivée', 'bg-sand-200 text-ink-muted'],
    new: ['Nouvelle', 'bg-gold-100 text-gold-600'],
    in_progress: ['En cours', 'bg-forest-100 text-forest-800'],
    pending: ['En attente', 'bg-gold-100 text-gold-600'],
    sent: ['Envoyé', 'bg-forest-100 text-forest-800'],
    failed: ['Échec', 'bg-terracotta-100 text-terracotta-700']
  };
  const [label, cls] = map[status] ?? [status, 'bg-sand-200 text-ink-soft'];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}
