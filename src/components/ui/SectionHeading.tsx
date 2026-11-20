import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';

export function SectionHeading({
  eyebrow,
  title,
  text,
  align = 'left',
  light = false,
  className
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  align?: 'left' | 'center';
  light?: boolean;
  className?: string;
}) {
  return (
    <Reveal className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && (
        <p className={cn('eyebrow', align === 'center' && 'justify-center', light && 'text-saffron-300')}>
          {eyebrow}
        </p>
      )}
      <h2 className={cn('mt-4 text-display-lg', light && 'text-cream')}>{title}</h2>
      {text && (
        <p className={cn('mt-5 text-lg leading-relaxed', light ? 'text-cream/80' : 'text-ink-soft')}>
          {text}
        </p>
      )}
    </Reveal>
  );
}
