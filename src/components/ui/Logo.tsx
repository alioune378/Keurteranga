import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Official Kër Téranga logo (house, baobab, star, Senegal flag band).
 * `light` = cream version for dark green backgrounds.
 * Files: public/images/logo/ (generated from the client's logo PNG).
 */
export function Logo({
  className,
  light = false,
  priority = false
}: {
  className?: string;
  light?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={light ? '/images/logo/logo-ker-teranga-light.png' : '/images/logo/logo-ker-teranga.png'}
      alt="Kër Téranga"
      width={800}
      height={571}
      priority={priority}
      sizes="160px"
      className={cn('w-auto', className ?? 'h-14 md:h-16')}
    />
  );
}
