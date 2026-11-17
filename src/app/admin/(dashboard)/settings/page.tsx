import { SubmitButton } from '@/components/admin/AdminUi';
import { Flash, PageTitle } from '@/components/admin/Flash';
import { BiField } from '@/components/admin/StudioFields';
import { site } from '@/config/site';
import { requireAdmin } from '@/lib/admin';
import type { SiteSettingsRow } from '@/lib/site-settings';
import { saveSettings } from '../../studio-actions';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from('site_settings').select('contact, content').eq('id', 1).maybeSingle();
  const row = (data ?? {}) as SiteSettingsRow;
  const c = row.contact ?? {};
  const k = row.content ?? {};

  return (
    <>
      <PageTitle title="Site & coordonnées" />
      <Flash ok={sp.ok} err={sp.err ?? error?.message} />
      <p className="mb-6 max-w-3xl text-sm text-ink-soft">
        Modifiez ici les informations de Kër Téranga. Un champ laissé vide garde le texte actuel du site (indiqué en gris).
        Les changements apparaissent sur le site et dans les e-mails dès que vous enregistrez.
      </p>

      <form action={saveSettings} className="max-w-4xl space-y-6">
        <section className="card space-y-4 p-5">
          <h2 className="text-xl">Coordonnées</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">E-mail<input name="email" type="email" defaultValue={c.email ?? ''} placeholder={site.email ?? ''} className="field-input mt-1" /></label>
            <label className="text-sm">Téléphone<input name="phone" defaultValue={c.phone ?? ''} placeholder={site.phoneDisplay ?? '+221 …'} className="field-input mt-1" /></label>
            <label className="text-sm">WhatsApp (avec indicatif)<input name="whatsapp" defaultValue={c.whatsapp ?? ''} placeholder={site.whatsapp ? `+${site.whatsapp}` : '+221 …'} className="field-input mt-1" /></label>
            <label className="text-sm">Adresse<input name="street" defaultValue={c.street ?? ''} placeholder={site.address.street ?? ''} className="field-input mt-1" /></label>
          </div>
          <h3 className="pt-2 text-base font-semibold">Réseaux sociaux (liens complets https://…)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Instagram<input name="instagram" defaultValue={c.instagram ?? ''} placeholder={site.social.instagram ?? 'https://instagram.com/…'} className="field-input mt-1" /></label>
            <label className="text-sm">Facebook<input name="facebook" defaultValue={c.facebook ?? ''} placeholder="https://facebook.com/…" className="field-input mt-1" /></label>
            <label className="text-sm">TikTok<input name="tiktok" defaultValue={c.tiktok ?? ''} placeholder="https://tiktok.com/@…" className="field-input mt-1" /></label>
            <label className="text-sm">LinkedIn<input name="linkedin" defaultValue={c.linkedin ?? ''} placeholder="https://linkedin.com/…" className="field-input mt-1" /></label>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-xl">Page d’accueil</h2>
          <BiField name="hero_title" label="Grand titre" value={k.hero_title} maxLength={140} help="Laisser vide pour garder le titre actuel." />
          <BiField name="hero_subtitle" label="Phrase d’introduction" value={k.hero_subtitle} kind="textarea" rows={2} maxLength={400} />
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-xl">À propos</h2>
          <label className="block text-sm">Nom de la fondatrice<input name="founder_name" defaultValue={k.founder_name ?? ''} maxLength={120} className="field-input mt-1" /></label>
          <BiField name="founder_bio" label="Biographie de la fondatrice" value={k.founder_bio} kind="textarea" rows={5} maxLength={3000} />
          <BiField name="history" label="Histoire de Kër Téranga" value={k.history} kind="textarea" rows={5} maxLength={3000} />
        </section>

        <div className="sticky bottom-0 -mx-5 border-t border-sand-200 bg-white/95 p-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
          <SubmitButton className="btn-lg w-full sm:w-auto" pendingLabel="Publication…">Enregistrer et publier</SubmitButton>
        </div>
      </form>
    </>
  );
}
