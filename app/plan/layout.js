import { getCurrentUser, canViewPlan, canEditPlan, isAdmin, landingFor } from '@/lib/auth';
import { ensureDailyBackup } from '@/lib/plan/store';
import PlanShell from '@/components/plan/PlanShell';
import PlanNav from '@/components/plan/PlanNav';
import './plan.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'خطة الأربعين 2027 — مطبخ الخدمة',
  description: 'جدول تغذية الخدام وقوائم المشتريات — موسم الأربعين 2027',
};

// Signed-in users only: every user can view; editors can edit.
export default async function PlanLayout({ children }) {
  const user = await getCurrentUser();
  // Not signed in: render nothing of the plan — each page redirects to the
  // login with its own address, so the user comes back to the same page.
  if (!canViewPlan(user)) return children;
  ensureDailyBackup();
  const viewer = { name: user.name, canEdit: canEditPlan(user), isAdmin: isAdmin(user), home: landingFor(user) };
  return (
    <div className="pl-root">
      <PlanShell user={viewer}>
        <PlanNav user={viewer} />
        <main className="pl-main">{children}</main>
      </PlanShell>
    </div>
  );
}
