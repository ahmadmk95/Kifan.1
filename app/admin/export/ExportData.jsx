'use client';

import { useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

// Download everything the site holds as one zip (database + photos).
export default function ExportData() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const download = async (e) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'تعذّر تجهيز الملف');
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'backup.zip';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setPassword('');
      setMsg({ t: 'ok', x: `تم تنزيل ${name} (${(blob.size / 1024 / 1024).toFixed(1)} ميغابايت). احفظه في مكان آمن — فيه كل بيانات الموقع.` });
    } catch (err) {
      setMsg({ t: 'err', x: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>تنزيل كل البيانات</h1>
          <Link href="/admin" className="btn-ghost">← الإدارة</Link>
        </div>
        <div className="editor-page" style={{ maxWidth: 640 }}>
          <p style={{ lineHeight: 1.9, marginBottom: 14 }}>
            ملف واحد (zip) فيه <b>قاعدة البيانات كاملة</b> — المستخدمون، الثلاجة، دار الجيل، الطلبات، الطبخ،
            وخطة الأربعين مع سجل التعديلات والنسخ الاحتياطية — و<b>كل الصور المرفوعة</b>.
            يصلح للاحتفاظ بنسخة عندك أو لنقل الموقع إلى استضافة أخرى.
          </p>
          <p style={{ color: 'var(--mawkab-muted)', fontSize: 14, marginBottom: 18 }}>
            الملف يحتوي على بيانات حساسة (منها كلمات المرور مشفّرة) — لا ترسله لأحد ولا ترفعه في مكان عام.
          </p>
          {msg ? <div className={'form-msg ' + msg.t} style={{ marginBottom: 14 }}>{msg.x}</div> : null}
          <form onSubmit={download} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="form-field" style={{ flex: '1 1 240px' }}>
              <span>أدخل كلمة المرور للتأكيد</span>
              <input type="password" autoComplete="current-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button className="btn-add" type="submit" disabled={busy || !password}>{busy ? 'جارٍ التجهيز…' : '⬇ تنزيل كل البيانات'}</button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
