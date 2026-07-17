import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import RichContent from '@/components/RichContent';
import { getCommitteeBySlug, listCommittees } from '@/lib/committees';
import { toAr } from '@/lib/slug';

export const dynamic = 'force-dynamic';

function decodeSlug(raw) {
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export default function CommitteePage({ params }) {
  const committee = getCommitteeBySlug(decodeSlug(params.slug), { includePrivate: false });
  if (!committee) notFound();

  const all = listCommittees({ includePrivate: false });
  const index = all.findIndex((c) => c.id === committee.id);

  return (
    <div className="page">
      <SiteHeader variant="public" />
      <main className="main-wrap">
        <Link href="/" className="back-link">→ الفهرس / رجوع</Link>
        <div className="detail-head">
          {index >= 0 ? <span className="num">{toAr(index + 1)}</span> : null}
          <h1>{committee.name}</h1>
        </div>
        <div className="content-card">
          {committee.content_html ? (
            <RichContent html={committee.content_html} />
          ) : (
            <p style={{ color: 'var(--mawkab-muted)' }}>لا يوجد محتوى منشور لهذه اللجنة بعد.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
