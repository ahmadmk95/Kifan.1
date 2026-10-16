import { redirect } from 'next/navigation';
import { getCurrentUser, canViewAdmin, isAdmin, landingFor } from '@/lib/auth';
import AdminList from './AdminList';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  if (!canViewAdmin(user)) redirect(landingFor(user));
  return <AdminList isAdmin={isAdmin(user)} />;
}
