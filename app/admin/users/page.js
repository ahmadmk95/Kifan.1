import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin, landingFor } from '@/lib/auth';
import UsersAdmin from './UsersAdmin';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/users');
  if (!isAdmin(user)) redirect(landingFor(user));
  return <UsersAdmin currentUserId={user.id} />;
}
