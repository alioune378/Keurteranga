import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <section className="section">
      <div className="container max-w-xl text-center">
        <p className="font-display text-7xl text-gold-400">404</p>
        <h1 className="mt-4 text-display-md">{t('title')}</h1>
        <p className="mt-3 text-ink-soft">{t('text')}</p>
        <Link href="/" className="btn-green mt-8">{t('cta')}</Link>
      </div>
    </section>
  );
}
