import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import AccountingView from './AccountingView';

export const dynamic = 'force-dynamic';

export default async function AccountingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/accounting');
  if (!isAdmin(user)) redirect('/private');
  return <AccountingView />;
}
