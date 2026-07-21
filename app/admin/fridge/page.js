import { redirect } from 'next/navigation';
import { getCurrentUser, canFridge, canFridgeView, landingFor } from '@/lib/auth';
import FridgeView from './FridgeView';

export const dynamic = 'force-dynamic';

export default async function FridgePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/fridge');
  if (!canFridgeView(user)) redirect(landingFor(user));
  return <FridgeView readOnly={!canFridge(user)} />;
}
