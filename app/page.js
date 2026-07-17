import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CommitteeGrid from '@/components/CommitteeGrid';
import SearchBox from '@/components/SearchBox';
import { listCommittees } from '@/lib/committees';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const committees = listCommittees({ includePrivate: false });
  return (
    <div className="page">
      <SiteHeader variant="public" />
      <section className="hero">
        <img src="/logo.png" alt="شعار موكب أمير المؤمنين (ع)" />
        <h1>دليل تعليمات الموكب</h1>
        <p>موكب أمير المؤمنين (ع) — زيارة الأربعين 2026</p>
      </section>
      <main className="main-wrap">
        <div className="search-wrap">
          <SearchBox basePath="/c" scope="public" />
        </div>
        <h2 className="grid-title">اللجان</h2>
        <CommitteeGrid committees={committees} basePath="/c" />
      </main>
      <SiteFooter />
    </div>
  );
}
