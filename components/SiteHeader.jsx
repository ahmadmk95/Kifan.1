'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LogoutButton from './LogoutButton';
import { api } from '@/lib/api';

// Header for logged-in areas. Links shown depend on the user's authority.
export default function SiteHeader() {
  const [user, setUser] = useState(null);
  useEffect(() => { api.me().then(({ user }) => setUser(user)).catch(() => {}); }, []);

  const role = user?.role;
  const access = user?.access;
  const isAdmin = role === 'admin';
  const canCommittees = isAdmin || access === 'committees';
  const canAccounting = isAdmin || access === 'accounting';
  const home = isAdmin ? '/admin' : canAccounting ? '/admin/accounting' : canCommittees ? '/private' : '/login';

  return (
    <header className="site-header">
      <Link href={home} className="brand">
        <img src="/logo.png" alt="شعار موكب أمير المؤمنين (ع)" />
        <span>
          <span className="t1">موكب أمير المؤمنين (ع)</span>
          <span className="t2 private">دليل تعليمات العمل — زيارة الأربعين 2026 · نسخة خاصة</span>
        </span>
      </Link>
      <nav>
        {canCommittees ? <Link href="/private">اللجان</Link> : null}
        {canAccounting ? <Link href="/admin/accounting">المحاسبة</Link> : null}
        {isAdmin ? <Link href="/admin">الإدارة</Link> : null}
        <LogoutButton />
      </nav>
    </header>
  );
}
