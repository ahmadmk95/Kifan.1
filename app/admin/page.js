import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { getCurrentUser, canViewAdmin, landingFor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SECTIONS = [
  { href: '/admin/fridge', name: 'الثلاجة' },
  { href: '/admin/dargeel', name: 'دار الجيل' },
  { href: '/admin/orders', name: 'الطلبات' },
  { href: '/admin/recipes', name: 'الطبخ' },
  { href: '/admin/users', name: 'المستخدمون' },
];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  if (!canViewAdmin(user)) redirect(landingFor(user));
  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <h1 className="grid-title">الإدارة</h1>
        <div className="committee-grid">
          {SECTIONS.map((s, i) => (
            <Link key={s.href} href={s.href} className="committee-card">
              <span className="num">{i + 1}</span>
              <span className="nm">{s.name}</span>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
