'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from './LogoutButton';
import { api } from '@/lib/api';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';

// Header for logged-in areas — the same navy bar with tabs as خطة الأربعين.
// Tabs shown depend on the user's authority.
export default function SiteHeader() {
  const path = usePathname() || '';
  const [user, setUser] = useState(null);
  useEffect(() => { api.me().then(({ user }) => setUser(user)).catch(() => {}); }, []);

  const role = user?.role;
  const access = user?.access;
  const isAdmin = role === 'admin';
  const isViewer = !isAdmin && access === 'viewer';
  const canFridge = isAdmin || isViewer || access === 'fridge';
  const canAdminArea = isAdmin || isViewer;
  // Before /api/me answers, link home to the root rather than to /no-access.
  const home = !user ? '/' : canAdminArea ? '/admin' : canFridge ? '/admin/fridge' : user.plan_edit ? '/plan' : '/no-access';

  const tabs = [
    canAdminArea && { href: '/admin', label: 'الرئيسية', exact: true },
    canFridge && { href: '/admin/fridge', label: 'الثلاجة' },
    canFridge && { href: '/admin/dargeel', label: 'دار الجيل' },
    canFridge && { href: '/admin/orders', label: 'الطلبات' },
    canFridge && { href: '/admin/recipes', label: 'الطبخ' },
    user && { href: '/plan', label: 'خطة الأربعين' },
    canAdminArea && { href: '/admin/users', label: 'المستخدمون' },
  ].filter(Boolean);
  const isActive = (t) => (t.exact ? path === t.href : path === t.href || path.startsWith(t.href + '/'));

  return (
    <header className="pl-header">
      <div className="pl-topbar">
        <Link href={home} className="pl-brand">
          <span className="pl-brand-t1">{SITE_NAME}</span>
          <span className="pl-brand-t2">{SITE_TAGLINE}</span>
        </Link>
        <div className="pl-user">
          {user ? <span className="pl-user-name">{user.name}</span> : null}
          {user ? <Link href="/account/password" className="pl-toplink">كلمة المرور</Link> : null}
          <LogoutButton />
        </div>
      </div>
      {tabs.length ? (
        <nav className="pl-tabs" aria-label="أقسام الموقع">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className={'pl-tab' + (isActive(t) ? ' active' : '')}>{t.label}</Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
