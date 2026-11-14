'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';

export function LoginForm({ forbidden }: { forbidden?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    forbidden ? { kind: 'err', text: "Ce compte n'a pas les droits administrateur." } : null
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase) return;
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setMessage({ kind: 'err', text: 'E-mail ou mot de passe incorrect.' });
      return;
    }
    router.replace('/admin');
    router.refresh();
  }

  async function sendMagicLink() {
    const supabase = getBrowserClient();
    if (!supabase || !email) {
      setMessage({ kind: 'err', text: 'Saisissez votre e-mail.' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin/auth/callback` }
    });
    setLoading(false);
    setMessage(
      error
        ? { kind: 'err', text: "Impossible d'envoyer le lien. Vérifiez l'adresse." }
        : { kind: 'ok', text: 'Un lien de connexion vous a été envoyé par e-mail.' }
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      <div>
        <label htmlFor="email" className="field-label">E-mail</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Mot de passe</label>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
      </div>
      {message && (
        <p role="alert" className={message.kind === 'err' ? 'rounded-xl bg-terracotta-100 p-3 text-sm text-terracotta-700' : 'rounded-xl bg-forest-50 p-3 text-sm text-forest-800'}>
          {message.text}
        </p>
      )}
      <button type="submit" className="btn-green w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Se connecter
      </button>
      <button type="button" onClick={sendMagicLink} className="w-full text-center text-sm font-medium text-forest-700 hover:underline" disabled={loading}>
        Recevoir un lien de connexion par e-mail
      </button>
    </form>
  );
}
