'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LogoutButton from './LogoutButton';
import { api } from '@/lib/api';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';

// Header for logged-in areas. Links shown depend on the user's authority.
export default function SiteHeader() {
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

  return (
    <header className="site-header">
      <Link href={home} className="brand">
        <span>
          <span className="t1">{SITE_NAME}</span>
          <span className="t2 private">{SITE_TAGLINE}</span>
        </span>
      </Link>
      <nav>
        {canFridge ? <Link href="/admin/fridge">الثلاجة</Link> : null}
        {canFridge ? <Link href="/admin/dargeel">دار الجيل</Link> : null}
        {canFridge ? <Link href="/admin/orders">الطلبات</Link> : null}
        {canFridge ? <Link href="/admin/recipes">الطبخ</Link> : null}
        {user ? <Link href="/plan">خطة الأربعين</Link> : null}
        {canAdminArea ? <Link href="/admin">الإدارة</Link> : null}
        <LogoutButton />
      </nav>
    </header>
  );
}
