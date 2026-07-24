import { redirect, notFound } from 'next/navigation';
import { getCurrentUser, canFridge, canFridgeView, landingFor } from '@/lib/auth';
import { getItem, listFridgeSuggestions, listFridgeUnits } from '@/lib/fridge';
import FridgeItemDetail from '../../fridge/[id]/FridgeItemDetail';

export const dynamic = 'force-dynamic';

export default async function DargeelItemPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/admin/dargeel/${params.id}`);
  if (!canFridgeView(user)) redirect(landingFor(user));

  const item = getItem(params.id);
  if (!item) notFound();

  return (
    <FridgeItemDetail
      item={item}
      suggestions={listFridgeSuggestions('dargeel')}
      units={listFridgeUnits('dargeel')}
      readOnly={!canFridge(user)}
      basePath="/admin/dargeel"
      title="دار الجيل"
      showBranch={false}
    />
  );
}
