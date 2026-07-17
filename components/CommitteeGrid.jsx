import Link from 'next/link';
import { toAr } from '@/lib/slug';

export default function CommitteeGrid({ committees, basePath = '/c' }) {
  if (!committees.length) {
    return (
      <div className="empty-state">
        <img src="/logo.png" alt="الشعار" />
        <p>سيتم نشر اللجان قريبًا إن شاء الله</p>
      </div>
    );
  }
  return (
    <div className="committee-grid">
      {committees.map((c, i) => (
        <Link key={c.id} href={`${basePath}/${c.slug}`} className="committee-card">
          <span className="num">{toAr(i + 1)}</span>
          <span className="nm">{c.name}</span>
          {c.visibility === 'private' ? <span className="badge-private">خاص</span> : null}
        </Link>
      ))}
    </div>
  );
}
