import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, canViewAdmin, canFridge, canEditPlan, landingFor } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';
import { SITE_NAME } from '@/lib/brand';

export const dynamic = 'force-dynamic';

// Where a signed-in user lands when none of the remaining sections applies to
// them — e.g. accounts that belonged to the removed اللجان / المحاسبة sections.
// It must never redirect back to /login: with auto sign-in enabled that would
// log them straight in again and loop.
export default async function NoAccessPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Has a section after all → send them to it (landingFor never returns here
  // for such users, so this cannot loop).
  if (canViewAdmin(user) || canFridge(user) || canEditPlan(user)) redirect(landingFor(user));

  return (
    <div className="splash">
      <div className="splash-title">{SITE_NAME}</div>
      <div className="no-access-card">
        <h1>لا توجد أقسام متاحة لحسابك</h1>
        <p>
          مرحباً {user.name}. الأقسام المرتبطة بحسابك لم تعد متوفّرة في الموقع.
          تواصل مع الإدارة ليتم تحديد صلاحية جديدة لحسابك.
        </p>
        <p><Link href="/plan">عرض خطة التغذية والمشتريات ←</Link></p>
        <LogoutButton />
      </div>
    </div>
  );
}
