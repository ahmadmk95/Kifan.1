import { redirect } from 'next/navigation';
import { getCurrentUser, canAccounting, canAccountingView, landingFor } from '@/lib/auth';
import ReportView from './ReportView';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/accounting/report');
  if (!canAccountingView(user)) redirect(landingFor(user));
  return <ReportView />;
}
