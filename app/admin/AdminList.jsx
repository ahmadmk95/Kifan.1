'use client';

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

// Admin landing: a hub of the sections that remain on the site.
const SECTIONS = [
  { href: '/admin/fridge', icon: '🧊', title: 'الثلاجة', desc: 'مخزون الثلاجة والفريزر والخارجي' },
  { href: '/admin/dargeel', icon: '📦', title: 'دار الجيل', desc: 'مخزون دار الجيل' },
  { href: '/admin/orders', icon: '📋', title: 'الطلبات', desc: 'طلبات الأصناف وتجهيزها' },
  { href: '/admin/recipes', icon: '🍲', title: 'معادلات ووصفات الطبخ', desc: 'حساب المقادير حسب الثابت' },
  { href: '/plan', icon: '🗓️', title: 'خطة الأربعين 2027', desc: 'جدول التغذية والمشتريات والنسخ الاحتياطية' },
  { href: '/account/password', icon: '🔑', title: 'تغيير كلمة المرور', desc: 'كلمة مرور حسابك' },
  { href: '/admin/users', icon: '👥', title: 'المستخدمون', desc: 'الحسابات والصلاحيات والموافقات' },
];

export default function AdminList() {
  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>الإدارة</h1>
        </div>
        <div className="hub-grid">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="hub-card">
              <span className="hub-ico">{s.icon}</span>
              <span className="hub-title">{s.title}</span>
              <span className="hub-desc">{s.desc}</span>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
