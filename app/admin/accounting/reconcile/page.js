import { redirect } from 'next/navigation';
import { getCurrentUser, canAccounting, canAccountingView, landingFor } from '@/lib/auth';
import ReconcileView from './ReconcileView';

export const dynamic = 'force-dynamic';

export default async function ReconcilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/accounting/reconcile');
  if (!canAccountingView(user)) redirect(landingFor(user));
  return <ReconcileView readOnly={!canAccounting(user)} />;
}
