import { redirect, notFound } from 'next/navigation';
import { getCurrentUser, canFridge, canFridgeView, landingFor } from '@/lib/auth';
import { getItem, listFridgeSuggestions, listFridgeUnits } from '@/lib/fridge';
import FridgeItemDetail from './FridgeItemDetail';

export const dynamic = 'force-dynamic';

export default async function FridgeItemPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/admin/fridge/${params.id}`);
  if (!canFridgeView(user)) redirect(landingFor(user));

  const item = getItem(params.id);
  if (!item) notFound();

  return (
    <FridgeItemDetail
      item={item}
      suggestions={listFridgeSuggestions()}
      units={listFridgeUnits()}
      readOnly={!canFridge(user)}
    />
  );
}
