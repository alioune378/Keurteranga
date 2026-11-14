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

const tones = {
  green: 'from-forest-700 via-forest-600 to-forest-800 text-cream/80',
  sand: 'from-sand-200 via-sand-100 to-sand-300 text-wood-700',
  terracotta: 'from-terracotta-300 via-terracotta-500 to-terracotta-700 text-cream/85',
  gold: 'from-gold-200 via-gold-300 to-gold-500 text-forest-900/70'
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
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm">
            {t('illustration')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', tones[tone], className)} role="img" aria-label={alt}>
      <div className="pattern-weave absolute inset-0 opacity-60" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <ImageIcon className="h-7 w-7 opacity-70" aria-hidden="true" />
        <span className="max-w-[18rem] text-xs font-medium uppercase tracking-[0.18em] opacity-80">{hint ?? alt}</span>
      </div>
    </div>
  );
}
