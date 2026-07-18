import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin, canViewAdmin, landingFor } from '@/lib/auth';
import AdminList from './AdminList';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  if (!canViewAdmin(user)) redirect(landingFor(user));
  return <AdminList readOnly={!isAdmin(user)} />;
}
