import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import RichContent from '@/components/RichContent';
import Highlighter from '@/components/Highlighter';
import { getCurrentUser } from '@/lib/auth';
import { getCommitteeBySlug, listCommittees } from '@/lib/committees';

export const dynamic = 'force-dynamic';

function decodeSlug(raw) {
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export default async function PrivateCommitteePage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/private/c/${params.slug}`);

  const committee = getCommitteeBySlug(decodeSlug(params.slug), { includePrivate: true });
  if (!committee) notFound();

  const all = listCommittees({ includePrivate: true });
  const index = all.findIndex((c) => c.id === committee.id);

  return (
    <div className="page">
      <SiteHeader variant="private" />
      <main className="main-wrap">
        <Link href="/private" className="back-link">→ الفهرس / رجوع</Link>
        <div className="detail-head">
          {index >= 0 ? <span className="num">{index + 1}</span> : null}
          <h1>{committee.name}</h1>
          {committee.visibility === 'private' ? <span className="badge-private">خاص</span> : null}
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
      <Highlighter />
    </div>
  );
}
