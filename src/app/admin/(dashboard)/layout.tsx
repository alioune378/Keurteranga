import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/AdminUi';
import { Logo } from '@/components/ui/Logo';
import { requireAdmin } from '@/lib/admin';
import { signOut } from '../actions';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireAdmin();

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 border-b border-sand-200 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" aria-label="Tableau de bord">
            <Logo className="scale-90 origin-left" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-ink-soft sm:inline">{profile?.full_name || user.email}</span>
            <a href="/fr" target="_blank" className="hidden rounded-full px-3 py-1.5 text-forest-700 hover:bg-forest-50 sm:inline">Voir le site ↗</a>
            <form action={signOut}>
              <button type="submit" className="rounded-full border border-sand-300 px-3 py-1.5 font-medium hover:bg-white">Déconnexion</button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-3">
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
