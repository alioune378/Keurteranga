import { Flash, PageTitle, StatusBadge } from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/admin';
import { setInquiryStatus, toggleMessageHandled } from '../../actions';

const TYPES: Record<string, string> = {
  hotel: 'Hôtel', agency: 'Agence de voyages', tour_operator: 'Tour-opérateur',
  corporate: 'Entreprise / groupe', association: 'Association / culture', other: 'Autre'
};

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: inquiries }, { data: messages }] = await Promise.all([
    supabase.from('partner_inquiries').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(200)
  ]);
  const when = (d: string) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar', dateStyle: 'medium', timeStyle: 'short' });

  return (
    <>
      <PageTitle title="Partenaires & messages" />
      <Flash ok={sp.ok} err={sp.err} />

      <section>
        <h2 className="mb-3 text-2xl">Demandes de partenariat</h2>
        {(inquiries ?? []).length === 0 && <p className="card p-6 text-ink-soft">Aucune demande pour le moment.</p>}
        <ul className="space-y-3">
          {(inquiries ?? []).map((p) => (
            <li key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl">{p.organization}</p>
                  <p className="text-sm text-ink-soft">{TYPES[p.org_type] ?? p.org_type} · {p.country || '—'} · {when(p.created_at)}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-3 text-sm">
                <strong>{p.contact_name}</strong> · <a className="text-forest-700 underline" href={`mailto:${p.email}`}>{p.email}</a>
                {p.phone && <> · {p.phone}</>}
                {p.group_size && <> · groupe : {p.group_size}</>}
              </p>
              {p.message && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-sand-100 p-3 text-sm">{p.message}</p>}
              <form action={setInquiryStatus} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="id" value={p.id} />
                <select name="status" defaultValue={p.status} className="field-input w-auto py-1.5">
                  <option value="new">Nouvelle</option>
                  <option value="in_progress">En cours</option>
                  <option value="closed">Clôturée</option>
                </select>
                <button className="btn-outline px-4 py-1.5">Mettre à jour</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-2xl">Messages du formulaire de contact</h2>
        {(messages ?? []).length === 0 && <p className="card p-6 text-ink-soft">Aucun message.</p>}
        <ul className="space-y-3">
          {(messages ?? []).map((m) => (
            <li key={m.id} className={`card p-5 ${m.handled ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{m.subject || '(sans objet)'} — {m.name}</p>
                <span className="text-xs text-ink-muted">{when(m.created_at)}</span>
              </div>
              <p className="text-sm"><a className="text-forest-700 underline" href={`mailto:${m.email}`}>{m.email}</a>{m.phone && <> · {m.phone}</>}</p>
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-sand-100 p-3 text-sm">{m.message}</p>
              <form action={toggleMessageHandled} className="mt-3">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="handled" value={m.handled ? '0' : '1'} />
                <button className="btn-outline px-4 py-1.5 text-sm">{m.handled ? 'Marquer non traité' : 'Marquer comme traité'}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
