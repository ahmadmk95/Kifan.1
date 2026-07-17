import Link from 'next/link';
import LogoutButton from './LogoutButton';

export default function SiteHeader({ variant = 'public' }) {
  const isPrivate = variant === 'private';
  return (
    <header className="site-header">
      <Link href={isPrivate ? '/private' : '/'} className="brand">
        <img src="/logo.png" alt="شعار موكب أمير المؤمنين (ع)" />
        <span>
          <span className="t1">موكب أمير المؤمنين (ع)</span>
          <span className={'t2' + (isPrivate ? ' private' : '')}>
            {isPrivate ? 'دليل تعليمات العمل — زيارة الأربعين 2026 · نسخة خاصة' : 'دليل تعليمات العمل — زيارة الأربعين 2026'}
          </span>
        </span>
      </Link>
      <nav>
        {isPrivate ? (
          <>
            <Link href="/private">اللجان</Link>
            <Link href="/admin">الإدارة</Link>
            <LogoutButton />
          </>
        ) : (
          <Link href="/login" className="btn-login">دخول المخوّلين</Link>
        )}
      </nav>
    </header>
  );
}
