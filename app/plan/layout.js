import { Tajawal } from 'next/font/google';
import { getCurrentUser, canEditPlan, isAdmin } from '@/lib/auth';
import { ensureDailyBackup } from '@/lib/plan/store';
import PlanShell from '@/components/plan/PlanShell';
import PlanNav from '@/components/plan/PlanNav';
import './plan.css';

const tajawal = Tajawal({ subsets: ['arabic'], weight: ['400', '500', '700', '800'], display: 'swap' });

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'خطة الأربعين 2027 — مطبخ الخدمة',
  description: 'جدول تغذية الخدام وقوائم المشتريات — موسم الأربعين 2027',
};

// Public section: anyone can view; signed-in editors can edit.
export default async function PlanLayout({ children }) {
  const user = await getCurrentUser();
  ensureDailyBackup();
  const viewer = user && user.status !== 'pending'
    ? { name: user.name, canEdit: canEditPlan(user), isAdmin: isAdmin(user) }
    : null;
  return (
    <div className={'pl-root ' + tajawal.className}>
      <PlanShell user={viewer}>
        <PlanNav user={viewer} />
        <main className="pl-main">{children}</main>
      </PlanShell>
    </div>
  );
}
