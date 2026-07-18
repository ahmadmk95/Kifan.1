import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import ReportView from './ReportView';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/accounting/report');
  if (!isAdmin(user)) redirect('/private');
  return <ReportView />;
}
