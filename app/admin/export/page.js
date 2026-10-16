import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin, landingFor } from '@/lib/auth';
import ExportData from './ExportData';

export const dynamic = 'force-dynamic';

export default async function ExportPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/export');
  if (!isAdmin(user)) redirect(landingFor(user));
  return <ExportData />;
}
