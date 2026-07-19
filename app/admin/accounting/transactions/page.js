import { redirect } from 'next/navigation';
import { getCurrentUser, canAccounting, canAccountingView, landingFor } from '@/lib/auth';
import TransactionsView from './TransactionsView';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/accounting/transactions');
  if (!canAccountingView(user)) redirect(landingFor(user));
  return <TransactionsView readOnly={!canAccounting(user)} />;
}
