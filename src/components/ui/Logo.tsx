import { cn } from '@/lib/utils';

/**
 * Text logo with a small "bowl" mark. Replace with the official logo file
 * (e.g. <Image src="/images/logo.svg" …/>) once available.
 */
export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 40" aria-hidden="true" className="h-9 w-9 shrink-0">
        <circle cx="20" cy="20" r="19" className={light ? 'fill-cream/10' : 'fill-forest-700'} />
        <path
          d="M9 19h22a11 11 0 0 1-22 0Z"
          className={light ? 'fill-gold-300' : 'fill-gold-400'}
        />
        <path d="M14 15c1.5-2 1.5-3.5 0-5.5M20 15c1.5-2 1.5-3.5 0-5.5M26 15c1.5-2 1.5-3.5 0-5.5" fill="none" strokeWidth="1.6" strokeLinecap="round" className="stroke-cream" />
      </svg>
      <span className="leading-none">
        <span className={cn('block font-display text-[1.35rem] tracking-tight', light ? 'text-cream' : 'text-forest-800')}>
          Kër Téranga
        </span>
        <span className={cn('mt-1 block text-[0.62rem] font-semibold uppercase tracking-[0.28em]', light ? 'text-gold-300' : 'text-terracotta-500')}>
          Dakar · Sénégal
        </span>
      </span>
    </span>
  );
}
