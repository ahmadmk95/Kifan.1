import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import ChangePassword from './ChangePassword';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account/password');
  return <ChangePassword name={user.name} />;
}
