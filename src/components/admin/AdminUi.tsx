'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Accueil Studio' },
  { href: '/admin/bookings', label: 'Réservations' },
  { href: '/admin/sessions', label: 'Calendrier' },
  { href: '/admin/experiences', label: 'Expériences' },
  { href: '/admin/communications', label: 'Annonces' },
  { href: '/admin/offers', label: 'Offres spéciales' },
  { href: '/admin/media', label: 'Affiches & photos' },
  { href: '/admin/settings', label: 'Site & coordonnées' },
  { href: '/admin/partners', label: 'Partenaires & messages' }
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1">
        {NAV.map((n) => {
          const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded-full px-4 py-2 text-sm font-medium transition',
                  active ? 'bg-forest-700 text-cream' : 'text-ink-soft hover:bg-forest-50 hover:text-forest-800'
                )}
              >
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SubmitButton({
  children,
  className,
  pendingLabel,
  confirm,
  name,
  value
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
  /** native confirmation dialog before submitting (destructive actions) */
  confirm?: string;
  /** optional name/value sent with the form (several submit buttons in one form) */
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={cn('btn-green', className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {pending ? pendingLabel ?? 'Enregistrement…' : children}
    </button>
  );
}
