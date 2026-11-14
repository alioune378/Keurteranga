import type { Metadata, Viewport } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import '../globals.css';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const sans = Manrope({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Administration · Kër Téranga',
  robots: { index: false, follow: false }
};

export const viewport: Viewport = { themeColor: '#0A5532', width: 'device-width', initialScale: 1 };

// The admin always reads live data
export const dynamic = 'force-dynamic';

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-cream-200">{children}</body>
    </html>
  );
}
