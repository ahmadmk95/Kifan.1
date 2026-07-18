'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { api } from '@/lib/api';

const VIS_LABEL = { public: 'عام', private: 'خاص', both: 'كلاهما' };

export default function StatsView() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.stats().then(setData).catch(() => setErr(true));
  }, []);

  return (
    <div className="page">
      <SiteHeader variant="private" />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>زيارات الموقع</h1>
          <Link href="/admin" className="btn-ghost">← اللجان</Link>
        </div>

        {err ? (
          <div className="form-msg err">تعذّر تحميل الإحصائيات</div>
        ) : !data ? (
          <p style={{ color: 'var(--mawkab-muted)' }}>جارٍ التحميل…</p>
        ) : (
          <>
            <div className="stat-cards">
              <div className="stat-card">
                <div className="sc-value">{data.totals.visitors}</div>
                <div className="sc-label">زائر (إجمالي)</div>
              </div>
              <div className="stat-card">
                <div className="sc-value">{data.totals.views}</div>
                <div className="sc-label">مشاهدة (إجمالي)</div>
              </div>
              <div className="stat-card">
                <div className="sc-value">{data.last7.visitors}</div>
                <div className="sc-label">زائر — آخر ٧ أيام</div>
              </div>
              <div className="stat-card">
                <div className="sc-value">{data.home.visitors}</div>
                <div className="sc-label">زائر الصفحة الرئيسية</div>
              </div>
            </div>

            <h2 className="grid-title" style={{ textAlign: 'start', marginTop: 8 }}>الزيارات حسب اللجنة</h2>
            {data.committees.length === 0 ? (
              <p style={{ color: 'var(--mawkab-muted)' }}>لا توجد لجان بعد.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>اللجنة</th>
                    <th style={{ width: 100 }}>الظهور</th>
                    <th style={{ width: 110 }}>الزوار</th>
                    <th style={{ width: 110 }}>المشاهدات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.committees.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{VIS_LABEL[c.visibility]}</td>
                      <td>{c.visitors}</td>
                      <td>{c.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p className="stats-note">
              «الزائر» يُحتسب مرة واحدة لكل جهاز. لا تُحتسب زياراتك أنتِ كمشرفة حتى لا تتأثر الأرقام.
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
