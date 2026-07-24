import { redirect } from 'next/navigation';
import { getCurrentUser, canFridge, canFridgeView, landingFor } from '@/lib/auth';
import FridgeView from '../fridge/FridgeView';

export const dynamic = 'force-dynamic';

export default async function DargeelPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/dargeel');
  if (!canFridgeView(user)) redirect(landingFor(user));
  return (
    <FridgeView
      readOnly={!canFridge(user)}
      store="dargeel"
      title="دار الجيل"
      branches={[]}
      basePath="/admin/dargeel"
    />
  );
}
