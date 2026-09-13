import { redirect } from 'next/navigation';
import { getCurrentUser, canFridge, canFridgeView, landingFor } from '@/lib/auth';
import RecipesView from './RecipesView';

export const dynamic = 'force-dynamic';

export default async function RecipesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/recipes');
  if (!canFridgeView(user)) redirect(landingFor(user));
  return <RecipesView readOnly={!canFridge(user)} />;
}
