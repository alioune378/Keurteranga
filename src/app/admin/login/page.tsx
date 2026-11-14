import { Logo } from '@/components/ui/Logo';
import { isSupabaseConfigured } from '@/lib/supabase/public';
import { LoginForm } from './LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-7">
          <h1 className="text-2xl">Espace administrateur</h1>
          {!isSupabaseConfigured() ? (
            <p className="mt-4 rounded-xl bg-terracotta-100 p-4 text-sm text-terracotta-700">
              Supabase n’est pas encore configuré (variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY).
              Voir le README, section « Configuration Supabase ».
            </p>
          ) : (
            <LoginForm forbidden={error === 'forbidden'} />
          )}
        </div>
      </div>
    </main>
  );
}
