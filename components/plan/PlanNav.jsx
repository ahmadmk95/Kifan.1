'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export const PLAN_TABS = [
  { href: '/plan', label: 'الرئيسية' },
  { href: '/plan/master', label: 'الجدول الكامل' },
  { href: '/plan/tasks', label: 'الخطة' },
  { href: '/plan/internal', label: 'الجدول الداخلي' },
  { href: '/plan/external', label: 'الخارجي' },
  { href: '/plan/appetizers', label: 'المقبلات' },
  { href: '/plan/produce', label: 'الفواكه والخضروات' },
  { href: '/plan/supplies', label: 'المستلزمات والمشتريات' },
];
const EDITOR_TABS = [
  { href: '/plan/history', label: 'سجل التعديلات' },
  { href: '/plan/trash', label: 'المحذوفات' },
  { href: '/plan/backups', label: 'النسخ الاحتياطية' },
];

export default function PlanNav({ user }) {
  const path = usePathname() || '/plan';
  const tabs = user?.canEdit ? [...PLAN_TABS, ...EDITOR_TABS] : PLAN_TABS;
  const isActive = (href) => (href === '/plan' ? path === '/plan' : path.startsWith(href));
  return (
    <header className="pl-header">
      <div className="pl-topbar">
        <Link href="/plan" className="pl-brand">
          <span className="pl-brand-t1">خطة الأربعين 2027</span>
          <span className="pl-brand-t2">جدول التغذية والمشتريات</span>
        </Link>
        <div className="pl-user">
          {user ? (
            <>
              <span className="pl-user-name">{user.name}</span>
              <span className={'pl-mode ' + (user.canEdit ? 'edit' : 'view')}>{user.canEdit ? 'وضع التعديل' : 'عرض فقط'}</span>
              <Link href="/account/password" className="pl-toplink">كلمة المرور</Link>
              <LogoutButton />
            </>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(path)}`} className="pl-login">دخول للتعديل</Link>
          )}
        </div>
      </div>
      <nav className="pl-tabs" aria-label="أقسام الخطة">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={'pl-tab' + (isActive(t.href) ? ' active' : '') + (EDITOR_TABS.includes(t) ? ' tool' : '')}>
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
