import { redirect } from 'next/navigation';
import { getCurrentUser, canViewAdmin, landingFor } from '@/lib/auth';
import StatsView from './StatsView';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/stats');
  if (!canViewAdmin(user)) redirect(landingFor(user));
  return <StatsView />;
}
