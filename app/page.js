import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Public landing is closed: the site shows only the logo. Authorized users tap
// it (or the discreet link) to reach the login and the private area.
export default function HomePage() {
  return (
    <div className="splash">
      <Link href="/login" className="splash-logo" aria-label="دخول">
        <img src="/logo.png" alt="موكب أمير المؤمنين (ع)" />
      </Link>
      <Link href="/login" className="splash-enter">دخول المخوّلين</Link>
    </div>
  );
}
