import Link from 'next/link';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';

export const dynamic = 'force-dynamic';

// Public landing is closed: it shows only the site name. Authorized users tap
// it (or the buttons) to reach the login and their sections.
export default function HomePage() {
  return (
    <div className="splash">
      <Link href="/login" className="splash-name" aria-label="دخول">
        <span className="splash-title">{SITE_NAME}</span>
        <span className="splash-tag">{SITE_TAGLINE}</span>
      </Link>
      <div className="splash-actions">
        <Link href="/register" className="splash-btn primary">إنشاء حساب جديد</Link>
        <Link href="/login" className="splash-btn">دخول المخوّلين</Link>
      </div>
    </div>
  );
}
