import type { ReactNode } from 'react';

// Root pass-through layout: the real <html> documents live in
// app/[locale]/layout.tsx (public site) and app/admin/layout.tsx (admin).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
