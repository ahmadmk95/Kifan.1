import { redirect } from 'next/navigation';
import { getCurrentUser, canFridge, canFridgeView, canPrepareOrders, landingFor } from '@/lib/auth';
import OrdersView from './OrdersView';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/orders');
  if (!canFridgeView(user)) redirect(landingFor(user));
  return <OrdersView readOnly={!canFridge(user)} canPrepare={canPrepareOrders(user)} />;
}
