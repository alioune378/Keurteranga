import Link from 'next/link';
import { ExperienceForm } from '@/components/admin/ExperienceForm';
import { Flash, PageTitle } from '@/components/admin/Flash';
import { requireAdmin } from '@/lib/admin';

export default async function NewExperience({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  return (
    <>
      <Link href="/admin/experiences" className="text-sm font-medium text-forest-700 hover:underline">← Expériences</Link>
      <PageTitle title="Nouvelle expérience" />
      <Flash ok={sp.ok} err={sp.err} />
      <ExperienceForm />
    </>
  );
}
