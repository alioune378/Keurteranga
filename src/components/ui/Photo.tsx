import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface PhotoProps {
  src?: string | null;
  alt: string;
  /** Shown on the placeholder when there is no photo yet */
  hint?: string;
  /** Temporary AI-generated illustration → shows a discreet "Illustration" label */
  illustration?: boolean;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  tone?: 'green' | 'sand' | 'terracotta' | 'gold';
}

// Placeholder surfaces (no patterns) — clearly read as "photo to come"
const tones = {
  green: 'bg-kola-800 text-white/75 border-white/25',
  sand: 'bg-sand-100 text-ink-muted border-sand-300',
  terracotta: 'bg-terracotta-100 text-terracotta-700 border-terracotta-300',
  gold: 'bg-saffron-100 text-saffron-600 border-saffron-300'
};

/**
 * Responsive image (next/image) with:
 *  - an "Illustration" label for temporary AI visuals (never passed off as real),
 *  - an elegant placeholder describing the photo needed when `src` is empty.
 */
export function Photo({
  src,
  alt,
  hint,
  illustration,
  className,
  imgClassName,
  sizes = '100vw',
  priority,
  tone = 'sand'
}: PhotoProps) {
  const t = useTranslations('placeholder');

  if (src) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn('object-cover', imgClassName)}
        />
        {illustration && (
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-sm bg-black/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/90">
            {t('illustration')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', tones[tone], className)} role="img" aria-label={alt}>
      <div className="absolute inset-3 border border-dashed border-inherit" aria-hidden="true" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
        <ImageIcon className="h-7 w-7 opacity-70" aria-hidden="true" />
        <span className="max-w-[18rem] text-xs font-medium uppercase tracking-[0.18em] opacity-80">{hint ?? alt}</span>
      </div>
    </div>
  );
}
