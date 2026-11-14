import { cn } from '@/lib/utils';

/** True for content that is a placeholder awaiting verified information. */
export function isTbc(text: string | null | undefined) {
  return !text || /\[(À compléter|To be completed)/i.test(text) || /^\[.*\]$/.test(text.trim());
}

/**
 * Renders text; placeholder content ("[À compléter …]") gets a dashed,
 * clearly identifiable style so it is never mistaken for real information.
 */
export function Tbc({ text, fallback, className }: { text?: string | null; fallback?: string; className?: string }) {
  const value = text || fallback || '';
  if (isTbc(value)) {
    return (
      <span
        className={cn(
          'rounded-md border border-dashed border-terracotta-300 bg-terracotta-100/50 px-1.5 py-0.5 text-[0.92em] italic text-terracotta-700',
          className
        )}
      >
        {value}
      </span>
    );
  }
  return <span className={className}>{value}</span>;
}
