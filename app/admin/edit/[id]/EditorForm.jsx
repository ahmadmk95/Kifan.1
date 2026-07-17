'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { api } from '@/lib/api';

// CKEditor touches DOM globals at module load — never import it on the server.
const Editor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
  loading: () => <div className="editor-shell" style={{ minHeight: 420 }} />,
});

export default function EditorForm({ committee }) {
  const router = useRouter();
  const isNew = !committee;
  const [name, setName] = useState(committee?.name || '');
  const [sort, setSort] = useState(committee?.sort ?? '');
  const [visibility, setVisibility] = useState(committee?.visibility || 'public');
  const [content, setContent] = useState(committee?.content_html || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async () => {
    if (busy) return;
    if (!name.trim()) { setMsg({ t: 'err', x: 'اسم اللجنة مطلوب' }); return; }
    setBusy(true);
    setMsg(null);
    const payload = { name: name.trim(), visibility, content_html: content };
    if (sort !== '') payload.sort = Number(sort);
    try {
      if (isNew) await api.addCommittee(payload);
      else await api.updateCommittee(committee.id, payload);
      router.push('/admin');
      router.refresh();
    } catch (e) {
      setMsg({ t: 'err', x: e.message });
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <SiteHeader variant="private" />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>{isNew ? 'إضافة لجنة' : 'تعديل اللجنة'}</h1>
          <Link href="/admin" className="btn-ghost">← رجوع للقائمة</Link>
        </div>

        {msg ? <div className={'form-msg ' + msg.t}>{msg.x}</div> : null}

        <div className="editor-page">
          <div className="form-field">
            <label>اسم اللجنة</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: اللجنة الدينية" />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>الترتيب</label>
              <input type="number" value={sort} onChange={(e) => setSort(e.target.value)} placeholder="1" dir="ltr" />
            </div>
            <div className="form-field">
              <label>الظهور</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="public">عام — يظهر للجميع</option>
                <option value="private">خاص — للمخوّلين فقط</option>
                <option value="both">كلاهما — عام وخاص</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label>المحتوى (يمكن اللصق مباشرة من Word)</label>
            <Editor value={content} onChange={setContent} />
          </div>
          <div className="admin-actions">
            <button className="btn-add" onClick={save} disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
            <Link href="/admin" className="btn-ghost">إلغاء</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
