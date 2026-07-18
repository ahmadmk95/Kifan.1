import { redirect, notFound } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getTransaction, listCategories } from '@/lib/accounting';
import TxDetail from './TxDetail';

export const dynamic = 'force-dynamic';

export default async function TransactionPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/admin/accounting/tx/${params.id}`);
  if (!isAdmin(user)) redirect('/private');

  const tx = getTransaction(params.id);
  if (!tx) notFound();
  const categories = listCategories();

  return <TxDetail tx={tx} categories={categories} />;
}
