'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { api } from '@/lib/api';

const VIS_LABEL = { public: 'عام', private: 'خاص', both: 'كلاهما' };
const VIS_CLASS = { public: 'vis-public', private: 'vis-private', both: 'vis-both' };

export default function AdminList() {
  const [committees, setCommittees] = useState(null);

  const load = () => api.committees().then(({ committees }) => setCommittees(committees)).catch(() => setCommittees([]));
  useEffect(() => { load(); }, []);

  const remove = async (c) => {
    if (!window.confirm(`حذف لجنة «${c.name}»؟ لا يمكن التراجع.`)) return;
    await api.removeCommittee(c.id);
    load();
  };

  return (
    <div className="page">
      <SiteHeader variant="private" />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>إدارة اللجان</h1>
          <div className="admin-actions">
            <Link href="/admin/users" className="btn-ghost">المستخدمون</Link>
            <Link href="/admin/edit/new" className="btn-add">+ إضافة لجنة</Link>
          </div>
        </div>

        {committees === null ? null : committees.length === 0 ? (
          <div className="empty-state">
            <img src="/logo.png" alt="الشعار" />
            <p>لا توجد لجان بعد</p>
            <Link href="/admin/edit/new" className="btn-add">+ إضافة لجنة</Link>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>الترتيب</th>
                <th>اللجنة</th>
                <th style={{ width: 110 }}>الظهور</th>
                <th style={{ width: 180 }}></th>
              </tr>
            </thead>
            <tbody>
              {committees.map((c) => (
                <tr key={c.id}>
                  <td className="ar-num">{c.sort}</td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td><span className={'vis-pill ' + VIS_CLASS[c.visibility]}>{VIS_LABEL[c.visibility]}</span></td>
                  <td>
                    <div className="acts">
                      <Link href={`/admin/edit/${c.id}`} className="btn-small">تعديل</Link>
                      <button className="btn-danger" onClick={() => remove(c)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
