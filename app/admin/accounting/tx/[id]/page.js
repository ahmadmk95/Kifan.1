import { redirect, notFound } from 'next/navigation';
import { getCurrentUser, canAccounting, canAccountingView, landingFor } from '@/lib/auth';
import { getTransaction, listCategories, listSuggestions } from '@/lib/accounting';
import TxDetail from './TxDetail';

export const dynamic = 'force-dynamic';

export default async function TransactionPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/admin/accounting/tx/${params.id}`);
  if (!canAccountingView(user)) redirect(landingFor(user));

  const tx = getTransaction(params.id);
  if (!tx) notFound();
  const categories = listCategories();
  const suggestions = listSuggestions();

  return <TxDetail tx={tx} categories={categories} suggestions={suggestions} readOnly={!canAccounting(user)} />;
}
