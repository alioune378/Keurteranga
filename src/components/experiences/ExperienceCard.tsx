import { ArrowRight, Clock, Languages, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { Photo } from '@/components/ui/Photo';
import { coverOf } from '@/lib/data-utils';
import type { Experience } from '@/lib/types';
import { formatPrice, pick } from '@/lib/utils';

export function ExperienceCard({ experience, locale }: { experience: Experience; locale: Locale }) {
  const t = useTranslations('experiences');
  const tp = useTranslations('placeholder');
  const title = pick(experience.title, locale) ?? '';
  const cover = coverOf(experience);
  const href = { pathname: '/experiences/[slug]' as const, params: { slug: experience.slug } };

  return (
    <article className="card group relative flex h-full flex-col overflow-hidden transition duration-500 ease-elegant hover:-translate-y-1 hover:shadow-lift">
      <div className="overflow-hidden">
        <Photo
          src={cover?.src}
          alt={pick(cover?.alt, locale) ?? title}
          illustration={cover?.illustration}
          hint={title}
          tone="terracotta"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[4/3]"
          imgClassName="transition duration-700 ease-elegant group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col p-6 md:p-7">
        <h3 className="text-2xl">
          <Link href={href} className="hover:text-forest-600">
            {title}
          </Link>
        </h3>
        <p className="mt-3 flex-1 leading-relaxed text-ink-soft">{pick(experience.summary, locale)}</p>

        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
          <li className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-terracotta-500" aria-hidden="true" />
            {pick(experience.duration, locale)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Languages className="h-4 w-4 text-terracotta-500" aria-hidden="true" />
            {experience.languages.map((l) => l.toUpperCase()).join(' / ')}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-terracotta-500" aria-hidden="true" />
            {experience.max_participants
              ? t('participants', { min: experience.min_participants, max: experience.max_participants })
              : tp('groupTbc')}
          </li>
        </ul>

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-sand-200 pt-5">
          <p className="text-sm text-ink-muted">
            {experience.price_xof != null ? (
              <>
                {t('from')}
                <span className="block font-display text-2xl text-forest-800">
                  {formatPrice(experience.price_xof, locale)}
                </span>
                {t('perPerson')}
              </>
            ) : (
              <span className="font-medium text-ink-soft">{tp('priceTbc')}</span>
            )}
          </p>
          <div className="flex flex-col items-end gap-2">
            <Link href={{ pathname: '/reservation', query: { experience: experience.slug } }} className="btn-gold px-5 py-2.5">
              {t('book')}
            </Link>
            <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-forest-700 hover:gap-2 hover:text-forest-900">
              {t('discover')} <ArrowRight className="h-4 w-4 transition-all" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
