import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CommitteeGrid from '@/components/CommitteeGrid';
import SearchBox from '@/components/SearchBox';
import TrackView from '@/components/TrackView';
import { getCurrentUser } from '@/lib/auth';
import { listCommittees } from '@/lib/committees';

export const dynamic = 'force-dynamic';

export default async function PrivateHome() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/private');

  const committees = listCommittees({ includePrivate: true });
  return (
    <div className="page">
      <SiteHeader variant="private" />
      <section className="hero">
        <img src="/logo.png" alt="شعار موكب أمير المؤمنين (ع)" />
        <h1>دليل تعليمات الموكب</h1>
        <p>النسخة الخاصة — جميع اللجان</p>
      </section>
      <main className="main-wrap">
        <div className="search-wrap">
          <SearchBox basePath="/private/c" scope="private" />
        </div>
        <h2 className="grid-title">اللجان</h2>
        <CommitteeGrid committees={committees} basePath="/private/c" />
      </main>
      <SiteFooter />
      <TrackView />
    </div>
  );
}
